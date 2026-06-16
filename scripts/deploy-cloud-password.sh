#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${SERVER_HOST:-110.42.216.97}"
SERVER_USER="${SERVER_USER:-ubuntu}"
SERVER_PASSWORD="${SERVER_PASSWORD:-}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/DM-sys}"
APP_NAME="${APP_NAME:-dm-sys}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
JWT_SECRET="${JWT_SECRET:-}"

WORKSPACE="${WORKSPACE:-$(cd "$(dirname "$0")/.." && pwd)}"
PACKAGE="${PACKAGE:-/private/tmp/dm-sys-production-deploy.tar.gz}"
REMOTE_SCRIPT="${REMOTE_SCRIPT:-/private/tmp/dm-remote-deploy.sh}"

if [[ -z "$SERVER_PASSWORD" || -z "$ADMIN_PASSWORD" || -z "$JWT_SECRET" ]]; then
  cat >&2 <<'ERROR'
Missing required environment variables.

Usage:
  SERVER_PASSWORD='ssh-password' \
  ADMIN_PASSWORD='initial-admin-password' \
  JWT_SECRET='at-least-32-random-characters' \
  ./scripts/deploy-cloud-password.sh
ERROR
  exit 1
fi

if ! command -v expect >/dev/null 2>&1; then
  echo "expect is required. macOS usually includes /usr/bin/expect." >&2
  exit 1
fi

run_expect() {
  local command="$1"
  expect <<EXPECT
set timeout -1
spawn -noecho $command
expect {
  -re "Are you sure you want to continue connecting.*" {
    send "yes\r"
    exp_continue
  }
  -re "(P|p)assword:" {
    send "$SERVER_PASSWORD\r"
    exp_continue
  }
  eof
}
catch wait result
exit [lindex \$result 3]
EXPECT
}

echo "Packing source..."
tar \
  --exclude='./.git' \
  --exclude='./.tmp-node-gyp' \
  --exclude='./node_modules' \
  --exclude='./backend/node_modules' \
  --exclude='./frontend/node_modules' \
  --exclude='./frontend/build' \
  --exclude='./backend/database.sqlite' \
  --exclude='./backend/uploads' \
  --exclude='./backend/.env' \
  --exclude='./*.xlsx' \
  --exclude='./*.tar.gz' \
  --exclude='./.DS_Store' \
  --exclude='./backend/.DS_Store' \
  --exclude='./frontend/.DS_Store' \
  -czf "$PACKAGE" \
  -C "$WORKSPACE" .

cat > "$REMOTE_SCRIPT" <<REMOTE_SCRIPT_CONTENT
#!/usr/bin/env bash
set -euo pipefail

REMOTE_DIR="$REMOTE_DIR"
APP_NAME="$APP_NAME"
ADMIN_USERNAME="$ADMIN_USERNAME"
ADMIN_PASSWORD="$ADMIN_PASSWORD"
JWT_SECRET="$JWT_SECRET"
SERVER_HOST="$SERVER_HOST"

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y curl nginx sqlite3 tar gzip build-essential python3 make g++

  if ! command -v node >/dev/null 2>&1 || [[ "\$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 18 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
elif command -v yum >/dev/null 2>&1; then
  yum install -y curl nginx sqlite tar gzip gcc-c++ make python3
  if ! command -v node >/dev/null 2>&1 || [[ "\$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 18 ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  fi
else
  echo "Unsupported server OS: apt-get or yum is required." >&2
  exit 1
fi

npm install -g pm2

mkdir -p "$REMOTE_DIR"
tar -xzf /tmp/dm-sys-production-deploy.tar.gz -C "$REMOTE_DIR"
mkdir -p "$REMOTE_DIR/backend/uploads"

if [[ ! -f "$REMOTE_DIR/backend/.env" ]]; then
  cat > "$REMOTE_DIR/backend/.env" <<ENV
NODE_ENV=production
PORT=3001
DATABASE_PATH=$REMOTE_DIR/backend/database.sqlite
UPLOAD_DIR=$REMOTE_DIR/backend/uploads
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD
CORS_ORIGIN=
ENV
fi

cd "$REMOTE_DIR/backend"
npm ci

cd "$REMOTE_DIR/frontend"
npm install
npm run build

cd "$REMOTE_DIR/backend"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start server.js --name "$APP_NAME" --update-env
fi
pm2 save

cat > /etc/nginx/conf.d/dm-sys.conf <<NGINX
server {
    listen 80;
    server_name $SERVER_HOST;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
nginx -t

if command -v systemctl >/dev/null 2>&1; then
  systemctl enable nginx
  systemctl reload nginx || systemctl restart nginx
else
  service nginx reload || service nginx restart
fi

echo "Deployment complete."
echo "URL: http://$SERVER_HOST"
echo "Username: $ADMIN_USERNAME"
REMOTE_SCRIPT_CONTENT

echo "Uploading package..."
run_expect "scp -o StrictHostKeyChecking=accept-new $PACKAGE $SERVER_USER@$SERVER_HOST:/tmp/dm-sys-production-deploy.tar.gz"

echo "Uploading remote deploy script..."
run_expect "scp -o StrictHostKeyChecking=accept-new $REMOTE_SCRIPT $SERVER_USER@$SERVER_HOST:/tmp/dm-remote-deploy.sh"

echo "Running remote deploy script with sudo..."
run_expect "ssh -o StrictHostKeyChecking=accept-new $SERVER_USER@$SERVER_HOST \"printf '%s\\n' '$SERVER_PASSWORD' | sudo -S bash /tmp/dm-remote-deploy.sh\""

echo
echo "Deployment complete."
echo "Open: http://$SERVER_HOST"
echo "Username: $ADMIN_USERNAME"
