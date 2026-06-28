# Group Chat Reply Debugging Guide

## Current Status
- ✅ Replies show immediately after sending (via SignalR/optimistic UI)
- ❌ Replies disappear after page refresh
- ❌ Reply relationship not persisting in Bluesky

## What We've Changed
1. Updated reply format sent to Bluesky to use `{ root: {id, rev}, parent: {id, rev} }`
2. Added comprehensive logging to track the flow
3. Added reply hydration logic

## What To Check Next

### Step 1: Check What We're Sending to Bluesky
After deploying, send a reply and look for this log:
```
[SendMessageAsync] Sending to Bluesky: {"convoId":"...","message":{"text":"...","reply":{"root":{"id":"...","rev":"..."},"parent":{"id":"...","rev":"..."}}}}
```

**What to verify:**
- ✓ The reply structure is present
- ✓ The id and rev values are not null
- ✓ The structure matches Bluesky's expected format

### Step 2: Check Bluesky's Response
Look for this log:
```
[SendMessageAsync] Bluesky Response: {full JSON response}
```

**What to check:**
- Does the response include a `reply` or `replyTo` field?
- Does it have the structure we expect?
- Is Bluesky accepting our format?

### Step 3: Check Message Fetching
After refresh, when messages are loaded, look for:
```
[MapToMessageDto] Mapping message {id}, HasReply: {true/false}, HasReplyTo: {true/false}
```

**Critical question:** Are replies present in the `getMessages` response?

## Possible Root Causes

### Cause 1: Wrong Send Format
**Symptom:** Bluesky returns error or doesn't include reply in response
**Solution:** Adjust the reply structure format

### Cause 2: Bluesky Doesn't Return Replies in getMessages
**Symptom:** `HasReply: false, HasReplyTo: false` in all mapped messages
**Solution:** Need to fetch reply information separately or use a different endpoint

### Cause 3: Field Name Mismatch
**Symptom:** Bluesky uses different field names than we expect
**Solution:** Update `BlueskyMessage` model and mapping logic

### Cause 4: Reply Not Supported for Group Chats
**Symptom:** Everything looks correct but Bluesky simply doesn't support it
**Solution:** Implement custom reply tracking in our database

## How to Get Logs

### Option 1: Docker Logs
```bash
docker logs blueskyclone-backend-1 --tail 100 -f
```

### Option 2: Console Output
If running locally, logs will appear in the console

### Option 3: Application Insights / Logging Service
Check your configured logging destination

## What Logs to Share

When you test, please share:

1. **Send Message Request** (what we send to Bluesky)
2. **Send Message Response** (what Bluesky returns)
3. **Get Messages Response** (after refresh, what messages look like)
4. **Mapping Logs** (HasReply, HasReplyTo values)

## Quick Test Script

```bash
# 1. Deploy the updated backend
docker-compose up -d --build backend

# 2. Watch logs
docker logs blueskyclone-backend-1 --tail 100 -f

# 3. In browser:
# - Open group chat
# - Reply to a message
# - Watch the logs for [SendMessageAsync]
# - Refresh the page
# - Watch the logs for [MapToMessageDto]

# 4. Share the log output
```

## Alternative: Manual Reply Tracking

If Bluesky doesn't support replies in group chats, we can implement our own:

### Database Table: MessageReplies
```sql
CREATE TABLE MessageReplies (
    MessageId VARCHAR(255) PRIMARY KEY,
    ReplyToMessageId VARCHAR(255),
    ConversationId VARCHAR(255),
    CreatedAt DATETIME,
    INDEX idx_conversation (ConversationId),
    INDEX idx_replyto (ReplyToMessageId)
);
```

### Save Reply Locally
When sending a message with a reply:
1. Send to Bluesky (may or may not save reply)
2. Save reply relationship in our database
3. When fetching messages, join with our reply table
4. Hydrate ReplyTo from our records

### Pros:
- ✅ Guaranteed to work
- ✅ Works even if Bluesky API changes
- ✅ Can add custom reply features

### Cons:
- ❌ Extra database table
- ❌ Need to sync if users use official Bluesky app
- ❌ More complex code

## Next Steps

1. **Deploy the logging changes**
2. **Test sending a reply**
3. **Collect the logs showing:**
   - What we send to Bluesky
   - What Bluesky returns
   - What we get when fetching messages
4. **Share the logs** so we can identify the exact issue
5. **Implement the fix** based on what the logs reveal

Without the actual logs, we're guessing. The logs will tell us exactly what's happening!
