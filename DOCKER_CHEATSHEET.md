# Docker & Docker Compose Cheatsheet for BlueSky Project

Since you are using `docker-compose` to manage your project, these are the most essential commands you will use daily.

## 1. Managing the Application Lifecycle

### Start Everything
Start all services (Backend, Frontend, Redis) in the background (detached mode).
```bash
docker-compose up -d
```

### Stop Everything
Stop and remove all running containers, networks, and volumes defined in compose.
```bash
docker-compose down
```

### Stop and Start a Specific Service
Useful if you want to restart just the backend without touching the frontend.
```bash
docker-compose restart backend
```

## 2. Viewing Logs (Debugging)

### Follow All Logs
Stream logs from all services in real-time. Press `Ctrl+C` to exit.
```bash
docker-compose logs -f
```

### Follow Specific Service Logs
Stream logs only for the backend (highly recommended for C# debugging).
```bash
docker-compose logs -f backend
```
*Replace `backend` with `frontend` or `redis` as needed.*

## 3. Handling Code Changes

### Rebuild a Specific Service
If you change C# code or `Dockerfile` configurations, you often need to rebuild the image.
```bash
docker-compose up -d --build backend
```
*Note: For frontend changes, the hot-reloading usually handles it without a rebuild, unless you add new npm packages.*

## 4. Advanced / Troubleshooting

### "SSH" into a Container
Access the terminal inside a running container to check files or run manual commands.
```bash
docker-compose exec backend /bin/bash
```

### Check Running Containers
See what is currently running and their status/ports.
```bash
docker-compose ps
```

### Access Redis CLI
Directly interact with your Redis cache.
```bash
docker-compose exec redis redis-cli
```
*Then type commands like `KEYS *` or `FLUSHALL`.*

## 5. Cleaning Up (Free Disk Space)

### System Prune
**WARNING**: This deletes all stopped containers, unused networks, and dangling images. Use this if Docker is taking up too much space.
```bash
docker system prune
```
Add `-a` to remove unused images as well (will require re-downloading/re-building next time):
```bash
docker system prune -a
```
