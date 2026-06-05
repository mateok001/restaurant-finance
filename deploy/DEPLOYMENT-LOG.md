# 部署日志 — Restaurant Finance

## 记录信息

| 项目 | 详情 |
|------|------|
| 日期 | 2026-06-05 |
| 最终 commit | `da9d1b2` |
| 分支 | `master` |
| 服务器 | 腾讯云轻量服务器 `43.131.245.188`（Debian 12） |
| 对象存储 | 腾讯云 COS（ap-seoul, Bucket: mkes001-backup-1304664505） |
| 域名 | `bistrotap.site`（腾讯云，.site 后缀 ~10元/年） |
| 部署方式 | Docker Compose（server + web）+ 宿主机 Nginx SSL 反代 |

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

### 3. TypeScript 编译修复

修复了上游代码中 10 个文件的类型错误，确保 Docker 构建时 `tsc` 编译零报错。

### 4. Docker 构建问题修复

- `NODE_ENV=production` 从 `npm ci` 之前移到之后，确保 `tsx` 等 dev 依赖在 seed/migrate 时可用
- Dockerfile 中添加 npm 镜像源（`registry.npmmirror.com`），解决国内网络访问慢的问题

### 5. 域名 + SSL 配置（✅ 已完成）

**域名**：`bistrotap.site`（腾讯云，.site 后缀，~10 元/年）

**SSL 证书**：Let's Encrypt 免费证书，2026-09-03 到期（自动续期）

**Nginx 配置**：宿主机 Nginx 做 SSL 终止 + 反向代理
- `:443 HTTPS` → `127.0.0.1:3000`（Web 前端）
- `:443 /api/` → `127.0.0.1:8080`（API 后端）
- `:80 HTTP` → 301 重定向到 HTTPS

**遇到的问题**：zsh heredoc 反复吃掉 nginx 变量（`$server_name` → `\`、`$host` → 空），最终用 Python 写入文件解决。SSL 申请后还需在腾讯云安全组放行 443 端口。

### 6. 微信小程序真机验证 — ICP 备案发现 🔄

**执行过程**：
1. 域名购买 `bistrotap.site`
2. DNS A 记录 → `43.131.245.188`
3. 服务器安装 Nginx + Certbot
4. 配置 HTTPS 反向代理，申请 Let's Encrypt SSL
5. 微信公众平台配置 `request 合法域名` + `uploadFile 合法域名`
6. 上传小程序体验版 → 手机扫码测试

**现象**：开发者工具正常登录，手机扫码报 `request:fail url not in domain list: bistrotap.site`

**排查过程**：
- ✅ SSL 证书链完整（Let's Encrypt → ISRG Root X1）
- ✅ Nginx 反代正常（curl HTTPS 返回 200）
- ✅ API 端点正常（返回 accessToken）
- ✅ 微信后台域名已配置
- ✅ 小程序代码 PROD_DOMAIN 已更新为 `https://bistrotap.site`
- ✅ 重新上传小程序多次
- ❌ 手机端始终报 url not in domain list

**根因**：**ICP 备案缺失**。微信小程序规则：国内个人/企业主体的域名必须完成工信部 ICP 备案。与服务器是否在海外无关——即使服务器在海外，域名仍需备案。开发者工具能登录是因为 `project.config.json` 中 `urlCheck: false` 跳过了校验，手机端是微信 SDK 强制校验。

**临时解决方案（已验证 ✅）**：
1. 手机微信扫码进入小程序
2. 右上角 「…」 → 「打开调试」
3. 重新扫码 → 正常登录

**长期方案：ICP 备案**

| 维度 | 说明 |
|------|------|
| 方式 | 腾讯云控制台 → ICP 备案 → 个人备案 |
| 材料 | 身份证正反面 + 人脸识别 |
| 周期 | 1-3 周 |
| 费用 | 免费 |
| 对海外服务器影响 | 无 — 备案的是域名，不影响 Discord/Telegram Bot 等其他服务 |

---

## 正式上线费用与收益分析

### 费用

| 项目 | 费用 |
|------|------|
| ICP 备案 | **免费** |
| 微信认证 | 30 元（一次性，AppID 已有则已完成） |
| 域名续费 | ~10 元/年 |
| 服务器 | 已有（不额外产生费用） |
| SSL 证书 | 免费（Let's Encrypt 自动续） |
| 微信支付（可选） | 0.6%（仅实际收款时产生） |
| **总计** | **~10 元/年 + 30 元一次性** |

### 收益

