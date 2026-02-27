#!/bin/bash
# =============================================
# MegaDraw India - EC2 Deployment Script
# Run as: sudo ./deploy.sh
# =============================================

set -e

echo "🎰 MegaDraw India - EC2 Setup"
echo "=============================="

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Clone repo (update URL)
REPO_URL="${1:-https://github.com/YOUR_USERNAME/lottery-site.git}"
APP_DIR="/home/ubuntu/lottery-site"

if [ -d "$APP_DIR" ]; then
  echo "📁 Updating existing installation..."
  cd "$APP_DIR"
  git pull
else
  echo "📁 Cloning repository..."
  cd /home/ubuntu
  git clone "$REPO_URL" lottery-site
  cd "$APP_DIR"
fi

# Setup environment
if [ ! -f .env ]; then
  cp .env.example .env
  # Generate random session secret
  SESSION_SECRET=$(openssl rand -hex 32)
  sed -i "s/your-secret-key-change-this/$SESSION_SECRET/" .env
  echo "⚠️  Created .env with auto-generated session secret."
  echo "⚠️  Please update ADMIN_PASSWORD in .env!"
fi

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install --production

# Start/restart with PM2
echo "🚀 Starting application with PM2..."
pm2 delete megadraw 2>/dev/null || true
pm2 start server.js --name "megadraw"
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

# Configure Nginx
echo "🔧 Configuring Nginx..."
cat > /etc/nginx/sites-available/megadraw << 'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/megadraw /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo ""
echo "✅ Deployment complete!"
echo "🌐 Site: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '<your-ec2-public-ip>')"
echo "🔐 Admin: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '<your-ec2-public-ip>')/admin"
echo ""
echo "⚠️  Don't forget to update ADMIN_PASSWORD in $APP_DIR/.env"
