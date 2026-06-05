#!/bin/bash
# ============================================================
# 服务器初始化脚本 — 在轻量云服务器上执行（Ubuntu/Debian）
# ============================================================
set -e

echo "=== 1. 安装 Docker ==="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
fi

echo "=== 2. 安装 Nginx ==="
apt-get update && apt-get install -y nginx certbot python3-certbot-nginx

echo "=== 3. 创建项目目录 ==="
mkdir -p /opt/restaurant-finance
cp -r . /opt/restaurant-finance/

echo "=== 4. 配置 SSL 证书 ==="
# 先停止 nginx（certbot standalone 模式需要 80 端口空闲）
systemctl stop nginx
certbot certonly --standalone -d YOUR_DOMAIN.com --agree-tos --email YOUR_EMAIL@example.com

echo "=== 5. 部署 Nginx SSL 配置 ==="
cp deploy/nginx-ssl.conf /etc/nginx/sites-available/restaurant-finance
sed -i 's/YOUR_DOMAIN.com/你的实际域名/g' /etc/nginx/sites-available/restaurant-finance
ln -sf /etc/nginx/sites-available/restaurant-finance /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 创建 certbot 验证目录
mkdir -p /var/www/certbot

nginx -t && systemctl start nginx

echo "=== 6. 配置 .env（请手动编辑填入实际值） ==="
echo "请编辑 /opt/restaurant-finance/.env，填入 COS 凭证和 JWT 密钥"
echo "  COS_SECRET_ID=..."
echo "  COS_SECRET_KEY=..."
echo "  COS_BUCKET=..."
echo "  COS_REGION=..."
echo "  JWT_ACCESS_SECRET=..."
echo "  JWT_REFRESH_SECRET=..."

echo "=== 7. 启动服务 ==="
cd /opt/restaurant-finance
docker compose up -d --build

echo "=== 部署完成！ ==="
echo "访问 https://YOUR_DOMAIN.com 验证 Web 前端"
echo "API 地址: https://YOUR_DOMAIN.com/api/v1"
echo ""
echo "=== 后续步骤 ==="
echo "1. 微信小程序后台配置 request 合法域名: https://YOUR_DOMAIN.com"
echo "2. 更新 miniapp/utils/config.js 中 PROD_DOMAIN 为实际域名"
echo "3. 配置 SSL 证书自动续签: certbot renew --dry-run"
