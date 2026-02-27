#!/bin/bash
# =============================================
# MegaDraw India - Full EC2 Deployment Script
# 
# Usage: Copy this entire script to your EC2
#        instance and run:
#        chmod +x deploy.sh && sudo ./deploy.sh
#
# Tested on: Ubuntu 22.04 LTS (t2.micro)
# =============================================

set -e

REPO_URL="https://github.com/albertcyriac04-lgtm/lottery_scam.git"
APP_DIR="/home/ubuntu/lottery-site"
APP_NAME="megadraw"
NODE_VERSION="20"

echo ""
echo "================================================"
echo "  🎰 MegaDraw India - EC2 Deployment"
echo "================================================"
echo ""

# ---- STEP 1: System Update ----
echo "📦 [1/7] Updating system packages..."
apt update -y && apt upgrade -y
echo "✅ System updated."
echo ""

# ---- STEP 2: Install Node.js ----
echo "📦 [2/7] Installing Node.js ${NODE_VERSION}.x..."
if command -v node &> /dev/null; then
  echo "   Node.js already installed: $(node -v)"
else
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt install -y nodejs
  echo "   Installed Node.js: $(node -v)"
  echo "   Installed npm: $(npm -v)"
fi
echo "✅ Node.js ready."
echo ""

# ---- STEP 3: Install PM2 ----
echo "📦 [3/7] Installing PM2 process manager..."
if command -v pm2 &> /dev/null; then
  echo "   PM2 already installed."
else
  npm install -g pm2
fi
echo "✅ PM2 ready."
echo ""

# ---- STEP 4: Install Nginx ----
echo "📦 [4/7] Installing Nginx..."
if command -v nginx &> /dev/null; then
  echo "   Nginx already installed."
else
  apt install -y nginx
fi
systemctl enable nginx
echo "✅ Nginx ready."
echo ""

# ---- STEP 5: Clone/Update Application ----
echo "📦 [5/7] Setting up application..."
if [ -d "$APP_DIR" ]; then
  echo "   Existing installation found. Pulling latest code..."
  cd "$APP_DIR"
  git pull origin main
else
  echo "   Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# Setup environment variables
if [ ! -f .env ]; then
  cp .env.example .env
  # Generate a secure random session secret
  SESSION_SECRET=$(openssl rand -hex 32)
  sed -i "s/your-secret-key-change-this/$SESSION_SECRET/" .env
  # Set a stronger default admin password
  ADMIN_PASS=$(openssl rand -base64 12)
  sed -i "s/admin123/$ADMIN_PASS/" .env
  echo ""
  echo "   ⚠️  Generated .env file with:"
  echo "   ────────────────────────────────────"
  echo "   Admin Username: admin"
  echo "   Admin Password: $ADMIN_PASS"
  echo "   ────────────────────────────────────"
  echo "   📌 SAVE THESE CREDENTIALS!"
  echo ""
else
  echo "   .env already exists, keeping current config."
fi

# Install dependencies
echo "   Installing npm dependencies..."
npm install --production
echo "✅ Application ready."
echo ""

# ---- STEP 6: Start Application with PM2 ----
echo "🚀 [6/7] Starting application..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start server.js --name "$APP_NAME" --env production
pm2 save

# Auto-restart on reboot
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
echo "✅ Application running on port 3000."
echo ""

# ---- STEP 7: Configure Nginx Reverse Proxy ----
echo "🔧 [7/7] Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/$APP_NAME << 'NGINX_CONF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_CONF

# Enable site, remove default
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
echo "✅ Nginx configured."
echo ""

# ---- DONE ----
PUBLIC_IP=$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "<your-ec2-public-ip>")

echo ""
echo "================================================"
echo "  ✅ DEPLOYMENT COMPLETE!"
echo "================================================"
echo ""
echo "  🌐 Website:     http://$PUBLIC_IP"
echo "  🔐 Admin Panel: http://$PUBLIC_IP/admin"
echo ""
echo "  📁 App Directory: $APP_DIR"
echo "  📋 Logs:          pm2 logs $APP_NAME"
echo "  🔄 Restart:       pm2 restart $APP_NAME"
echo "  📊 Status:        pm2 status"
echo ""
echo "================================================"
echo ""
echo "  🔒 IMPORTANT: Save your admin credentials!"
echo "     Edit $APP_DIR/.env to change them."
echo ""
echo "  📌 Useful commands:"
echo "     pm2 logs $APP_NAME    - View live logs"
echo "     pm2 restart $APP_NAME - Restart the app"
echo "     pm2 monit             - Monitor CPU/RAM"
echo ""
echo "================================================"
