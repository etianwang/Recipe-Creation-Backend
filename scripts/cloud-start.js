/**
 * Cloud entrypoint — Node (avoids Windows CRLF breaking Alpine shell).
 * Opens :80 immediately so WeChat TCP probes don't kill the pod during migrate.
 */
const { spawn, spawnSync } = require('child_process');
const http = require('http');
const net = require('net');
const path = require('path');
const { URL } = require('url');

function log(...args) {
  console.log('[cloud-start]', ...args);
}

function fail(msg, code = 1) {
  console.error('[cloud-start] ERROR:', msg);
  process.exit(code);
}

function run(cmd, args, opts = {}) {
  log('run:', cmd, args.join(' '));
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    env: process.env,
    ...opts,
  });
  if (r.error) fail(String(r.error));
  if (r.status !== 0) fail(`${cmd} exited with ${r.status}`, r.status || 1);
}

function sleepSync(ms) {
  // Alpine busybox sleep (seconds)
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
  // short connect timeout so failed attempts don't hang past probe window
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
    db: (u.pathname || '/').replace(/^\//, '') || 'recipe_assistant',
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

function startPlaceholder(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('booting\n');
    });
    server.on('error', reject);
    server.listen(port, '0.0.0.0', () => {
      log(`placeholder listening on 0.0.0.0:${port} (probe-safe while migrating)`);
      resolve(server);
    });
  });
}

function stopServer(server) {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
    // force-close lingering connections
    setTimeout(() => resolve(), 2000).unref?.();
  });
}

function ensureDatabase(databaseUrl, dbName) {
  const adminUrl = withDbName(databaseUrl, 'mysql');
  log(`ensure database \`${dbName}\` exists (via mysql system schema)...`);
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
    if (r.error && r.error.code === 'ETIMEDOUT') {
      log('migrate timed out after 60s');
    }
    if (r.status === 0) {
      log('migrate deploy OK');
      return true;
    }
    log(`migrate failed (status=${r.status}), retry in 3s...`);
    sleepSync(3000);
  }
  return false;
}

async function main() {
  log('boot...');
  log(`node=${process.version} cwd=${process.cwd()}`);

  const port = Number(process.env.PORT || 80);
  process.env.PORT = String(port);

  const databaseUrl = buildDatabaseUrl();
  if (!databaseUrl) {
    fail('set DATABASE_URL or MYSQL_ADDRESS(+MYSQL_USERNAME/PASSWORD/DATABASE)');
  }
  process.env.DATABASE_URL = databaseUrl;

  const { host, port: dbPort, db } = parseHostPort(databaseUrl);
  try {
    const u = new URL(databaseUrl);
    log(`db target ${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}`);
  } catch {
    log('DATABASE_URL present but not a parseable URL');
  }

  // Pass probes while we prepare DB
  const placeholder = await startPlaceholder(port);

  try {
    log(`TCP check ${host}:${dbPort}...`);
    await tcpCheck(host, dbPort, 8000);
    log('TCP check OK');
  } catch (err) {
    await stopServer(placeholder);
    fail(
      `${err.message}. Bind 云托管 MySQL to this service, and confirm security group / MYSQL_ADDRESS.`,
    );
  }

  try {
    run('npx', ['prisma', '--version']);

    ensureDatabase(databaseUrl, db);

    const maxAttempts = Number(process.env.MIGRATE_RETRIES || 5);
    const ok = migrateWithRetries(databaseUrl, maxAttempts);
    if (!ok) {
      await stopServer(placeholder);
      fail(
        'prisma migrate deploy failed after retries — check DB name, user password, and that schema can be applied',
      );
    }

    if (process.env.RUN_SEED_ON_START === '1') {
      log('RUN_SEED_ON_START=1 — large seeds may delay; prefer local npm run db:seed');
      const r = spawnSync('npx', ['prisma', 'db', 'seed'], {
        stdio: 'inherit',
        env: process.env,
        timeout: 120000,
      });
      if (r.status !== 0) log('seed skipped/failed (non-fatal)');
    }
  } catch (err) {
    await stopServer(placeholder);
    fail(String(err && err.message ? err.message : err));
  }

  await stopServer(placeholder);
  log(`Starting API on 0.0.0.0:${port}`);

  const mainJs = path.join(__dirname, '..', 'dist', 'main.js');
  const child = spawn(process.execPath, [mainJs], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal) fail(`API killed by signal ${signal}`);
    process.exit(code == null ? 1 : code);
  });
}

main().catch((err) => fail(String(err && err.stack ? err.stack : err)));
