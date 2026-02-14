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
export $(grep -v '^#' .env | xargs)

# 4. Ensure upload directories exist and have correct permissions
# The .NET container runs as user 'app' (UID 1654)
echo "Fixing upload directory permissions..."
mkdir -p backend/wwwroot/uploads/posts
sudo chown -R 1654:1654 backend/wwwroot/uploads

# 5. Deploy with Docker Compose
echo "Building and starting containers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 5. Cleanup unused images
echo "Cleaning up..."
docker image prune -f

echo "Deployment complete! Application should be accessible."
