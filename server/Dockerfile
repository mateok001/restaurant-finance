# ============================================
# 后端服务 Dockerfile — 多阶段构建
# ============================================

# ---- 阶段1: 构建 ----
FROM node:20-alpine AS build

WORKDIR /app

# 避免 Puppeteer 在 npm install 时下载 Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 使用国内 npm 镜像加速
RUN npm config set registry https://registry.npmmirror.com

COPY package.json package-lock.json ./
RUN npm ci

# 生成 Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# 编译 TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- 阶段2: 运行 ----
FROM node:20-alpine

WORKDIR /app

# 安装 Chromium（Puppeteer 生成简报 PNG 使用）
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

# 复制依赖（保留 devDeps 以使用 prisma CLI 执行迁移）
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci --include=dev
# 从构建阶段复制产物
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# 复制 Prisma schema 和迁移文件
COPY prisma ./prisma

# 创建 SQLite 数据目录
RUN mkdir -p /app/prisma/data

EXPOSE 8080

# 启动时自动执行数据库迁移，然后启动服务
ENTRYPOINT ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
