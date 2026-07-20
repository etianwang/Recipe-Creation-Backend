# 智能厨房搭配 — Backend API

NestJS + Prisma + **MySQL**。本目录为独立 Git 仓库，用于 [微信云托管](https://github.com/etianwang/Recipe-Creation-Backend) 部署。

完整上线说明见 monorepo 根目录 [`README.md`](https://github.com/etianwang/Recipe-Creation/blob/main/README.md) 与 [`docs/80_WECHAT_CLOUD_DEPLOY.md`](https://github.com/etianwang/Recipe-Creation/blob/main/docs/80_WECHAT_CLOUD_DEPLOY.md)。

## 要求

- Node.js 20+
- MySQL 8（本地 Docker 或云托管 MySQL）

## 快速启动（本地）

```bash
cp .env.example .env
# 编辑 DATABASE_URL、JWT_SECRET、微信与 AI 密钥

npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

健康检查：`GET http://localhost:3000/api/v1/health`

## 种子数据

```bash
SEED_MINIMAL=1 npm run seed    # 核心安全库（推荐首次上线）
npm run seed                   # 全量（~200 食材 / ~800 菜谱，已做食物相克过滤）
```

## 常用脚本

| 脚本 | 说明 |
|------|------|
| `npm run start:dev` | 开发热重载 |
| `npm run build` | 编译 `dist/` |
| `npm test` | 单元测试 |
| `npm run test:e2e` | E2E |
| `npm run db:seed` | Prisma seed |

## 云托管

- 根目录 `Dockerfile` + `container.config.json`
- 入口 `scripts/cloud-start.js`（迁移 + 可选启动灌种）
- 生产务必配置真实 AI 密钥；`WECHAT_DEV_LOGIN` 仅在非 production 生效

**联系：** etianwang@qq.com
