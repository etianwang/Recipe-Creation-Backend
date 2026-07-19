# NestJS backend for 微信云托管
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json ./
# prisma 已在 dependencies，生产可 migrate
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY scripts/cloud-start.sh ./scripts/cloud-start.sh
# 在 runner 内重新 generate，避免覆盖 @prisma 破坏 CLI
RUN chmod +x ./scripts/cloud-start.sh \
  && npx prisma generate \
  && npx prisma --version

EXPOSE 80
CMD ["sh", "./scripts/cloud-start.sh"]