| 方面 | 说明 |
|------|------|
| 免调试 | 用户直接扫码可用，无需每次手动「打开调试」 |
| 可分享 | 可转发给餐厅员工、合伙人，扫码即用 |
| 正式形象 | 搜索小程序显示正式版，非「体验版」标签 |
| 微信支付 | 备案后可申请开通（未来想在线收款时可用） |
| 无人数限制 | 体验版有人数/有效期限制，正式版无限制 |
| 版本管理 | 支持灰度发布、分阶段上线，出问题可回滚 |

### ICP 备案对其他项目的影响分析

```
同一台服务器 43.131.245.188
├── bistrotap.site        ← ICP 备案（仅涉及 HTTP/HTTPS Web 服务）
├── Discord Bot :xxxx     ← 独立端口，不涉及备案，互不影响
├── Telegram Bot :xxxx    ← 独立端口，不涉及备案，互不影响
├── 未来项目 :xxxx        ← 各自独立域名/端口，独立备案或不备案
└── SSH, Docker, cron     ← 运维服务，统统不影响
```

> 🏷️ **关键区分**：备案的是域名（用于 HTTP 服务访问），不是服务器 IP。其他端口的非 HTTP 服务（Bots、数据库、API 微服务）完全不受牵连。未来 Discord/Telegram Bot 中枢可以放心在同一个服务器上构建。

---

## 最终部署配置

### 服务器信息

| 项目 | 值 |
|------|------|
| IP | `43.131.245.188` |
| 域名 | `https://bistrotap.site` |
| 系统 | Debian 12 |
| Web 前端 | `https://bistrotap.site`（Nginx → :3000） |
| API 后端 | `https://bistrotap.site/api/v1`（Nginx → :8080） |
| 项目路径 | `/opt/restaurant-finance/` |
| SSL 到期 | 2026-09-03（Certbot 自动续期） |

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
| `miniapp/utils/config.js` | 生产环境切换：IP 直连 → `https://bistrotap.site` |
| `deploy/nginx-ssl.conf` | 域名替换：YOUR_DOMAIN.com → bistrotap.site |
| `server/src/routes/*.ts` (8个文件) | `req.params` 类型断言 |
| `server/src/services/auth.service.ts` | Role 枚举类型断言 |
| `server/src/services/briefing.service.ts` | Buffer/Uint8Array 转换 |

### 新增

| 文件 | 说明 |
|------|------|
| `deploy/README.md` | 部署指南 |
| `deploy/nginx-ssl.conf` | Nginx SSL 反代配置 |
| `deploy/server-setup.sh` | 服务器初始化脚本 |
| `deploy/DEPLOYMENT-LOG.md` | 本部署日志 |

---

## 进度清单

- [x] COS 存储桶已配置
- [x] JWT 密钥已生成
- [x] `.env` 已配置
- [x] Docker Compose 部署成功
- [x] Web 前端可访问（`http://43.131.245.188:3000`）
- [x] API 后端可访问（`http://43.131.245.188:8080`）
- [x] 种子数据已写入（admin/admin123）
- [x] 小程序正式 AppID 已配置（wxc5652a7743d817e1）
- [x] 小程序首次上传成功
- [x] **域名购买**（bistrotap.site，腾讯云，.site）
- [x] DNS 解析到 43.131.245.188
- [x] 服务器安装 Nginx + 申请 Let's Encrypt SSL 证书
- [x] HTTPS 访问 `https://bistrotap.site` 正常
- [x] 微信后台配置合法域名（request + uploadFile）
- [x] 小程序体验版真机测试（需手机端「打开调试」）
- [x] 小程序手机真机通过调试模式验证登录成功
- [x] ICP 备案必要性已分析，费用收益已记录
- [ ] **ICP 备案**（腾讯云控制台，免费，1-3 周）
- [ ] 备案后移除手机调试步骤，正式使用
- [ ] 真实数据导入（等另一台电脑可访问）
- [ ] SQLite 定期备份到 COS（cron job）

---

## 风险与备忘

| 风险 | 状态 | 说明 |
|------|------|------|
| Puppeteer 内存 | ⚠️ | 简报生成需要 ≥2GB 内存，轻量服务器需确认 |
| SQLite 备份 | 📋 | 需配置 cron 定期备份 .db 到 COS |
| 域名 & SSL | ✅ | bistrotap.site + Let's Encrypt 免费 SSL，已配置完成 |
| 微信小程序真机 | 🔄 | 体验版需手机端打开调试；正式使用需等 ICP 备案完成 |
| ICP 备案 | 📋 | 腾讯云免费备案，周期 1-3 周，不影响海外服务器其他项目 |
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

# SSL 证书续期（自动执行，手动检查用）
sudo certbot renew --dry-run
```
