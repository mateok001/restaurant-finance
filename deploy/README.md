# 部署指南 — Restaurant Finance

## 前置条件

- 轻量云服务器（Linux Ubuntu/Debian，内存 ≥ 2GB 推荐）
- 已安装 Docker + Docker Compose
- 腾讯云 COS 存储桶（已配置）
- （可选）已备案域名 + DNS 解析到服务器 IP

## 部署步骤

### 1. 上传项目到服务器

```bash
# 在本地打包（不含 node_modules）
tar -czf restaurant-finance.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.claude' \
    restaurant-finance/

# 上传到服务器
scp restaurant-finance.tar.gz root@你的服务器IP:/opt/
```

### 2. 服务器初始化

```bash
ssh root@你的服务器IP

# 解压
cd /opt
tar -xzf restaurant-finance.tar.gz
cd restaurant-finance

# 安装 Docker（如果还没有）
curl -fsSL https://get.docker.com | bash
systemctl enable docker && systemctl start docker
```

### 3. 确认 .env 配置

检查 `.env` 文件中的 COS 凭证和 JWT 密钥是否正确：

```bash
cat .env
```

### 4. 启动服务

```bash
docker compose up -d --build
```

### 5. 验证

```bash
# 检查容器状态
docker compose ps

# 访问 Web 前端
curl http://localhost:3000

# 访问 API
curl http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 6. （可选）配置域名 + SSL

当你有了域名并解析到服务器 IP 后：

```bash
# 复制 SSL Nginx 配置
cp deploy/nginx-ssl.conf /etc/nginx/sites-available/restaurant-finance

# 替换域名占位符
sed -i 's/YOUR_DOMAIN.com/你的实际域名/g' /etc/nginx/sites-available/restaurant-finance

# 启用站点
ln -sf /etc/nginx/sites-available/restaurant-finance /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 申请 SSL 证书
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d 你的域名.com

# 重载 Nginx
nginx -t && systemctl reload nginx
```

### 7. （可选）微信小程序上线

1. 在 `miniapp/utils/config.js` 中设置 `PROD_DOMAIN = 'https://你的域名.com'`
2. 在微信公众平台 → 开发管理 → 开发设置 → 服务器域名：
   - `request 合法域名`: `https://你的域名.com`
   - `uploadFile 合法域名`: `https://mkes001-backup-1304664505.cos.ap-seoul.myqcloud.com`
3. 用微信开发者工具上传代码，提交审核

### 8. 数据库备份（推荐）

```bash
# 添加 cron 每天备份 SQLite 到 COS
(crontab -l 2>/dev/null; echo "0 3 * * * docker exec rf-server cp /app/prisma/data/restaurant_finance.db /tmp/backup-\$(date +\%Y\%m\%d).db") | crontab -
```

## 常用命令

```bash
# 查看日志
docker compose logs -f server
docker compose logs -f web

# 重启服务
docker compose restart

# 更新代码后重新构建
docker compose up -d --build

# 进入数据库（需要先装 sqlite3）
docker exec -it rf-server sqlite3 /app/prisma/data/restaurant_finance.db
```

## 默认账户

部署后需要先 seed 管理员账户（如果没有数据）：

| 角色 | 用户名 | 密码 |
|------|--------|------|
| admin | admin | admin123 |

> 如果数据库是空的，需要先 `docker exec rf-server npm run prisma:seed`
