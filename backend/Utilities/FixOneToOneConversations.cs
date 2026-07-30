using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BSkyClone.Utilities;

public static class FixOneToOneConversations
{
    /// <summary>
    /// Fixes existing 1-on-1 conversations that have IsAccepted = false
    /// These should always be accepted (no request flow for 1-on-1 chats)
    /// </summary>
    public static async Task Run(IServiceProvider services)
    {
        var db = services.GetRequiredService<BSkyDbContext>();
        var logger = services.GetRequiredService<ILogger<Program>>();

        logger.LogInformation("Starting fix for 1-on-1 conversations with IsAccepted = false...");

        try
        {
            // Find all 1-on-1 conversations (exactly 2 participants) with IsAccepted = false
            var conversationsToFix = await db.Conversations
                .Include(c => c.ConversationParticipants)
                .ThenInclude(cp => cp.User)
                .Where(c => c.IsAccepted == false && (c.IsDeleted == false || c.IsDeleted == null))
                .ToListAsync();

            var oneToOneConversations = conversationsToFix
                .Where(c => c.ConversationParticipants.Count == 2)
                .ToList();

            if (oneToOneConversations.Count == 0)
            {
                logger.LogInformation("No 1-on-1 conversations found with IsAccepted = false. Database is clean.");
                return;
            }

            logger.LogInformation("Found {Count} 1-on-1 conversations with IsAccepted = false", oneToOneConversations.Count);

            foreach (var conversation in oneToOneConversations)
            {
                var participants = string.Join(", ", conversation.ConversationParticipants.Select(p => p.User?.Handle ?? p.UserId.ToString()));
                logger.LogInformation("Fixing conversation {ConvId} between {Participants}", conversation.Id, participants);
                
                conversation.IsAccepted = true;
            }

            var updatedCount = await db.SaveChangesAsync();
            logger.LogInformation("Successfully updated {Count} 1-on-1 conversations to IsAccepted = true", updatedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fixing 1-on-1 conversations");
            throw;
        }
    }
}
