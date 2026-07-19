# 智能厨房搭配助手 — Backend

NestJS + Prisma + PostgreSQL（对齐 `docs/11_TECH_STACK.md` / `docs/20_DATABASE_DESIGN.md`）。

## 要求

- Node.js 20+
- Docker Desktop（推荐）或本机 PostgreSQL

## 数据库（Docker）

在仓库根目录：

```bash
docker compose up -d
```

默认连接：`localhost:5433`（避免与本机 5432 冲突）。配置见根目录 `docker-compose.yml` 与 `backend/.env.example`。

## 启动

```bash
cp .env.example .env
# 确认 DATABASE_URL

npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

健康检查：`GET http://localhost:3000/api/v1/health`

表校验：`npm run db:verify`

## 常用脚本

| 脚本 | 说明 |
|------|------|
| `npm run start:dev` | 开发热重载 |
| `npm test` | 单元测试（含迁移表检查） |
| `npm run test:e2e` | e2e |
| `npm run prisma:deploy` | 应用迁移 |
| `npm run db:seed` | 导入种子食材/菜谱/替代 |
| `npm run db:verify` | 列出 public 表 |

## 目录

```text
src/
  health/      # GET /api/v1/health
  prisma/      # PrismaModule / PrismaService
prisma/
  schema.prisma
  migrations/
```
