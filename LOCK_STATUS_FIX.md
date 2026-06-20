# Lock/Unlock Status Sync Fix

## Problem
After locking or unlocking a group chat, the lock button UI in `GroupChatSettingsPanel` remained gray instead of showing the red background (`#FEE7EC`) with red icon (`#CA123D`) when locked.

## Root Cause
The conversation object in Redux state was not being refreshed after the lock/unlock API call succeeded. The sequence was:

1. User clicks lock/unlock button
2. Frontend calls backend API (`/api/chat/conversations/{id}/lock` or `/unlock`)
3. Backend successfully calls AT Protocol (`chat.bsky.convo.lockConvo` or `unlockConvo`)
4. **BUT** the conversation object in Redux store still had the old `locked` value
5. The `GroupChatSettingsPanel` component's `conversation.locked` prop never updated
6. The `useEffect` that syncs local state with `conversation.locked` never triggered

## AT Protocol Details
- AT Protocol returns `lockStatus: "locked"` (string) not `locked: true` (boolean)
- Backend `BlueskyConvo` class correctly has `LockStatus` property as `string?`
- Backend `MapToConversationDto` correctly converts: `convo.LockStatus == "locked"` → `Locked: true`
- Backend `ConversationDto` has `Locked` as `bool` property

## Solution
After successful lock/unlock API call, dispatch `fetchConversationById(conversationId)` to refetch the conversation from the backend and update Redux state with the latest `locked` status.

### Changes Made

**File: `frontend/src/components/chat/GroupChatSettingsPanel.tsx`**

1. Added import: `import { fetchConversationById } from '../../redux/slices/messagesSlice';`

2. Updated `confirmLock` function:
```typescript
const confirmLock = async () => {
    // ... API call ...
    if (!response.ok) throw new Error(...);
    
    // NEW: Refetch conversation to get updated locked status
    await dispatch(fetchConversationById(conversation.id));
    
    dispatch(showToast({ message: 'Group chat locked', type: 'success' }));
    onLockToggle(true);
};
```

3. Updated `handleUnlock` function:
```typescript
const handleUnlock = async () => {
    // ... API call ...
    if (!response.ok) throw new Error(...);
    
    // NEW: Refetch conversation to get updated locked status
    await dispatch(fetchConversationById(conversation.id));
    
    dispatch(showToast({ message: 'Group chat unlocked', type: 'success' }));
    onLockToggle(false);
};
```

**Note:** `ChatPage.tsx` already had `fetchConversationById` in its unlock handler, so no changes needed there.

## Data Flow After Fix

1. User clicks lock button → Shows confirm modal
2. User confirms → `confirmLock()` executes
3. Backend API call: `POST /api/chat/conversations/{id}/lock`
4. Backend calls AT Protocol: `chat.bsky.convo.lockConvo`
5. AT Protocol updates chat and returns `lockStatus: "locked"`
6. **NEW:** Frontend dispatches `fetchConversationById(conversationId)`
7. Backend `GetConversation` endpoint fetches from AT Protocol
8. Backend maps `lockStatus: "locked"` → `Locked: true` in DTO
9. Redux store updates conversation object with `locked: true`
10. `GroupChatSettingsPanel` receives updated `conversation` prop
11. `useEffect([conversation.locked])` triggers
12. Local `isLocked` state updates to `true`
13. Button renders with red background and red icon ✓

## Testing Instructions

### Before Deployment
```bash
cd frontend
npm run build
```

### After Deployment on VPS
1. Navigate to a group chat
2. Open group chat settings
3. Click "Lock" button
4. Confirm lock action
5. **Expected:** Button should immediately show:
   - Red/pink background (`#FEE7EC`)
   - Red lock icon (`#CA123D`)
   - "Locked" label
6. Click the locked button to unlock
7. **Expected:** Button should immediately show:
   - Gray background
   - Gray lock icon
   - "Lock" label

### Browser Console Check
Open browser DevTools console and look for:
```
[GroupChatSettingsPanel] conversation.locked: true  // when locked
[GroupChatSettingsPanel] conversation.locked: false // when unlocked
```

## Related Files
- `backend/Services/ChatProxyService.cs` - Line 624: `MapToConversationDto` with `lockStatus` → `locked` conversion
- `backend/Services/ChatProxyService.cs` - Line 738: `BlueskyConvo.LockStatus` property
- `backend/DTOs/ChatDtos.cs` - Line 11: `ConversationDto` with `Locked` property
- `backend/Controllers/ChatController.cs` - Line 40-47: `GetConversation` endpoint
- `frontend/src/redux/slices/messagesSlice.ts` - Line 54-68: `fetchConversationById` thunk
- `frontend/src/redux/slices/messagesSlice.ts` - Line 450-457: Redux reducer for updating conversation
- `frontend/src/components/chat/GroupChatSettingsPanel.tsx` - Lock/unlock handlers
- `frontend/src/pages/ChatPage.tsx` - Line 1160-1175: Lock banner with unlock button

## Deployment
After pulling the latest changes:
```bash
git pull origin main
./deploy.sh
```

The deploy script will:
1. Build backend with latest changes
2. Build frontend with latest changes
3. Restart Docker containers with updated code
