# 部署日志 — Restaurant Finance

## 记录信息

| 项目 | 详情 |
|------|------|
| 日期 | 2026-06-05 |
| 最终 commit | `fe4c508` |
| 分支 | `master` |
| 服务器 | 腾讯云轻量服务器 `43.131.245.188`（Debian 12） |
| 对象存储 | 腾讯云 COS（ap-seoul, Bucket: mkes001-backup-1304664505） |
| 域名 | 不购买，使用体验版 + IP 直连 |
| 部署方式 | Docker Compose（server + web 两个容器） |

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
- **数据持久化**：SQLite 数据库挂载到 `sqlite_data` Docker volume

### 3. 微信小程序 — 体验版方案

**决策**：不购买域名、不申请 SSL 证书，使用微信小程序**体验版**长期运行。

- **原因**：用户仅 2-3 人（经营者 + 合伙人），远低于体验版 30 人上限
- **好处**：零成本、无需审核、无需域名和 SSL
- **API 地址**：`http://43.131.245.188:8080/api/v1`（IP 直连，HTTP）
- **开发者工具设置**：勾选"不校验合法域名"
- **版本流程**：代码改完 → 微信开发者工具上传 → 选「体验版」→ 生成二维码分享
- **正式版**：如将来用户量增长到 >30 人，再购买域名 + SSL + 提交审核

### 4. TypeScript 编译修复

修复了上游代码中 10 个文件的类型错误，确保 Docker 构建时 `tsc` 编译零报错。

### 5. Docker 构建问题修复

- `NODE_ENV=production` 从 `npm ci` 之前移到之后，确保 `tsx` 等 dev 依赖在 seed/migrate 时可用
- Dockerfile 中添加 npm 镜像源（`registry.npmmirror.com`），解决国内网络访问慢的问题

---

## 最终部署配置

### 服务器信息

| 项目 | 值 |
|------|------|
| IP | `43.131.245.188` |
| 系统 | Debian 12 |
| Web 前端 | `http://43.131.245.188:3000` |
| API 后端 | `http://43.131.245.188:8080/api/v1` |
| 项目路径 | `/opt/restaurant-finance/` |

### 默认账户

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 合伙人 | partner | partner123 |

---

## 文件清单

### 修改
| 文件 | 变更 |
|------|------|
| `docker-compose.yml` | 精简为 server + web，移除 MinIO/AI |
| `.env.example` | MinIO → COS 环境变量 |
| `server/Dockerfile` | 修正数据目录 + npm 镜像 + NODE_ENV 顺序 |
| `server/package.json` | 依赖替换（minio → cos-nodejs-sdk-v5） |
| `server/package-lock.json` | 重新生成 |
| `server/src/services/file.service.ts` | MinIO SDK → COS SDK |
| `server/src/config/index.ts` | MinIO 配置 → COS 配置 |
| `miniapp/utils/config.js` | 生产/开发环境切换（IP 直连） |
| `server/src/routes/*.ts` (8个文件) | `req.params` 类型断言 |
| `server/src/services/auth.service.ts` | Role 枚举类型断言 |
| `server/src/services/briefing.service.ts` | Buffer/Uint8Array 转换 |

### 新增
| 文件 | 说明 |
|------|------|
| `deploy/README.md` | 部署指南 |
| `deploy/nginx-ssl.conf` | Nginx SSL 反代配置（将来有域名时使用） |
| `deploy/server-setup.sh` | 服务器初始化脚本 |
| `deploy/DEPLOYMENT-LOG.md` | 本部署日志 |

---

## 进度清单

- [x] COS 存储桶已配置
- [x] JWT 密钥已生成
- [x] `.env` 已配置
- [x] Docker Compose 部署成功
- [x] Web 前端可访问（http://43.131.245.188:3000）
- [x] API 后端可访问（http://43.131.245.188:8080）
- [x] 种子数据已写入（admin/admin123）
- [x] 小程序体验版方案确定
- [ ] 真实数据导入（等另一台电脑可访问）
- [ ] 微信开发者工具上传体验版
- [ ] SQLite 定期备份到 COS

---

## 风险与备忘

| 风险 | 状态 | 说明 |
|------|------|------|
| Puppeteer 内存 | ⚠️ | 简报生成需要 ≥2GB 内存，轻量服务器需确认 |
| SQLite 备份 | 📋 | 需配置 cron 定期备份 .db 到 COS |
| 域名 & SSL | ⏭️ | 已跳过，体验版方案不需要 |
| 正式版审核 | ⏭️ | 暂不需要，体验版够用 |
| Redis 未使用 | 📋 | 代码中定义了 Redis 配置但未实际使用 |

---

## 服务器常用命令

```bash
# 查看日志
sudo docker compose -f /opt/restaurant-finance/docker-compose.yml logs -f

# 重启
sudo docker compose -f /opt/restaurant-finance/docker-compose.yml restart

# 更新后重建
cd /opt/restaurant-finance
git pull
sudo docker compose -f /opt/restaurant-finance/docker-compose.yml up -d --build

# 重新生成种子数据
sudo docker exec rf-server npm run prisma:seed
```
