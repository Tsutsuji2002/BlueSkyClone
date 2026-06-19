# Group Chat Settings Implementation Guide

## Components Created

1. **GroupChatSettingsModal.tsx** - Main settings modal with all features
2. **EditGroupNameModal.tsx** - Modal for renaming groups

## Features Implemented

### 1. Mute Button
- Toggle mute/unmute for the group chat
- Icon changes between FiBell and FiBellOff
- No confirmation needed

### 2. Edit Name Button
- Opens EditGroupNameModal
- Syncs group name with Bluesky network via API
- Shows success/error toast

### 3. Invite Link Button
- Opens existing InviteLinkModal component
- Reuses the invite link feature already implemented

### 4. Lock Button
- Shows confirmation modal when locking
- No confirmation when unlocking
- Updates group lock status via API

### 5. Leave Button
- Shows confirmation modal with warning message
- Explains that leaving locks the chat permanently
- Navigates away after confirmation

### 6. Members Section
- Shows all participants with avatars
- "Admin" badge for first member
- "Follow" button for non-followed members
- "Added by" text for non-admin members
- Three-dot menu button for member options
- "Add members" button at top

## Backend API Endpoints Needed

Add these to ChatController.cs:

```csharp
// Update group name
[HttpPut("conversations/{conversationId}/name")]
public async Task<IActionResult> UpdateGroupName(string conversationId, [FromBody] UpdateGroupNameRequest request)
{
    // Call ChatProxyService to update name via Bluesky API
}

// Toggle mute
[HttpPost("conversations/{conversationId}/mute")]
public async Task<IActionResult> ToggleMute(string conversationId)
{
    // Implement mute logic (could be local preference)
}

// Lock/unlock conversation
[HttpPost("conversations/{conversationId}/lock")]
public async Task<IActionResult> LockConversation(string conversationId, [FromBody] LockRequest request)
{
    // Call ChatProxyService to lock via Bluesky API
}
```

## Integration Steps

### Step 1: Add state to ChatPage.tsx

```typescript
const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
```

### Step 2: Add button to header (replace "..." button for group chats)

```typescript
{isGroup ? (
    <button
        onClick={() => setIsGroupSettingsOpen(true)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
    >
        <FiMoreHorizontal size={20} />
    </button>
) : (
    // existing options menu button
)}
```

### Step 3: Add modal at bottom of ChatPage

```typescript
import GroupChatSettingsModal from '../components/modals/GroupChatSettingsModal';

// In JSX before closing fragment:
{isGroup && conversation && (
    <GroupChatSettingsModal
        isOpen={isGroupSettingsOpen}
        onClose={() => setIsGroupSettingsOpen(false)}
        conversation={conversation}
        currentUser={currentUser!}
        onMuteToggle={() => {
            // Call API to toggle mute
        }}
        onLockToggle={(locked) => {
            // Call API to lock/unlock
        }}
        onLeave={() => {
            // Call API to leave group
            navigate('/messages');
        }}
        onAddMembers={() => {
            setIsGroupSettingsOpen(false);
            setIsAddPeopleOpen(true);
        }}
    />
)}
```

## Next Steps

1. Implement backend API endpoints
2. Add ChatProxyService methods for Bluesky API calls
3. Test all features
4. Add member context menu functionality later (as requested)

## Notes

- All modals follow Bluesky's design with proper dark mode support
- Confirmation modals use the existing ConfirmModal component
- Toast notifications for success/error feedback
- Proper loading states for API calls
- Accessibility labels on all buttons
