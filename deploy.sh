#!/bin/bash

# BlueSky Deployment Script

echo "Starting deployment process..."

# 1. Pull latest changes (assuming you are in the project root)
# git pull origin bskyclone-deploy

# 2. Check for .env file
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file based on backend/.env.prod.example and frontend/.env.production"
    exit 1
fi

# 3. Export variables from .env
export $(grep -v '^#' .env | xargs)

# 4. Deploy with Docker Compose
echo "Building and starting containers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 5. Cleanup unused images
echo "Cleaning up..."
docker image prune -f

echo "Deployment complete! Application should be accessible."
