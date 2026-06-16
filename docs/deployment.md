# DM System Cloud Deployment

This guide deploys the system as one Node.js service behind Nginx. Express serves both `/api` and the built React frontend.

## 1. Server Requirements

- Ubuntu 22.04 or 24.04
- Node.js 20 LTS
- npm
- PM2
- Nginx

Open firewall ports `80` and `443`. Keep backend port `3001` private to the server.

## 2. Upload Or Clone Code

Recommended path:

```bash
sudo mkdir -p /var/www/DM-sys
sudo chown -R $USER:$USER /var/www/DM-sys
cd /var/www/DM-sys
git clone <your-github-repo-url> .
```

Do not commit or upload `node_modules`, `frontend/build`, `backend/.env`, `backend/database.sqlite`, or `backend/uploads` to GitHub.

## 3. Configure Backend

```bash
cd /var/www/DM-sys/backend
cp .env.example .env
nano .env
```

Set strong values:

```env
NODE_ENV=production
PORT=3001
DATABASE_PATH=/var/www/DM-sys/backend/database.sqlite
UPLOAD_DIR=/var/www/DM-sys/backend/uploads
JWT_SECRET=<at-least-32-random-characters>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-initial-password>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=
```

The first administrator is created automatically only when the user table is empty.

## 4. Install And Build

```bash
cd /var/www/DM-sys/backend
npm ci

cd /var/www/DM-sys/frontend
npm ci
npm run build
```

## 5. Start With PM2

```bash
cd /var/www/DM-sys/backend
pm2 start server.js --name dm-sys --env production
pm2 save
pm2 startup
```

Useful commands:

```bash
pm2 logs dm-sys
pm2 restart dm-sys
pm2 status
```

## 6. Configure Nginx

Create `/etc/nginx/sites-available/dm-sys`:

```nginx
server {
    listen 80;
    server_name your-domain-or-server-ip;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/dm-sys /etc/nginx/sites-enabled/dm-sys
sudo nginx -t
sudo systemctl reload nginx
```

Visit `http://your-domain-or-server-ip` and log in with the initial admin credentials.

## 7. Backup

Back up both the SQLite database and uploads directory.

```bash
mkdir -p /var/backups/dm-sys
sqlite3 /var/www/DM-sys/backend/database.sqlite ".backup '/var/backups/dm-sys/database-$(date +%Y%m%d-%H%M%S).sqlite'"
tar -czf /var/backups/dm-sys/uploads-$(date +%Y%m%d-%H%M%S).tar.gz -C /var/www/DM-sys/backend uploads
```

If `sqlite3` is not installed:

```bash
sudo apt install sqlite3
```

For very small installations, you can also stop PM2 briefly before copying the database file:

```bash
pm2 stop dm-sys
cp /var/www/DM-sys/backend/database.sqlite /var/backups/dm-sys/database.sqlite
pm2 start dm-sys
```

## 8. Restore

```bash
pm2 stop dm-sys
cp /var/backups/dm-sys/database.sqlite /var/www/DM-sys/backend/database.sqlite
tar -xzf /var/backups/dm-sys/uploads.tar.gz -C /var/www/DM-sys/backend
pm2 start dm-sys
```

## 9. Update Deployment

```bash
cd /var/www/DM-sys
git pull

cd backend
npm ci

cd ../frontend
npm ci
npm run build

pm2 restart dm-sys
```
