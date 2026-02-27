# Deploying MegaDraw India on AWS EC2

## Prerequisites

- AWS account with EC2 access
- An Ubuntu 22.04+ EC2 instance (t2.micro works for demo)
- SSH key pair for the instance
- Security Group allowing inbound: **SSH (22)**, **HTTP (80)**, **HTTPS (443)**

## Step 1: Launch EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Choose **Ubuntu Server 22.04 LTS** AMI
3. Select **t2.micro** (free tier eligible)
4. Configure Security Group:
   - SSH (port 22) — your IP
   - HTTP (port 80) — 0.0.0.0/0
   - HTTPS (port 443) — 0.0.0.0/0
5. Create/select key pair, download `.pem` file
6. Launch instance

## Step 2: Connect to Instance

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<your-ec2-public-ip>
```

## Step 3: Run the Deployment Script

Upload and run the deployment script:

```bash
# From your local machine, copy the script
scp -i your-key.pem deploy.sh ubuntu@<your-ec2-public-ip>:~/

# SSH in and run
ssh -i your-key.pem ubuntu@<your-ec2-public-ip>
chmod +x deploy.sh
sudo ./deploy.sh
```

Or manually paste and run the commands below.

## Step 4: Manual Deployment (Alternative)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Clone your repo
cd /home/ubuntu
git clone <your-repo-url> lottery-site
cd lottery-site

# Setup environment
cp .env.example .env
nano .env  # Edit ADMIN_PASSWORD, SESSION_SECRET

# Install dependencies
npm install

# Start with PM2
pm2 start server.js --name "megadraw"
pm2 save
pm2 startup  # Follow the generated command

# Configure Nginx
sudo tee /etc/nginx/sites-available/megadraw << 'EOF'
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
EOF

sudo ln -sf /etc/nginx/sites-available/megadraw /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Step 5: Access Your Site

Open `http://<your-ec2-public-ip>` in your browser.

Admin panel: `http://<your-ec2-public-ip>/admin`

## Useful Commands

```bash
# View app logs
pm2 logs megadraw

# Restart app
pm2 restart megadraw

# Check status
pm2 status

# Update code
cd /home/ubuntu/lottery-site
git pull
npm install
pm2 restart megadraw
```
