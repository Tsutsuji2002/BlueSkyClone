# VPS Deployment Steps - Database Migration Fix

## Problem Summary
- BookmarksCount compilation errors preventing backend build
- Missing LinkPreviews table and other tables in database
- Code had `?? 0` operators on non-nullable `int BookmarksCount`

## Solution Applied
1. Fixed BookmarksCount from `int?` to `int` in Post.cs model
2. Removed all `?? 0` operators from PostService.cs (4 locations)
3. Created comprehensive database reset script (`database_full_reset.sql`)
4. Created bash wrapper script (`reset-database.sh`)

## VPS Deployment Steps

### Step 1: Pull Latest Code
```bash
cd /var/www/BlueSkyClone
git fetch origin
git reset --hard origin/main
```

### Step 2: Verify BookmarksCount Fixes
```bash
# Check that PostService.cs no longer has BookmarksCount ?? 0
grep -n "BookmarksCount ?? 0" backend/Services/PostService.cs
# Should return: (no results)
```

### Step 3: Run Database Reset Script
```bash
# Make script executable
chmod +x reset-database.sh

# Run the database setup script
./reset-database.sh
```

This script will:
- Check if SQL Server container is running
- Create BlueSkyClone database if not exists
- Create all missing tables:
  - LinkPreviews
  - MessageReactions
  - Hashtags
  - PostHashtags
  - Labels
  - PageContents
  - RepoBlocks
  - Reports
  - SupportRequests
  - ListPosts
- Fix Posts.BookmarksCount (set default, make NOT NULL)
- Add missing PdsHost column to Users

### Step 4: Rebuild and Restart Backend
```bash
# Rebuild backend (should succeed now)
docker compose -f docker-compose.prod.yml build backend

# Restart backend
docker compose -f docker-compose.prod.yml up -d backend
```

### Step 5: Verify Deployment
```bash
# Check for errors (should be clean)
docker compose -f docker-compose.prod.yml logs backend --tail 100 | grep -i -E "error|fail" | grep -v "Executed DbCommand"

# Check specifically for LinkPreviews errors (should be none)
docker compose -f docker-compose.prod.yml logs backend --tail 200 | grep -B 5 "Invalid column\|Invalid object"

# Watch live logs
docker compose -f docker-compose.prod.yml logs -f backend
```

## What Was Fixed

### Code Changes
- `backend/Models/Post.cs`: `BookmarksCount` changed from `int?` to `int` with default value 0
- `backend/Services/PostService.cs`: Removed 4 instances of `BookmarksCount ?? 0`
  - Line 5904: `post.BookmarksCount + 1` (was `(post.BookmarksCount ?? 0) + 1`)
  - Line 5919: `bookmarksCount = post.BookmarksCount` (was `post.BookmarksCount ?? 0`)
  - Line 5923: `bookmarksCount = post.BookmarksCount` (was `post.BookmarksCount ?? 0`)
  - Line 7007: `BookmarksCount = post.BookmarksCount` (was `post.BookmarksCount ?? 0`)

### Database Changes
All changes are idempotent (safe to run multiple times):
- Creates 10 missing tables with proper foreign keys and indexes
- Fixes Posts.BookmarksCount column (NULL to NOT NULL with default)
- Adds PdsHost column to Users if missing

## Future Deployments

### For Next VPS Migration
The database setup is now automated. On a fresh VPS:

1. Clone repo
2. Run `docker compose -f docker-compose.prod.yml up -d`
3. Run `./reset-database.sh`
4. Backend will auto-apply EF migrations on startup via `Program.cs`

### Creating New EF Migrations
After the VPS is stable, create proper EF migrations on Windows:

```powershell
cd backend
dotnet ef migrations add AddLinkPreviewsAndMissingTables --context BSkyDbContext
```

Then commit and push the migration files so future deployments use EF migrations instead of SQL scripts.

## Troubleshooting

### If backend still fails to build:
```bash
# Check if code was actually pulled
git log --oneline -5
# Should show commits with "BookmarksCount" and "database reset"

# Force clean build
docker compose -f docker-compose.prod.yml build --no-cache backend
```

### If LinkPreviews errors persist:
```bash
# Verify table exists
docker exec -it bsky-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YourPassword' -C -Q "SELECT name FROM BlueSkyClone.sys.tables WHERE name = 'LinkPreviews'"

# If table doesn't exist, run reset script again
./reset-database.sh
```

### If BookmarksCount NULL errors persist:
```bash
# Manually fix the column
docker exec -it bsky-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YourPassword' -C -d BlueSkyClone -Q "UPDATE Posts SET BookmarksCount = 0 WHERE BookmarksCount IS NULL; ALTER TABLE Posts ALTER COLUMN BookmarksCount int NOT NULL;"
```

## Database Credentials
- Container: `bsky-db`
- Database: `BlueSkyClone`
- User: `sa`
- Password: `YourPassword`

## Expected Result
After successful deployment:
- Backend builds without errors
- No "Invalid object name 'LinkPreviews'" errors in logs
- No "Cannot insert NULL into BookmarksCount" errors
- Application processes firehose posts successfully
