#!/bin/sh
set -e

echo "[cloud-start] boot..."
echo "[cloud-start] node=$(node -v) pwd=$(pwd)"

# 微信云托管 MySQL 注入变量 → DATABASE_URL
if [ -z "$DATABASE_URL" ] && [ -n "$MYSQL_ADDRESS" ]; then
  DB="${MYSQL_DATABASE:-recipe_assistant}"
  PASS_ENC=$(node -e "process.stdout.write(encodeURIComponent(process.env.MYSQL_PASSWORD||''))")
  USER_ENC=$(node -e "process.stdout.write(encodeURIComponent(process.env.MYSQL_USERNAME||'root'))")
  export DATABASE_URL="mysql://${USER_ENC}:${PASS_ENC}@${MYSQL_ADDRESS}/${DB}"
  echo "[cloud-start] DATABASE_URL built from MYSQL_* host=${MYSQL_ADDRESS} db=${DB}"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "[cloud-start] ERROR: set DATABASE_URL or MYSQL_ADDRESS(+MYSQL_USERNAME/PASSWORD/DATABASE)"
  exit 1
fi

# 脱敏打印目标（不含密码）
node -e "
const u=process.env.DATABASE_URL||'';
try {
  const x=new URL(u);
  console.log('[cloud-start] db target', x.protocol+'//'+x.hostname+(x.port?':'+x.port:'')+x.pathname);
} catch(e) {
  console.log('[cloud-start] DATABASE_URL present but not a parseable URL');
}
"

echo "[cloud-start] prisma version:"
npx prisma --version || {
  echo "[cloud-start] ERROR: prisma CLI missing in image"
  exit 1
}

echo "[cloud-start] Running prisma migrate deploy..."
if ! npx prisma migrate deploy; then
  echo "[cloud-start] ERROR: prisma migrate deploy failed"
  echo "[cloud-start] Check: MySQL 已创建库、服务绑定了云托管 MySQL、账号密码正确"
  exit 1
fi
echo "[cloud-start] migrate deploy OK"

if [ "${RUN_SEED_ON_START}" = "1" ]; then
  echo "[cloud-start] RUN_SEED_ON_START=1 — seed may be slow; prefer local npm run db:seed"
  npx prisma db seed || echo "[cloud-start] seed skipped/failed (non-fatal)"
fi

PORT_TO_USE="${PORT:-80}"
export PORT="$PORT_TO_USE"
echo "[cloud-start] Starting API on 0.0.0.0:${PORT_TO_USE}"
exec node dist/main.js
