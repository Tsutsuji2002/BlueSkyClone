#!/bin/bash

# BlueSky Deployment Script

echo "Starting deployment process..."

# 1. Pull latest changes
git pull origin bskyclone-deploy

# 2. Check for .env file
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file based on backend/.env.prod.example and frontend/.env.production"
    exit 1
fi

# 3. Export variables from .env
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo "Error: .env file not found!"
    exit 1
fi

# 4. Ensure upload directories exist and have correct permissions
# The .NET container runs as user 'app' (UID 1654)
echo "Fixing upload directory permissions..."
mkdir -p backend/wwwroot/uploads/posts
mkdir -p backend/wwwroot/uploads/covers
mkdir -p backend/wwwroot/uploads/avatars
sudo chown -R 1654:1654 backend/wwwroot/uploads

# 5. SSL Certificate Check and Generation
echo "Checking for SSL certificates for $DOMAIN_NAME..."
if [ ! -d "./certbot/conf/live/$DOMAIN_NAME" ]; then
    echo "Certificates not found. Generating dummy certificates to allow Nginx to start..."
    mkdir -p "./certbot/conf/live/$DOMAIN_NAME"
    mkdir -p "./certbot/www"
    
    # Generate dummy certificate
    sudo openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
        -keyout "./certbot/conf/live/$DOMAIN_NAME/privkey.pem" \
        -out "./certbot/conf/live/$DOMAIN_NAME/fullchain.pem" \
        -subj "/CN=localhost"

    # Download recommended SSL parameters if missing
    if [ ! -f "./certbot/conf/options-ssl-nginx.conf" ]; then
        curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "./certbot/conf/options-ssl-nginx.conf"
        curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "./certbot/conf/ssl-dhparams.pem"
    fi

    echo "Starting containers with dummy certificates..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --force-recreate

    echo "Requesting real certificates from Let's Encrypt..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN_NAME

    echo "Reloading Nginx with real certificates..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml exec frontend nginx -s reload
else
    echo "Certificates found. Standard deployment..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --force-recreate
fi

# 5. Cleanup unused images
echo "Cleaning up..."
docker image prune -f

echo "Deployment complete! Application should be accessible."
