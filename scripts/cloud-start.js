/**
 * Cloud entrypoint for 微信云托管.
 * Always keeps :80 open (placeholder → reverse-proxy to Nest on :8080)
 * so probes / callContainer never see nginx 502 from a dead listener.
 */
const { spawn, spawnSync } = require('child_process');
const http = require('http');
const net = require('net');
const path = require('path');
const { URL } = require('url');

const PUBLIC_PORT = Number(process.env.PORT || 80);
const NEST_PORT = Number(process.env.NEST_PORT || 8080);

let bootPhase = 'starting';
let lastError = '';
let upstreamReady = false;

function log(...args) {
  console.log('[cloud-start]', ...args);
}

function sleepSync(ms) {
  const sec = Math.max(1, Math.ceil(ms / 1000));
  spawnSync('sleep', [String(sec)], { stdio: 'ignore' });
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const address = process.env.MYSQL_ADDRESS;
  if (!address) return null;
  const user = encodeURIComponent(process.env.MYSQL_USERNAME || 'root');
  const pass = encodeURIComponent(process.env.MYSQL_PASSWORD || '');
  const db = process.env.MYSQL_DATABASE || 'recipe_assistant';
  const url = `mysql://${user}:${pass}@${address}/${db}?connect_timeout=10`;
  log(`DATABASE_URL built from MYSQL_* host=${address} db=${db}`);
  return url;
}

function withDbName(databaseUrl, dbName) {
  const u = new URL(databaseUrl);
  u.pathname = `/${dbName}`;
  return u.toString();
}

function parseHostPort(databaseUrl) {
  const u = new URL(databaseUrl);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    db: (u.pathname || '/').replace(/^\//, '').split('?')[0] || 'recipe_assistant',
  };
}

function tcpCheck(host, port, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      reject(new Error(`TCP timeout ${host}:${port} after ${timeoutMs}ms`));
    });
    socket.on('error', (err) => {
      reject(new Error(`TCP ${host}:${port} — ${err.message}`));
    });
  });
}

function waitForPort(host, port, attempts = 60) {
  for (let i = 1; i <= attempts; i++) {
    const r = spawnSync(
      process.execPath,
      [
        '-e',
        `
const net=require('net');
const s=net.connect({host:'${host}',port:${port}},()=>{s.end();process.exit(0)});
s.on('error',()=>process.exit(1));
setTimeout(()=>process.exit(1),800);
`,
      ],
      { stdio: 'ignore' },
    );
    if (r.status === 0) return true;
    spawnSync('sleep', ['1'], { stdio: 'ignore' });
  }
  return false;
}

