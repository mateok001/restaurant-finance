# 部署日志 — Restaurant Finance

## 记录信息

| 项目 | 详情 |
|------|------|
| 日期 | 2026-06-05 |
| commit | `e8afcd1` |
| 分支 | `master` |
| 服务器 | 轻量云服务器（Linux + Docker Compose） |
| 对象存储 | 腾讯云 COS（ap-seoul） |
| 域名 | 待配置 |

---

## 变更摘要

### 1. 对象存储迁移：MinIO → 腾讯云 COS

- **原因**：生产环境已有腾讯云 COS，不需要在服务器上运行额外的 MinIO 容器
- **改动**：
  - 卸载 `minio` npm 包，安装 `cos-nodejs-sdk-v5`
  - 重写 `server/src/services/file.service.ts`：保持接口不变（uploadFile / deleteFile），底层替换为 COS SDK
  - 更新 `server/src/config/index.ts`：MinIO 配置块替换为 COS 配置（SecretId/SecretKey/Bucket/Region）
- **COS 配置**：
  - Bucket: `mkes001-backup-1304664505`
  - Region: `ap-seoul`
  - 文件签名 URL 有效期：7天

### 2. Docker Compose 精简

- **旧版**：包含 MinIO、Ollama、FunASR、PaddleOCR 等服务
- **新版**：仅保留 `server` + `web` 两个容器
  - rf-server：Node.js + Prisma + SQLite + Puppeteer（简报生成PNG）
  - rf-web：Nginx + React 静态文件，`/api/` 反向代理到 server:8080
- **数据持久化**：SQLite 数据库挂载到 `sqlite_data` Docker volume（路径：`/app/prisma/data/`）

### 3. 微信小程序生产配置

- `miniapp/utils/config.js`：新增 `isProduction()` 检测
  - 开发版/体验版 → 局域网 IP（`http://192.168.1.14:8080/api/v1`）
  - 正式版（release）→ HTTPS 域名（`https://你的域名.com/api/v1`）
- 后续上线：在微信公众平台配置合法域名 + 上传代码

### 4. TypeScript 编译修复

修复了上游代码中 10 个文件的类型错误（Express `req.params` 类型、Role 枚举、Puppeteer Buffer 转换），确保 Docker 构建时 `tsc` 编译零报错。

---

## 文件清单

### 修改
| 文件 | 变更 |
|------|------|
| `docker-compose.yml` | 精简为 server + web，移除 MinIO/AI |
| `.env.example` | MinIO → COS 环境变量 |
| `server/Dockerfile` | 修正数据目录 `/app/data` → `/app/prisma/data` |
| `server/package.json` | 依赖替换（minio → cos-nodejs-sdk-v5） |
| `server/src/services/file.service.ts` | MinIO SDK → COS SDK |
| `server/src/config/index.ts` | MinIO 配置 → COS 配置 |
| `miniapp/utils/config.js` | 生产/开发环境自动切换 |
| `server/src/routes/*.ts` (8个文件) | `req.params` 类型断言 |
| `server/src/services/auth.service.ts` | Role 枚举类型断言 |
| `server/src/services/briefing.service.ts` | Buffer/Uint8Array 转换 |

### 新增
| 文件 | 说明 |
|------|------|
| `deploy/README.md` | 部署指南 |
| `deploy/nginx-ssl.conf` | Nginx SSL 反向代理配置（域名就绪后使用） |
| `deploy/server-setup.sh` | 服务器初始化脚本 |
| `deploy/DEPLOYMENT-LOG.md` | 本部署日志 |
| `server/prisma/migrations/20260605014253_init/` | 数据库初始化迁移 |

---

## 服务器部署步骤

### 前置
- [x] COS 存储桶已创建
- [x] JWT 密钥已生成
- [x] `.env` 已配置（未提交 git，需手动维护）
- [ ] 域名 + DNS 解析（待定）
- [ ] 服务器上安装 Docker + Docker Compose

### 上线步骤
1. 打包项目上传到服务器 `/opt/restaurant-finance/`
2. `docker compose up -d --build`
3. 验证 Web 前端 `http://IP:3000`
4. 验证 API `http://IP:8080/api/v1`
5. （后续）配置域名 + SSL + 小程序上线

---

## 风险与备忘

| 风险 | 状态 | 说明 |
|------|------|------|
| Puppeteer 内存 | ⚠️ | 简报生成需要 ≥2GB 内存，轻量服务器需确认 |
| SQLite 备份 | 📋 | 需配置 cron 定期备份 .db 到 COS |
| 域名 + SSL | 📋 | 暂无域名，微信小程序暂不能上线正式版 |
| Redis 未使用 | 📋 | 代码中定义了 Redis 配置但未实际使用 |
| 初始种子数据 | 📋 | 新部署后需手动运行 `prisma:seed` 创建管理员 |

---

## 默认账户

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 合伙人 | partner | partner123 |

> 种子数据运行方式：`docker exec rf-server npm run prisma:seed`
