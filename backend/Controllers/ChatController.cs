using BSkyClone.DTOs;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations()
    {
        var userId = GetUserId();
        var conversations = await _chatService.GetConversationsAsync(userId);
        return Ok(conversations);
    }

    [HttpGet("conversations/{id}")]
    public async Task<IActionResult> GetConversation(string id)
    {
        var userId = GetUserId();
        if (!Guid.TryParse(id, out var conversationId))
        {
            return BadRequest(new { message = "Invalid conversation ID format." });
        }

        var conversation = await _chatService.GetConversationAsync(userId, conversationId);
        if (conversation == null)
        {
            return NotFound(new { message = "Conversation not found or access denied." });
        }

        return Ok(conversation);
    }

    [HttpPost("conversations/{id}/read")]
    public async Task<IActionResult> MarkAsRead(string id)
    {
        var userId = GetUserId();
        if (!Guid.TryParse(id, out var conversationId))
        {
            return BadRequest(new { message = "Invalid conversation ID format." });
        }

        await _chatService.MarkAsReadAsync(userId, conversationId);
        return Ok();
    }

    [HttpGet("conversations/{id}/messages")]
    public async Task<IActionResult> GetMessages(string id, [FromQuery] int limit = 50, [FromQuery] DateTimeOffset? before = null)
    {
        var userId = GetUserId();
        if (!Guid.TryParse(id, out var convId))
        {
            return BadRequest(new { message = "Invalid conversation ID format." });
        }

        try
        {
            var messages = await _chatService.GetConversationMessagesAsync(userId, convId, limit, before);
            return Ok(messages);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Incremental sync — mimics chat.bsky.convo.getLog.
    /// Returns only messages after `cursor` (Tid of last known message).
    /// </summary>
    [HttpGet("conversations/{id}/log")]
    public async Task<IActionResult> GetLog(string id, [FromQuery] string? cursor = null)
    {
        var userId = GetUserId();
        if (!Guid.TryParse(id, out var convId))
            return BadRequest(new { message = "Invalid conversation ID format." });

        try
        {
            var result = await _chatService.GetLogAsync(userId, convId, cursor);
            return Ok(new { cursor = result.Cursor, logs = result.Messages });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("conversations")]

    public async Task<IActionResult> GetOrCreateConversation([FromBody] CreateConversationRequest request)
    {
        var userId = GetUserId();
        var participantGuids = new List<Guid>();

        foreach (var id in request.ParticipantIds)
        {
            if (Guid.TryParse(id, out var guid))
            {
                participantGuids.Add(guid);
            }
            else
            {
                return BadRequest(new { message = $"Invalid participant ID format: {id}" });
            }
        }

        try
        {
            var conversation = await _chatService.GetOrCreateConversationAsync(userId, participantGuids);
            return Ok(conversation);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("messages/{messageId}/forward")]
    public async Task<IActionResult> ForwardMessage(string messageId, [FromBody] ForwardMessageRequest request)
    {
        var userId = GetUserId();
        if (!Guid.TryParse(messageId, out var msgId))
        {
            return BadRequest(new { message = "Invalid message ID format." });
        }

        try
        {
            var messages = await _chatService.ForwardMessageAsync(userId, msgId, request.TargetConversationIds);
            return Ok(messages);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private Guid GetUserId()
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            throw new UnauthorizedAccessException();
        }
        return userId;
    }
}
