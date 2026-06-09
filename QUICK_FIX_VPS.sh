#!/bin/bash
# Quick fix script for VPS - Run this to fix all database issues

echo "========================================"
echo "Quick Fix for VPS Database Issues"
echo "========================================"
echo ""

# Pull latest code
echo "Step 1: Pulling latest code..."
git fetch origin
git reset --hard origin/main
echo "✓ Code updated"
echo ""

# Make reset script executable
echo "Step 2: Making database reset script executable..."
chmod +x reset-database.sh
echo "✓ Script is executable"
echo ""

# Run database reset
echo "Step 3: Running database setup (this will add all missing columns)..."
./reset-database.sh
echo ""

# Rebuild backend
echo "Step 4: Rebuilding backend..."
docker compose -f docker-compose.prod.yml build backend
echo "✓ Backend rebuilt"
echo ""

# Restart backend
echo "Step 5: Restarting backend..."
docker compose -f docker-compose.prod.yml up -d backend
echo "✓ Backend restarted"
echo ""

# Wait a moment for startup
echo "Waiting 10 seconds for backend to start..."
sleep 10
echo ""

# Check for errors
echo "Step 6: Checking for errors..."
echo "========================================="
docker compose -f docker-compose.prod.yml logs backend --tail 100 | grep -i -E "error|fail" | grep -v "Executed DbCommand"
echo "========================================="
echo ""

echo "✓ Deployment complete!"
echo ""
echo "To watch live logs:"
echo "  docker compose -f docker-compose.prod.yml logs -f backend"
echo ""
echo "To check specific errors:"
echo "  docker compose -f docker-compose.prod.yml logs backend --tail 200 | grep -i 'Invalid'"
echo ""
