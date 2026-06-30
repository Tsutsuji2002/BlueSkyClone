#!/bin/bash

echo "=== BlueSky Deployment Diagnostics ==="
echo ""

echo "1. Checking Docker containers status..."
docker-compose ps
echo ""

echo "2. Checking frontend container logs (last 50 lines)..."
docker-compose logs --tail=50 frontend
echo ""

echo "3. Checking backend container logs (last 50 lines)..."
docker-compose logs --tail=50 backend
echo ""

echo "4. Checking if frontend build files exist..."
docker exec blueskyclone-frontend-1 ls -lh /usr/share/nginx/html/ 2>/dev/null || echo "Frontend container not running or path doesn't exist"
echo ""

echo "5. Checking nginx configuration..."
docker exec blueskyclone-frontend-1 nginx -t 2>/dev/null || echo "Frontend container not running"
echo ""

echo "6. Testing backend API endpoint..."
curl -v http://localhost:5000/api/auth/handshake 2>&1 | grep -E "HTTP|Connection"
echo ""

echo "7. Testing frontend access..."
curl -I http://localhost:3000 2>&1 | grep -E "HTTP|Server"
echo ""

echo "8. Checking environment variables in frontend container..."
docker exec blueskyclone-frontend-1 sh -c 'cat /usr/share/nginx/html/static/js/main.*.js | grep -o "API_BASE_URL.*" | head -1' 2>/dev/null || echo "Could not check API URL in bundle"
echo ""

echo "=== Diagnostics Complete ==="
