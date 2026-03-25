using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using BSkyClone.DTOs;
using Microsoft.Extensions.Logging;

namespace BSkyClone.Services
{
    public class ChatProxyService : IChatProxyService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<ChatProxyService> _logger;
        private readonly ILinkService _linkService;
        private const string ChatEndpoint = "https://api.bsky.chat/xrpc";

        public ChatProxyService(HttpClient httpClient, ILogger<ChatProxyService> logger, ILinkService linkService)
        {
            _httpClient = httpClient;
            _logger = logger;
            _linkService = linkService;
        }

        public async Task<IEnumerable<ConversationDto>> GetConversationsAsync(string token, int limit = 50, string? cursor = null)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.listConvos?limit={limit}";
            if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={cursor}";

            var response = await CallAsync(token, url);
            if (!response.IsSuccessStatusCode) return Enumerable.Empty<ConversationDto>();

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<BlueskyConvoListResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            return data?.Convos?.Select(MapToConversationDto) ?? Enumerable.Empty<ConversationDto>();
        }

        private async Task<HttpResponseMessage> CallAsync(string token, string url, string method = "GET", object? body = null)
        {
            var request = new HttpRequestMessage(new HttpMethod(method), url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            if (body != null)
            {
                request.Content = new StringContent(JsonSerializer.Serialize(body), System.Text.Encoding.UTF8, "application/json");
            }

            return await _httpClient.SendAsync(request);
        }

        public async Task<ConversationDto?> GetConversationAsync(string token, string conversationId)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.getConvo?convoId={conversationId}";
            var response = await CallAsync(token, url);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<BlueskyConvoResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            return data != null ? MapToConversationDto(data.Convo) : null;
        }

        public async Task<IEnumerable<MessageDto>> GetMessagesAsync(string token, string conversationId, int limit = 50, string? cursor = null)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.getMessages?convoId={conversationId}&limit={limit}";
            if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={cursor}";

            var response = await CallAsync(token, url);
            if (!response.IsSuccessStatusCode) return Enumerable.Empty<MessageDto>();

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<BlueskyMessageListResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            // Order by CreatedAt to ensure chronological order (oldest first)
            var messages = data?.Messages.Select(m => MapToMessageDto(m, conversationId)).OrderBy(m => m.CreatedAt) ?? Enumerable.Empty<MessageDto>();
            
            var enriched = new List<MessageDto>();
            foreach (var m in messages)
            {
                enriched.Add(await EnrichMessageAsync(m));
            }
            return enriched;
        }

        public async Task<IEnumerable<MessageDto>> GetLogAsync(string token, string? cursor)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.getLog";
            if (!string.IsNullOrEmpty(cursor)) url += $"?cursor={cursor}";

            var response = await CallAsync(token, url);
            if (!response.IsSuccessStatusCode) return Enumerable.Empty<MessageDto>();

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<BlueskyLogResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            if (data?.Logs == null) return Enumerable.Empty<MessageDto>();

            var messages = new List<MessageDto>();
            foreach (var log in data.Logs)
            {
                if (log.Type == "chat.bsky.convo.defs#logCreateMessage" && log.Message != null)
                {
                    messages.Add(await EnrichMessageAsync(MapToMessageDto(log.Message, log.ConvoId ?? "")));
                }
            }

            return messages.OrderBy(m => m.CreatedAt);
        }

        private async Task<MessageDto> EnrichMessageAsync(MessageDto dto)
        {
            if (string.IsNullOrEmpty(dto.Content) || dto.LinkPreview != null) return dto;

            try 
            {
                var preview = await _linkService.GetLinkPreviewAsync(dto.Content);
                if (preview != null)
                {
                    dto = dto with { LinkPreview = new LinkPreviewDto
                    {
                        Url = preview.Url,
                        Title = preview.Title,
                        Description = preview.Description,
                        Image = preview.Image,
                        Domain = preview.Domain
                    }};
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to enrich message with link preview");
            }

            return dto;
        }

        public async Task<MessageDto> SendMessageAsync(string token, string conversationId, string content)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.sendMessage";
            var body = new { convoId = conversationId, message = new { text = content } };
            
            var response = await CallAsync(token, url, "POST", body);
            if (!response.IsSuccessStatusCode) throw new Exception($"Failed to send message: {response.StatusCode}");

            var json = await response.Content.ReadAsStringAsync();
            var messageData = JsonSerializer.Deserialize<BlueskyMessage>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            return MapToMessageDto(messageData!, conversationId);
        }

        public async Task<bool> UpdateReadAsync(string token, string conversationId, string? messageId = null)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.updateRead";
            var body = new { convoId = conversationId, messageId = messageId };
            
            var response = await CallAsync(token, url, "POST", body);
            return response.IsSuccessStatusCode;
        }

        public async Task<ConversationDto> GetOrCreateConversationAsync(string token, List<string> members)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.getConvoForMembers";
            var body = new { members = members };
            
            var response = await CallAsync(token, url, "POST", body);
            if (!response.IsSuccessStatusCode) throw new Exception($"Failed to get/create conversation: {response.StatusCode}");

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<BlueskyConvoResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            return MapToConversationDto(data!.Convo);
        }


        private ConversationDto MapToConversationDto(BlueskyConvo convo)
        {
            return new ConversationDto(
                convo.Id,
                convo.Members.Select(m => new UserDto(Guid.Empty, m.Handle, m.Handle, string.Empty, string.IsNullOrEmpty(m.DisplayName) ? m.Handle : m.DisplayName, m.Avatar, null, null, null, null, null, 0, 0, 0, "user", null, false, m.Did)).ToList(),
                convo.LastMessage != null ? MapToMessageDto(convo.LastMessage, convo.Id) : null,
                convo.UnreadCount,
                convo.LastMessage != null ? DateTimeOffset.Parse(convo.LastMessage.SentAt) : DateTimeOffset.UtcNow
            );
        }

        private MessageDto MapToMessageDto(BlueskyMessage msg, string convoId)
        {
            return new MessageDto(
                msg.Id,
                convoId,
                msg.Sender.Did,
                msg.Text,
                null,
                DateTimeOffset.Parse(msg.SentAt),
                false,
                false,
                false,
                MapToUserDto(msg.Sender)
            );
        }

        private UserDto MapToUserDto(BlueskyMember m)
        {
            return new UserDto(
                Guid.Empty,
                m.Handle,
                m.Handle,
                null,
                string.IsNullOrEmpty(m.DisplayName) ? m.Handle : m.DisplayName,
                m.Avatar,
                null,
                null,
                null,
                null,
                null,
                0,
                0,
                0,
                "user",
                null,
                false,
                m.Did
            );
        }

        // Inner classes for Bluesky API responses
        private class BlueskyConvoListResponse { public List<BlueskyConvo> Convos { get; set; } = new(); public string? Cursor { get; set; } }
        private class BlueskyConvoResponse { public BlueskyConvo Convo { get; set; } = new(); }
        private class BlueskyMessageListResponse { public List<BlueskyMessage> Messages { get; set; } = new(); public string? Cursor { get; set; } }
        private class BlueskyConvo 
        { 
            public string Id { get; set; } = string.Empty;
            public string Rev { get; set; } = string.Empty;
            public List<BlueskyMember> Members { get; set; } = new();
            public BlueskyMessage? LastMessage { get; set; }
            public int UnreadCount { get; set; }
        }
        private class BlueskyMember
        {
            public string Did { get; set; } = string.Empty;
            public string Handle { get; set; } = string.Empty;
            public string? DisplayName { get; set; }
            public string? Avatar { get; set; }
        }
        private class BlueskyMessage
        {
            public string Id { get; set; } = string.Empty;
            public string Rev { get; set; } = string.Empty;
            public string Text { get; set; } = string.Empty;
            public string SentAt { get; set; } = string.Empty;
            public BlueskyMember Sender { get; set; } = new();
        }

        private class BlueskyLogResponse
        {
            public List<BlueskyLogEntry> Logs { get; set; } = new();
            public string? Cursor { get; set; }
        }

        private class BlueskyLogEntry
        {
            [JsonPropertyName("$type")]
            public string Type { get; set; } = string.Empty;
            public string? ConvoId { get; set; }
            public BlueskyMessage? Message { get; set; }
            public string? Rev { get; set; }
        }
    }
}
