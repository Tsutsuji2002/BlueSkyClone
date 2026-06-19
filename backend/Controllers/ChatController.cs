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
    public async Task<IActionResult> GetConversations([FromQuery] int limit = 50, [FromQuery] string? cursor = null, [FromQuery] bool? isRequest = null)
    {
        var userId = GetUserId();
        try 
        {
            var conversations = await _chatService.GetConversationsAsync(userId, limit, cursor, isRequest);
            return Ok(conversations);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving conversations", details = ex.Message });
        }
    }

    [HttpGet("conversations/{id}")]
    public async Task<IActionResult> GetConversation(string id)
    {
        var userId = GetUserId();
        var conversation = await _chatService.GetConversationAsync(userId, id);
        if (conversation == null)
        {
            return NotFound(new { message = "Conversation not found or access denied." });
        }

        return Ok(conversation);
    }

    [HttpPost("conversations/{id}/read")]
    public async Task<IActionResult> MarkAsRead(string id, [FromQuery] string? messageId = null)
    {
        var userId = GetUserId();
        await _chatService.MarkAsReadAsync(userId, id, messageId);
        return Ok();
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var userId = GetUserId();
        var settings = await _chatService.GetChatSettingsAsync(userId);
        return Ok(settings);
    }

    [HttpPost("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateChatSettingsRequest request)
    {
        var userId = GetUserId();
        var result = await _chatService.UpdateChatSettingsAsync(userId, request.AllowIncoming, request.AllowGroupInvites);
        if (result.Success) return Ok();
        return BadRequest(new { message = result.Message ?? "Failed to update chat settings" });
    }

    [HttpGet("conversations/{id}/messages")]
    public async Task<IActionResult> GetMessages(string id, [FromQuery] int limit = 50, [FromQuery] DateTimeOffset? before = null)
    {
        var userId = GetUserId();
        try
        {
            var messages = await _chatService.GetConversationMessagesAsync(userId, id, limit, before);
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
        try
        {
            var result = await _chatService.GetLogAsync(userId, id, cursor);
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
        try
        {
            var conversation = await _chatService.GetOrCreateConversationAsync(userId, request.ParticipantIds);
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
        try
        {
            var messages = await _chatService.ForwardMessageAsync(userId, messageId, request.TargetConversationIds.Select(id => id.ToString()).ToList());
            return Ok(messages);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("conversations/{id}/members")]
    public async Task<IActionResult> AddMembers(string id, [FromBody] AddMembersRequest request)
    {
        var userId = GetUserId();
        try
        {
            var conversation = await _chatService.AddMembersAsync(userId, id, request.Members);
            return Ok(conversation);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("conversations/{id}/invite-link")]
    public async Task<IActionResult> GetInviteLink(string id)
    {
        var userId = GetUserId();
        try
        {
            var link = await _chatService.GetInviteLinkAsync(userId, id);
            if (link == null) return NotFound(new { message = "No active invite link found." });
            return Ok(link);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("conversations/{id}/invite-link")]
    public async Task<IActionResult> CreateInviteLink(string id, [FromBody] CreateJoinLinkRequest request)
    {
        var userId = GetUserId();
        try
        {
            var link = await _chatService.CreateJoinLinkAsync(userId, id, request.RequireApproval, request.JoinRule);
            return Ok(link);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("conversations/{id}/invite-link")]
    public async Task<IActionResult> UpdateInviteLink(string id, [FromBody] EditJoinLinkRequest request)
    {
        var userId = GetUserId();
        try
        {
            var link = await _chatService.EditJoinLinkAsync(userId, id, request.RequireApproval, request.JoinRule);
            return Ok(link);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("conversations/{id}/invite-link")]
    public async Task<IActionResult> DisableInviteLink(string id)
    {
        var userId = GetUserId();
        try
        {
            var link = await _chatService.DisableInviteLinkAsync(userId, id);
            return Ok(link);
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

    [HttpPost("conversations/{conversationId}/accept")]
    public async Task<ActionResult> AcceptConversation(string conversationId)
    {
        var userId = GetUserId();
        var success = await _chatService.AcceptConversationAsync(userId, conversationId);
        if (!success) return NotFound();
        return Ok();
    }

    [HttpPut("conversations/{id}/name")]
    public async Task<IActionResult> UpdateConversationName(string id, [FromBody] UpdateConversationNameRequest request)
    {
        var userId = GetUserId();
        try
        {
            var conversation = await _chatService.UpdateConversationNameAsync(userId, id, request.Name);
            return Ok(conversation);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
