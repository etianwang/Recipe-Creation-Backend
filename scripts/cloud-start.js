/**
 * Cloud entrypoint — use Node instead of .sh to avoid Windows CRLF breaking Alpine.
 */
const { spawnSync } = require('child_process');
const path = require('path');

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
  if (r.error) {
    fail(String(r.error));
  }
  if (r.status !== 0) {
    fail(`${cmd} exited with ${r.status}`, r.status || 1);
  }
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const address = process.env.MYSQL_ADDRESS;
  if (!address) {
    return null;
  }
  const user = encodeURIComponent(process.env.MYSQL_USERNAME || 'root');
  const pass = encodeURIComponent(process.env.MYSQL_PASSWORD || '');
  const db = process.env.MYSQL_DATABASE || 'recipe_assistant';
  const url = `mysql://${user}:${pass}@${address}/${db}`;
  log(`DATABASE_URL built from MYSQL_* host=${address} db=${db}`);
  return url;
}

function sleep(ms) {
  spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`], {
    stdio: 'ignore',
  });
}

log('boot...');
log(`node=${process.version} cwd=${process.cwd()}`);

const databaseUrl = buildDatabaseUrl();
if (!databaseUrl) {
  fail('set DATABASE_URL or MYSQL_ADDRESS(+MYSQL_USERNAME/PASSWORD/DATABASE)');
}
process.env.DATABASE_URL = databaseUrl;

try {
  const u = new URL(databaseUrl);
  log(`db target ${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}`);
} catch {
  log('DATABASE_URL present but not a parseable URL');
}

run('npx', ['prisma', '--version']);

const maxAttempts = Number(process.env.MIGRATE_RETRIES || 8);
let migrated = false;
for (let i = 1; i <= maxAttempts; i++) {
  log(`prisma migrate deploy (attempt ${i}/${maxAttempts})...`);
  const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status === 0) {
    migrated = true;
    log('migrate deploy OK');
    break;
  }
  log(`migrate failed (status=${r.status}), retry in 5s...`);
  sleep(5000);
}
if (!migrated) {
  fail(
    'prisma migrate deploy failed after retries — check MySQL binding, DB exists, credentials',
  );
}

if (process.env.RUN_SEED_ON_START === '1') {
  log('RUN_SEED_ON_START=1 — prefer local npm run db:seed for large seeds');
  const r = spawnSync('npx', ['prisma', 'db', 'seed'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) {
    log('seed skipped/failed (non-fatal)');
  }
}

const port = process.env.PORT || '80';
process.env.PORT = port;
log(`Starting API on 0.0.0.0:${port}`);

const mainJs = path.join(__dirname, '..', 'dist', 'main.js');
const child = spawnSync(process.execPath, [mainJs], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(child.status == null ? 1 : child.status);
