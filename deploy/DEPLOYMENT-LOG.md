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

### 3. 微信小程序 — 体验版方案 → 域名 + HTTPS 方案

**初始决策**：不购买域名，使用体验版 + IP 直连。

**问题**：2026-06-05 真机测试，体验版强制校验 HTTPS 域名，`http://43.131.245.188:8080` 不被微信接受，报 `url not in domain`。

**最终决策**：购买便宜域名 + 免费 SSL，成本 ~10元/年。

---

### 4. 域名 + SSL 配置方案（待执行）

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

#### 步骤 1：购买域名

| 平台 | 推荐后缀 | 价格 |
|------|----------|------|
| 腾讯云 DNSPod | `.top` / `.xyz` | ~6-10元/年 |
| 阿里云万网 | `.top` / `.xyz` | ~6-10元/年 |

**命名建议**：`餐厅名-finance.top` 或 `restaurant-name.top`

#### 步骤 2：DNS 解析

购买后在 DNS 控制台添加 A 记录：

| 主机记录 | 记录类型 | 记录值 | TTL |
|----------|----------|--------|-----|
| `@` | A | `43.131.245.188` | 600 |
| `www` | A | `43.131.245.188` | 600 |

#### 步骤 3：服务器安装 Nginx + Certbot

```bash
sudo apt-get update && sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo ufw allow 80 && sudo ufw allow 443
```

#### 步骤 4：配置 Nginx 反向代理

将 `deploy/nginx-ssl.conf` 部署到 `/etc/nginx/sites-available/`，替换域名。

#### 步骤 5：申请 Let's Encrypt SSL 证书

```bash
sudo certbot --nginx -d 你的域名.com -d www.你的域名.com
```

#### 步骤 6：更新项目配置

- `miniapp/utils/config.js` → `PROD_DOMAIN = 'https://你的域名.com'`
- `docker-compose.yml` → 3000 和 8080 端口不再直接暴露（改由 Nginx 反代）

#### 步骤 7：微信公众平台配置

登录 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 开发管理 → 服务器域名：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `https://你的域名.com` |
| uploadFile 合法域名 | `https://mkes001-backup-1304664505.cos.ap-seoul.myqcloud.com` |

#### 步骤 8：上传体验版

微信开发者工具 → 重新上传 → 扫码测试 → 正常使用。

---

## 进度清单

- [x] COS 存储桶已配置
- [x] JWT 密钥已生成
- [x] `.env` 已配置
- [x] Docker Compose 部署成功
- [x] Web 前端可访问（http://43.131.245.188:3000）
- [x] API 后端可访问（http://43.131.245.188:8080）
- [x] 种子数据已写入（admin/admin123）
- [x] 小程序正式 AppID 已配置（wxc5652a7743d817e1）
- [x] 小程序首次上传成功
- [ ] **域名购买**（~10元/年，.top/.xyz）
- [ ] DNS 解析到 43.131.245.188
- [ ] 服务器安装 Nginx + 申请 SSL 证书
- [ ] 微信后台配置合法域名
- [ ] 小程序体验版真机测试通过
- [ ] 真实数据导入（等另一台电脑可访问）
- [ ] SQLite 定期备份到 COS

---

## 风险与备忘

| 风险 | 状态 | 说明 |
|------|------|------|
| Puppeteer 内存 | ⚠️ | 简报生成需要 ≥2GB 内存，轻量服务器需确认 |
| SQLite 备份 | 📋 | 需配置 cron 定期备份 .db 到 COS |
| 域名 & SSL | 🔄 | 进行中，购买便宜域名 + Let's Encrypt 免费 SSL |
| 微信小程序真机 | 🔄 | 待域名 + SSL 完成后可正常使用体验版 |
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
