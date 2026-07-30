-- Fix 1-on-1 conversations that have isAccepted = false
-- These should always be accepted (no request flow for 1-on-1)

UPDATE Conversations
SET IsAccepted = 1
WHERE IsAccepted = 0
  AND (
    SELECT COUNT(*)
    FROM ConversationParticipants cp
    WHERE cp.ConversationId = Conversations.Id
  ) = 2;

-- Verify the fix
SELECT 
    c.Id,
    c.IsAccepted,
    COUNT(cp.UserId) as ParticipantCount,
    STRING_AGG(u.Handle, ', ') as Participants
FROM Conversations c
INNER JOIN ConversationParticipants cp ON c.Id = cp.ConversationId
INNER JOIN Users u ON cp.UserId = u.Id
WHERE c.IsDeleted = 0 OR c.IsDeleted IS NULL
GROUP BY c.Id, c.IsAccepted
HAVING COUNT(cp.UserId) = 2 AND c.IsAccepted = 0
ORDER BY c.CreatedAt DESC;