function ensureDatabase(databaseUrl, dbName) {
  const adminUrl = withDbName(databaseUrl, 'mysql');
  log(`ensure database \`${dbName}\` exists...`);
  const sql = `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;
  const r = spawnSync(
    'npx',
    ['prisma', 'db', 'execute', '--stdin', '--url', adminUrl],
    {
      input: sql,
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: adminUrl },
    },
  );
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    log('CREATE DATABASE skipped/failed (may already exist or lack privilege)');
    return false;
  }
  log('CREATE DATABASE OK');
  return true;
}

function migrateWithRetries(databaseUrl, maxAttempts) {
  for (let i = 1; i <= maxAttempts; i++) {
    log(`prisma migrate deploy (attempt ${i}/${maxAttempts})...`);
    const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
      timeout: 60000,
    });
    if (r.error && r.error.code === 'ETIMEDOUT') log('migrate timed out after 60s');
    if (r.status === 0) {
      log('migrate deploy OK');
      return true;
    }
    log(`migrate failed (status=${r.status}), retry in 3s...`);
    sleepSync(3000);
  }
  return false;
}

function startGateway() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!upstreamReady) {
        const body = JSON.stringify({
          code: 1,
          message: lastError ? 'boot_failed' : 'booting',
          data: {
            phase: bootPhase,
            error: lastError || null,
            hint: '查看云托管实例日志中的 [cloud-start]',
          },
        });
        res.writeHead(lastError ? 503 : 200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
        });
        res.end(body);
        return;
      }

      const headers = { ...req.headers, host: `127.0.0.1:${NEST_PORT}` };
      const proxyReq = http.request(
        {
          hostname: '127.0.0.1',
          port: NEST_PORT,
          path: req.url,
          method: req.method,
          headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res);
        },
      );
      proxyReq.on('error', (err) => {
        const body = JSON.stringify({
          code: 1,
          message: 'upstream_error',
          data: { error: err.message },
        });
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(body);
      });
      req.pipe(proxyReq);
    });

    server.on('error', reject);
    server.listen(PUBLIC_PORT, '0.0.0.0', () => {
      log(`gateway listening on 0.0.0.0:${PUBLIC_PORT} → nest :${NEST_PORT}`);
      resolve(server);
    });
  });
}

function resolveMainJs() {
  const candidates = [
    path.join(__dirname, '..', 'dist', 'main.js'),
    path.join(__dirname, '..', 'dist', 'src', 'main.js'),
  ];
  const fs = require('fs');
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

function startNest(env) {
  const mainJs = resolveMainJs();
  log(`Starting Nest on 127.0.0.1:${NEST_PORT} (${mainJs})`);
  const child = spawn(process.execPath, [mainJs], {
    stdio: 'inherit',
    env: { ...env, PORT: String(NEST_PORT) },
  });
  child.on('exit', (code, signal) => {
    upstreamReady = false;
    lastError = `Nest exited code=${code} signal=${signal || ''}. 向上滚动查看 [bootstrap] failed 或 [AiModule] 日志`;
    bootPhase = 'nest_crashed';
    log('ERROR:', lastError);
  });
  return child;
}

async function main() {
  log('boot...');
  log(`node=${process.version} cwd=${process.cwd()}`);
  bootPhase = 'gateway';
  await startGateway();

  const databaseUrl = buildDatabaseUrl();
  if (!databaseUrl) {
    lastError = 'missing DATABASE_URL or MYSQL_ADDRESS';
    bootPhase = 'config_error';
    log('ERROR:', lastError);
    return;
  }
  process.env.DATABASE_URL = databaseUrl;

  const { host, port: dbPort, db } = parseHostPort(databaseUrl);
  try {
    const u = new URL(databaseUrl);
    log(`db target ${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}`);
  } catch {
    log('DATABASE_URL not parseable');
  }

  bootPhase = 'tcp_check';
  try {
    log(`TCP check ${host}:${dbPort}...`);
    await tcpCheck(host, dbPort, 8000);
    log('TCP check OK');
  } catch (err) {
    lastError = `${err.message}. Bind MySQL to this service / check MYSQL_*`;
    bootPhase = 'tcp_failed';
    log('ERROR:', lastError);
    return;
  }

  bootPhase = 'prisma_version';
  const ver = spawnSync('npx', ['prisma', '--version'], { stdio: 'inherit', env: process.env });
  if (ver.status !== 0) {
    lastError = 'prisma CLI failed';
    bootPhase = 'prisma_missing';
    return;
  }

  bootPhase = 'create_db';
  ensureDatabase(databaseUrl, db);

  bootPhase = 'migrate';
  const maxAttempts = Number(process.env.MIGRATE_RETRIES || 5);
  const ok = migrateWithRetries(databaseUrl, maxAttempts);
  if (!ok) {
    lastError =
      'prisma migrate deploy failed — check DB credentials and that recipe_assistant is reachable';
    bootPhase = 'migrate_failed';
    log('ERROR:', lastError);
    return;
  }

  if (process.env.RUN_SEED_ON_START === '1') {
    bootPhase = 'seed';
    const seedEnv = {
      ...process.env,
      SEED_MINIMAL: process.env.SEED_MINIMAL || '1',
      SEED_INGREDIENTS: process.env.SEED_INGREDIENTS || '80',
      SEED_RECIPES: process.env.SEED_RECIPES || '40',
      SEED_SUBSTITUTES: process.env.SEED_SUBSTITUTES || '40',
    };
    const seedJs = path.join(__dirname, '..', 'dist', 'prisma', 'seed.js');
    log(
      `Running seed ${seedJs} minimal=${seedEnv.SEED_MINIMAL} ingredients=${seedEnv.SEED_INGREDIENTS}`,
    );
    const r = spawnSync(process.execPath, [seedJs], {
      stdio: 'inherit',
      env: seedEnv,
      timeout: Number(process.env.SEED_TIMEOUT_MS || 600000),
    });
    if (r.error) log('ERROR: seed spawn failed', String(r.error));
    else if (r.status !== 0) log(`ERROR: seed exited with ${r.status}`);
    else log('seed OK');
  } else {
    log('RUN_SEED_ON_START!=1, skip seed (use POST /api/v1/system/seed)');
  }

  bootPhase = 'starting_nest';
  startNest(process.env);

  bootPhase = 'wait_nest';
  if (!waitForPort('127.0.0.1', NEST_PORT, 60)) {
    lastError = `Nest did not listen on ${NEST_PORT} in time`;
    bootPhase = 'nest_timeout';
    log('ERROR:', lastError);
    return;
  }

  upstreamReady = true;
  bootPhase = 'ready';
  log('API ready — gateway proxying to Nest');
}

main().catch((err) => {
  lastError = String(err && err.stack ? err.stack : err);
  bootPhase = 'crash';
  log('ERROR:', lastError);
});
