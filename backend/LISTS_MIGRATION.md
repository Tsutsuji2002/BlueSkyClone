# Lists Migration: Remote User Lists Cleanup

## Overview

This migration removes old local database records for lists owned by **remote AT Protocol users** (users with DIDs that don't start with `did:local:`). 

**Why?** Remote users should have their lists stored entirely on their PDS (Personal Data Server), not in our local database. This aligns with AT Protocol's federated architecture.

## What Gets Cleaned Up

The migration removes:
1. **Lists** owned by remote users
2. **List Members** associated with those lists
3. **List Subscriptions** (pins) for those lists
4. **List Posts** associated with those lists

**Local users (did:local:) are NOT affected** - their lists remain in the database.

## How to Run

### Option 1: Preview First (Recommended)

Check what will be deleted without actually deleting:

```bash
curl -X GET "https://bskyclone.site/api/lists/migration/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response example:
```json
{
  "listsToRemove": 1,
  "membersToRemove": 3,
  "subscriptionsToRemove": 1,
  "postsToRemove": 0,
  "totalRecordsToRemove": 5
}
```

### Option 2: Run the Cleanup

```bash
curl -X POST "https://bskyclone.site/api/lists/migration/cleanup" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response example:
```json
{
  "success": true,
  "recordsRemoved": 5,
  "message": "Successfully cleaned up 5 records for remote user lists"
}
```

## After Migration

After running the cleanup:

1. **Remote users** will see their lists fetched directly from their PDS via AT Protocol
2. **Local users** will continue to see their lists from the local database as before
3. Creating new lists:
   - Remote users: Lists are created on their PDS only (no local storage)
   - Local users: Lists are created in both local database and local repository

## Deployment Steps

1. Build and deploy the updated backend
2. Run the migration stats endpoint to preview changes
3. Run the migration cleanup endpoint to remove old records
4. Verify remote users can see their lists (fetched from PDS)
5. Verify local users can still see their lists (from local database)

## Technical Details

- **Migration Service**: `ListMigrationService.cs`
- **Endpoints**: 
  - `GET /api/lists/migration/stats` - Preview cleanup
  - `POST /api/lists/migration/cleanup` - Execute cleanup
- **Detection Logic**: Checks if `Owner.Did` starts with `did:local:` to determine if user is local or remote
