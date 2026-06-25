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
        private readonly IXrpcProxyService _xrpcProxy;
        private readonly ILogger<ChatProxyService> _logger;
        private readonly ILinkService _linkService;
        private const string ChatEndpoint = "https://api.bsky.chat/xrpc";

        public ChatProxyService(HttpClient httpClient, ILogger<ChatProxyService> logger, ILinkService linkService, IXrpcProxyService xrpcProxy)
        {
            _httpClient = httpClient;
            _logger = logger;
            _linkService = linkService;
            _xrpcProxy = xrpcProxy;
        }

        public async Task<IEnumerable<ConversationDto>> GetConversationsAsync(string token, int limit = 50, string? cursor = null)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.listConvos?limit={limit}";
            if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={cursor}";

            var response = await CallAsync(token, url);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Chat proxy listConvos failed: {StatusCode} - {Error}", response.StatusCode, error);
                throw new Exception($"Failed to fetch conversations from proxy: {response.StatusCode}");
            }

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
            
            // DEBUG: Log the raw JSON to see what AT Protocol is actually returning
            _logger.LogInformation("GetConversationAsync RAW JSON for {ConvoId}: {Json}", conversationId, json);
            
            var data = JsonSerializer.Deserialize<BlueskyConvoResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            var dto = data != null ? MapToConversationDto(data.Convo) : null;
            
            // DEBUG: Log the lockStatus and mapped Locked value
            if (dto != null)
            {
                _logger.LogInformation("GetConversationAsync - ConvoId: {ConvoId}, LockStatus from AT: '{LockStatus}', Mapped Locked: {Locked}", 
                    conversationId, data?.Convo?.Kind?.LockStatus ?? "null", dto.Locked);
            }
            
            return dto;
        }

        public async Task<IEnumerable<MessageDto>> GetMessagesAsync(string token, string conversationId, int limit = 50, string? cursor = null)
        {
            // First, get conversation to access member data for enriching message senders
            var conversation = await GetConversationAsync(token, conversationId);
            var members = conversation?.Participants?.ToDictionary(m => m.Did ?? "", m => m) ?? new Dictionary<string, UserDto>();
            
            var url = $"{ChatEndpoint}/chat.bsky.convo.getMessages?convoId={conversationId}&limit={limit}";
            if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={cursor}";

            var response = await CallAsync(token, url);
            if (!response.IsSuccessStatusCode) return Enumerable.Empty<MessageDto>();

            var json = await response.Content.ReadAsStringAsync();
            
            // DEBUG: Log a sample of raw JSON with focus on text field
            // DEBUG: Log a sample of raw JSON with focus on text field
            var jsonSample = json.Length > 2000 ? json.Substring(0, 2000) + "..." : json;
            _logger.LogInformation("GetMessagesAsync RAW JSON sample for {ConvoId}: {Json}", conversationId, jsonSample);
            
            var data = JsonSerializer.Deserialize<BlueskyMessageListResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            var mapped = data?.Messages.Select(m => MapToMessageDto(m, conversationId, members)).OrderBy(m => m.CreatedAt)
                ?? Enumerable.Empty<MessageDto>();
            var messages = HydrateReplyMessages(mapped).ToList();
            
            _logger.LogInformation("GetMessagesAsync for {ConvoId}: Returning {Count} messages. Replies found: {ReplyCount}", 
                conversationId, messages.Count, messages.Count(m => m.ReplyTo != null));
            
            // [PERFORMANCE FIX] Disabled automatic link preview enrichment for bulk message loads
            // Link previews were causing 21+ second delays when loading 50 messages
            // TODO: Implement lazy/on-demand link preview loading in frontend or via separate endpoint
            // var enrichmentTasks = messages.Select(EnrichMessageAsync).ToList();
            // var enriched = await Task.WhenAll(enrichmentTasks);
            
            // [PERFORMANCE FIX] Disabled automatic link preview enrichment for bulk message loads
            // Link previews were causing 21+ second delays when loading 50 messages
            // TODO: Implement lazy/on-demand link preview loading in frontend or via separate endpoint
            // var enrichmentTasks = messages.Select(EnrichMessageAsync).ToList();
            // var enriched = await Task.WhenAll(enrichmentTasks);
            
            _logger.LogInformation("GetMessagesAsync for {ConvoId}: Returning {Count} messages", conversationId, messages.Count());
            
            return messages;
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

            // Parallelize enrichment
            var enrichmentTasks = data.Logs
                .Select(async log => 
                {
                    if (log.Type == "chat.bsky.convo.defs#logCreateMessage" && log.Message != null)
                    {
                        return await EnrichMessageAsync(MapToMessageDto(log.Message!, log.ConvoId ?? ""));
                    }
                    
                    // Handle other log types as system events
                    if (log.ConvoId != null)
                    {
                        var type = log.Type.Split('#').Last();
                        // Special handling for member and group actions
                        return new MessageDto(
                            Guid.NewGuid().ToString(),
                            log.ConvoId,
                            "system",
                            null,
                            null,
                            DateTimeOffset.UtcNow,
                            true,
                            false,
                            false,
                            null, // LinkPreview
                            null, // LinkPreview
                            null, // ReplyTo
                            null, // Reactions
                            type, // Type
                            log.Rev, // Rev
                            new Dictionary<string, string> { { "rev", log.Rev ?? "" } } // Metadata
                        );
                    }
                    return null;
                })
                .ToList();

            var results = await Task.WhenAll(enrichmentTasks);
            return results.Where(m => m != null).Cast<MessageDto>().OrderBy(m => m.CreatedAt);
        }

        private async Task<MessageDto> EnrichMessageAsync(MessageDto dto)
        {
            // Skip enrichment for messages without content or that already have previews
            if (string.IsNullOrEmpty(dto.Content) || dto.LinkPreview != null) return dto;

            // Skip enrichment if content doesn't contain URLs (basic check)
            if (!dto.Content.Contains("http://") && !dto.Content.Contains("https://"))
            {
                return dto;
            }

            try 
            {
                // Add timeout to prevent hanging on slow websites (2 seconds max per message)
                var previewTask = _linkService.GetLinkPreviewAsync(dto.Content);
                var timeoutTask = Task.Delay(TimeSpan.FromSeconds(2));
                var completedTask = await Task.WhenAny(previewTask, timeoutTask);
                
                if (completedTask == previewTask)
                {
                    var preview = await previewTask;
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
                else
                {
                    _logger.LogDebug("Link preview timeout for message {Id}", dto.Id);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to enrich message with link preview");
            }

            return dto;
        }

        private async Task<MessageDto?> GetMessageByIdAsync(string token, string conversationId, string messageId)
        {
            try
            {
                // AT Protocol getMessages uses cursor for pagination.
                // We'll try to fetch a single message by setting the cursor to the ID we want.
                // Note: Lexicon says 'cursor' is a pagination string. In some implementations it can be a message ID.
                // If not, we'll have to fetch the latest batch and search (worst case).
                var url = $"{ChatEndpoint}/chat.bsky.convo.getMessages?convoId={conversationId}&limit=10"; // Fetch small batch
                
                var response = await CallAsync(token, url, "GET");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var data = JsonSerializer.Deserialize<BlueskyMessageListResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    var match = data?.Messages.FirstOrDefault(m => m.Id == messageId);
                    if (match != null)
                    {
                        return MapToMessageDto(match, conversationId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch parent message {MessageId}", messageId);
            }
            
            return null;
        }

        public async Task<MessageDto> SendMessageAsync(string token, string conversationId, string content, string? replyToId = null, string? replyToRev = null)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.sendMessage";
            
            object? reply = null;
            if (!string.IsNullOrEmpty(replyToId))
            {
                // [OPTIMIZATION] Instead of fetching 50 messages, we use the provided replyToId/rev
                // The AT Protocol expects either a specific ref object or just the ID/rev.
                // We'll construct a standard ref object.
                reply = new { id = replyToId, rev = replyToRev };
            }

            var body = new { convoId = conversationId, message = new { text = content, reply = reply } };
            
            var response = await CallAsync(token, url, "POST", body);
            if (!response.IsSuccessStatusCode) throw new Exception($"Failed to send message: {response.StatusCode}");

            var json = await response.Content.ReadAsStringAsync();
            var messageData = JsonSerializer.Deserialize<BlueskyMessage>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            var sentMessage = MapToMessageDto(messageData!, conversationId);

            if (!string.IsNullOrEmpty(replyToId))
            {
                // Hydrate the reply metadata before returning
                // We'll try to find the sent message in recent ones or just populate the basics
                var parent = await GetMessageByIdAsync(token, conversationId, replyToId);
                if (parent != null)
                {
                    sentMessage = sentMessage with { ReplyTo = parent };
                }
                else
                {
                    sentMessage = sentMessage with { ReplyTo = new MessageDto(replyToId, conversationId, "", "", null, DateTimeOffset.MinValue, false, false, false, null, null, null, null, "message", replyToRev) };
                }
            }

            return sentMessage;
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
            // chat.bsky.convo.getConvoForMembers is an XRPC query (GET)
            var queryString = string.Join("&", members.Select(m => $"members={Uri.EscapeDataString(m)}"));
            var url = $"{ChatEndpoint}/chat.bsky.convo.getConvoForMembers?{queryString}";
            
            var response = await CallAsync(token, url, "GET");
            if (!response.IsSuccessStatusCode)
            {
                var errorJson = await response.Content.ReadAsStringAsync();
                var errorCode = "Unknown";
                var errorMessage = "Unknown error";
                
                try 
                {
                    using var doc = JsonDocument.Parse(errorJson);
                    if (doc.RootElement.TryGetProperty("error", out var err)) errorCode = err.GetString() ?? "Unknown";
                    if (doc.RootElement.TryGetProperty("message", out var msg)) errorMessage = msg.GetString() ?? "Unknown";
                }
                catch {}

                _logger.LogError("getConvoForMembers failed: {StatusCode} - {Error} ({Message}) for {Url}", response.StatusCode, errorCode, errorMessage, url);
                
                if (errorCode == "AccountRestriction")
                {
                    throw new Exception("Your account is restricted from starting new chats. This usually requires a confirmed email address on Bluesky.");
                }

                throw new Exception($"Failed to start conversation: {errorMessage}");
            }

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<BlueskyConvoResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            return MapToConversationDto(data!.Convo);
        }

        public async Task<ConversationDto> CreateConvoAsync(string token, List<string> members, string name)
        {
            var url = $"{ChatEndpoint}/chat.bsky.group.createGroup";
            var body = new { members = members, name = name };

            var response = await CallAsync(token, url, "POST", body);
            if (!response.IsSuccessStatusCode)
            {
                var errorJson = await response.Content.ReadAsStringAsync();
                var errorMessage = "Unknown error";

                try
                {
                    using var doc = JsonDocument.Parse(errorJson);
                    if (doc.RootElement.TryGetProperty("message", out var msg)) errorMessage = msg.GetString() ?? "Unknown";
                }
                catch { }

                _logger.LogError("createGroup failed: {StatusCode} - {Error} for {Url}", response.StatusCode, errorMessage, url);
                throw new Exception($"Failed to create group conversation: {errorMessage}");
            }

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<BlueskyConvoResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return MapToConversationDto(data!.Convo);
        }

        public async Task<ConversationDto> AddMembersAsync(string token, string conversationId, List<string> members)
        {
            var url = $"{ChatEndpoint}/chat.bsky.group.addMembers";
            var body = new { convoId = conversationId, members = members };

            var response = await CallAsync(token, url, "POST", body);
            if (!response.IsSuccessStatusCode)
            {
                var errorJson = await response.Content.ReadAsStringAsync();
                throw new Exception($"Failed to add members: {errorJson}");
            }

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<BlueskyConvoResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return MapToConversationDto(data!.Convo);
        }

        public async Task<ConversationDto> EditGroupAsync(string token, string conversationId, string displayName)
        {
            var url = $"{ChatEndpoint}/chat.bsky.group.editGroup";
            var body = new { convoId = conversationId, name = displayName };

            var response = await CallAsync(token, url, "POST", body);
            if (!response.IsSuccessStatusCode)
            {
                var errorJson = await response.Content.ReadAsStringAsync();
                throw new Exception($"Failed to edit group: {errorJson}");
            }

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<BlueskyConvoResponse>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return MapToConversationDto(data!.Convo);
        }

        public async Task<JoinLinkDto> CreateJoinLinkAsync(string token, string conversationId, bool requireApproval, string joinRule)
        {
            var url = $"{ChatEndpoint}/chat.bsky.group.createJoinLink";
            var body = new { convoId = conversationId, requireApproval = requireApproval, joinRule = joinRule };

            var response = await CallAsync(token, url, "POST", body);
            if (!response.IsSuccessStatusCode)
            {
                var errorJson = await response.Content.ReadAsStringAsync();
                throw new Exception($"Failed to create join link: {errorJson}");
            }

            var json = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("InviteLink Proxy Response: {Json}", json);
            var wrapper = JsonSerializer.Deserialize<BlueskyJoinLinkWrapper>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            var data = wrapper?.JoinLink;

            return MapToJoinLinkDto(data!);
        }

        public async Task<JoinLinkDto> EditJoinLinkAsync(string token, string conversationId, bool? requireApproval = null, string? joinRule = null)
        {
            var url = $"{ChatEndpoint}/chat.bsky.group.editJoinLink";
            var body = new { convoId = conversationId, requireApproval = requireApproval, joinRule = joinRule };

            var response = await CallAsync(token, url, "POST", body);
            if (!response.IsSuccessStatusCode)
            {
                var errorJson = await response.Content.ReadAsStringAsync();
                throw new Exception($"Failed to edit join link: {errorJson}");
            }

            var json = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("InviteLink Proxy Response: {Json}", json);
            var wrapper = JsonSerializer.Deserialize<BlueskyJoinLinkWrapper>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            var data = wrapper?.JoinLink;

            return MapToJoinLinkDto(data!);
        }

        public async Task<JoinLinkDto> EnableJoinLinkAsync(string token, string conversationId)
        {
            var url = $"{ChatEndpoint}/chat.bsky.group.enableJoinLink";
            var body = new { convoId = conversationId };

            var response = await CallAsync(token, url, "POST", body);
            if (!response.IsSuccessStatusCode)
            {
                var errorJson = await response.Content.ReadAsStringAsync();
                throw new Exception($"Failed to enable join link: {errorJson}");
            }

            var json = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("InviteLink Proxy Response: {Json}", json);
            var wrapper = JsonSerializer.Deserialize<BlueskyJoinLinkWrapper>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            var data = wrapper?.JoinLink;

            return MapToJoinLinkDto(data!);
        }

        public async Task<JoinLinkDto> DisableJoinLinkAsync(string token, string conversationId)
        {
            var url = $"{ChatEndpoint}/chat.bsky.group.disableJoinLink";
            var body = new { convoId = conversationId };

            var response = await CallAsync(token, url, "POST", body);
            if (!response.IsSuccessStatusCode)
            {
                var errorJson = await response.Content.ReadAsStringAsync();
                throw new Exception($"Failed to disable join link: {errorJson}");
            }

            var json = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("InviteLink Proxy Response: {Json}", json);
            var wrapper = JsonSerializer.Deserialize<BlueskyJoinLinkWrapper>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            var data = wrapper?.JoinLink;

            return MapToJoinLinkDto(data!);
        }

        public async Task<bool> AddReactionAsync(string token, string conversationId, string messageId, string emoji)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.addReaction";
            var body = new { convoId = conversationId, messageId = messageId, value = emoji };
            
            var response = await CallAsync(token, url, "POST", body);
            return response.IsSuccessStatusCode;
        }

        public async Task<bool> RemoveReactionAsync(string token, string conversationId, string messageId, string emoji)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.removeReaction";
            var body = new { convoId = conversationId, messageId = messageId, value = emoji };
            
            var response = await CallAsync(token, url, "POST", body);
            return response.IsSuccessStatusCode;
        }

        public async Task<bool> DeleteMessageForSelfAsync(string token, string conversationId, string messageId)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.deleteMessageForSelf";
            var body = new { convoId = conversationId, messageId = messageId };
            
            var response = await CallAsync(token, url, "POST", body);
            return response.IsSuccessStatusCode;
        }

        public async Task<bool> MuteConversationAsync(string token, string conversationId)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.muteConvo";
            var body = new { convoId = conversationId };
            
            var response = await CallAsync(token, url, "POST", body);
            return response.IsSuccessStatusCode;
        }

        public async Task<bool> UnmuteConversationAsync(string token, string conversationId)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.unmuteConvo";
            var body = new { convoId = conversationId };
            
            var response = await CallAsync(token, url, "POST", body);
            return response.IsSuccessStatusCode;
        }

        public async Task<bool> LockConversationAsync(string token, string conversationId)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.lockConvo";
            var body = new { convoId = conversationId };
            
            var response = await CallAsync(token, url, "POST", body);
            return response.IsSuccessStatusCode;
        }

        public async Task<bool> UnlockConversationAsync(string token, string conversationId)
        {
            var url = $"{ChatEndpoint}/chat.bsky.convo.unlockConvo";
            var body = new { convoId = conversationId };
            
            var response = await CallAsync(token, url, "POST", body);
            return response.IsSuccessStatusCode;
        }

        public async Task<ChatSettingsDto> GetChatDeclarationAsync(string token, string did)
        {
            // Strategy 1: Direct repo getRecord (Authoritative)
            if (!string.IsNullOrEmpty(did))
            {
                try
                {
                    _logger.LogInformation("Attempting direct repo getRecord for chat settings ({Did})", did);
                    var queryParams = new List<KeyValuePair<string, string?>>
                    {
                        new("repo", did),
                        new("collection", "chat.bsky.actor.declaration"),
                        new("rkey", "self")
                    };
                    
                    var repoResponse = await _xrpcProxy.ProxyRequestAsync(did, "com.atproto.repo.getRecord", queryParams, token);
                    if (repoResponse.Success)
                    {
                        using var doc = JsonDocument.Parse(repoResponse.Content);
                        var value = doc.RootElement.TryGetProperty("value", out var v) ? v : doc.RootElement;
                        
                        var allowIncoming = value.TryGetProperty("allowIncoming", out var ai) ? ai.GetString() : "following";
                        var allowGroupInvites = value.TryGetProperty("allowGroupInvites", out var agi) ? agi.GetString() : null;
                        
                        _logger.LogInformation("Fetched settings via getRecord: Incoming={Incoming}, Group={Group}", allowIncoming, allowGroupInvites);
                        return new ChatSettingsDto(allowIncoming ?? "following", allowGroupInvites);
                    }
                    _logger.LogWarning("Direct repo getRecord failed: {Status} - {Content}", repoResponse.StatusCode, repoResponse.Content);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in GetChatDeclarationAsync direct repo fetch for {Did}", did);
                }
            }

            // Strategy 2: Fallback to chat service getDeclaration
            try 
            {
                var url = $"{ChatEndpoint}/chat.bsky.actor.getDeclaration";
                var response = await CallAsync(token, url);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("GetChatDeclaration failed: {Status} - {Error}", response.StatusCode, errorBody);
                    return new ChatSettingsDto("following");
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                var declaration = root.TryGetProperty("declaration", out var declProp) ? declProp : root;
                
                var allowIncoming = declaration.TryGetProperty("allowIncoming", out var ai) ? ai.GetString() ?? "following" : "following";
                var allowGroupInvites = declaration.TryGetProperty("allowGroupInvites", out var agi) ? agi.GetString() : null;
                
                return new ChatSettingsDto(allowIncoming, allowGroupInvites);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetChatDeclarationAsync fallback");
                return new ChatSettingsDto("following");
            }
        }

        public async Task<(bool Success, string? Message)> UpdateChatDeclarationAsync(string token, string did, string allowIncoming, string? allowGroupInvites = null)
        {
            var body = new { allowIncoming, allowGroupInvites };
            
            // Strategy 1: Direct repo update (putRecord) - This is what official BlueSky uses
            try
            {
                _logger.LogInformation("Attempting direct repo putRecord for chat settings ({Did})", did);
                
                var record = new Dictionary<string, object>
                {
                    { "$type", "chat.bsky.actor.declaration" },
                    { "allowIncoming", allowIncoming }
                };
                
                if (!string.IsNullOrEmpty(allowGroupInvites))
                {
                    record.Add("allowGroupInvites", allowGroupInvites);
                }
                else
                {
                    // If null, default to 'following' as per convention if we must send a value
                    record.Add("allowGroupInvites", "following");
                }

                var putRecordBody = new
                {
                    repo = did,
                    collection = "chat.bsky.actor.declaration",
                    rkey = "self",
                    record = record
                };
                
                var repoResponse = await _xrpcProxy.ProxyRequestAsync(did, "com.atproto.repo.putRecord", new Dictionary<string, string?>(), token, "POST", putRecordBody);
                if (repoResponse.Success)
                {
                    _logger.LogInformation("Direct repo putRecord succeeded");
                    return (true, null);
                }
                _logger.LogWarning("Direct repo putRecord failed: {Status} - {Content}", repoResponse.StatusCode, repoResponse.Content);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Strategy 1 (putRecord) for {Did}", did);
            }

            // Strategy 2: Attempt the official chat service procedure (Fallback)
            try
            {
                var url = $"{ChatEndpoint}/chat.bsky.actor.updateDeclaration";
                _logger.LogInformation("Attempting fallback UpdateChatDeclaration via ChatEndpoint for {Did}", did);
                var response = await CallAsync(token, url, "POST", body);
                
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("UpdateChatDeclaration succeeded via ChatEndpoint");
                    return (true, null);
                }
                
                var content = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("UpdateChatDeclaration failed via ChatEndpoint: {Status} - {Content}", response.StatusCode, content);
                
                if (response.StatusCode == System.Net.HttpStatusCode.BadRequest && !content.Contains("MethodNotImplemented"))
                {
                    if (allowGroupInvites != null && (content.Contains("allowGroupInvites") || content.Contains("extra property")))
                    {
                        _logger.LogInformation("Retrying UpdateChatDeclaration without allowGroupInvites via ChatEndpoint");
                        var retryBody = new { allowIncoming };
                        var retryResponse = await CallAsync(token, url, "POST", retryBody);
                        if (retryResponse.IsSuccessStatusCode) return (true, null);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Strategy 2 (ChatEndpoint) for {Did}", did);
            }

            // Strategy 3: Attempt via PDS proxy procedure (Last resort)
            try
            {
                _logger.LogInformation("Attempting UpdateChatDeclaration via PDS Proxy for {Did}", did);
                var proxyResponse = await _xrpcProxy.ProxyRequestAsync(did, "chat.bsky.actor.updateDeclaration", new Dictionary<string, string?>(), token, "POST", body);
                if (proxyResponse.Success)
                {
                    _logger.LogInformation("UpdateChatDeclaration succeeded via PDS Proxy");
                    return (true, null);
                }
                return (false, $"Settings update failed: {proxyResponse.Content}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Strategy 3 (PDS Proxy) for {Did}", did);
                return (false, $"Critical failure: {ex.Message}");
            }
        }



        private ConversationDto MapToConversationDto(BlueskyConvo convo)
        {
            // Create members dictionary for enriching last message sender
            var membersDict = convo.Members.ToDictionary(m => m.Did, m => new UserDto(
                Guid.Empty, m.Handle, m.Handle, string.Empty, 
                string.IsNullOrEmpty(m.DisplayName) ? m.Handle : m.DisplayName, 
                m.Avatar, null, null, null, null, null, 0, 0, 0, "user", null, false, m.Did
            ));

            var isLocked = convo.Kind?.LockStatus == "locked";
            
            // DEBUG: Log the lockStatus conversion
            _logger.LogInformation("MapToConversationDto - ConvoId: {ConvoId}, LockStatus: '{LockStatus}', Converted to Locked: {Locked}", 
                convo.Id, convo.Kind?.LockStatus ?? "null", isLocked);

            return new ConversationDto(
                convo.Id,
                membersDict.Values.ToList(),
                convo.LastMessage != null ? MapToMessageDto(convo.LastMessage, convo.Id, membersDict) : null,
                convo.UnreadCount,
                convo.LastMessage != null ? DateTimeOffset.Parse(convo.LastMessage.SentAt) : DateTimeOffset.UtcNow,
                true, // IsAccepted
                convo.Kind?.Name, // GroupName from Bluesky API - read from Kind.Name as per AT Protocol structure
                convo.Kind?.JoinLink != null ? MapToJoinLinkDto(convo.Kind.JoinLink) : null, // Read from Kind.JoinLink as per AT Protocol structure
                convo.Muted, // Muted status from Bluesky API
                isLocked // Locked status from Bluesky API - lockStatus is inside Kind object
            );
        }

        private IEnumerable<MessageDto> HydrateReplyMessages(IEnumerable<MessageDto> messages)
        {
            var list = messages.ToList();
            var byId = list.ToDictionary(m => m.Id, m => m);

            return list.Select(message =>
            {
                if (message.ReplyTo != null)
                {
                    if (byId.TryGetValue(message.ReplyTo.Id, out var repliedMessage))
                    {
                        return message with { ReplyTo = ToReplyPreview(repliedMessage) };
                    }
                }

                return message;
            });
        }

        private MessageDto ToReplyPreview(MessageDto message)
        {
            return message with
            {
                ReplyTo = null,
                Reactions = null,
                LinkPreview = null
            };
        }

        private MessageDto? MapReplyToDto(BlueskyMessageReply? reply, string fallbackConvoId, Dictionary<string, UserDto>? members)
        {
            if (reply == null) return null;

            // ATProto getMessages returns replyTo as a direct ref/view.
            // In sendMessage, it might be nested in root/parent.
            var replyRef = reply.Parent ?? reply.Root ?? (BlueskyMessageRef)reply;
            
            var messageId = replyRef.MessageId ?? replyRef.Id;
            if (string.IsNullOrEmpty(messageId)) return null;
            
            _logger.LogInformation("MapReplyToDto: Mapped reply to parent message {ParentId}", messageId);

            var did = replyRef.Did ?? "";
            UserDto? sender = null;
            if (members != null && !string.IsNullOrEmpty(did))
            {
                members.TryGetValue(did, out sender);
            }

            return new MessageDto(
                messageId,
                replyRef.ConvoId ?? fallbackConvoId,
                did,
                replyRef.Text ?? "", // Extract text from the ref if available
                null,
                DateTimeOffset.MinValue,
                false,
                false,
                false,
                sender,
                null,
                null,
                null,
                "message",
                replyRef.Rev
            );
        }

        private MessageDto MapToMessageDto(BlueskyMessage msg, string convoId, Dictionary<string, UserDto>? members = null)
        {
            // Check if this is a system message
            var isSystemMessage = msg.Type != null && msg.Type.Contains("systemMessageView");
            
            string messageType = "message";
            string? content = msg.Text;
            
            if (isSystemMessage && msg.Data != null)
            {
                // Extract system message type from data.$type
                var dataType = msg.Data.Value.TryGetProperty("$type", out var typeElement) 
                    ? typeElement.GetString() 
                    : "";
                
                if (dataType != null)
                {
                    if (dataType.Contains("LockConvo"))
                    {
                        messageType = "lock";
                        var lockedBy = msg.Data.Value.TryGetProperty("lockedBy", out var lockedByElement) && 
                                      lockedByElement.TryGetProperty("did", out var didElement)
                            ? didElement.GetString()
                            : "";
                        content = $"Chat locked by {lockedBy}";
                    }
                    else if (dataType.Contains("UnlockConvo"))
                    {
                        messageType = "unlock";
                        var unlockedBy = msg.Data.Value.TryGetProperty("unlockedBy", out var unlockedByElement) && 
                                        unlockedByElement.TryGetProperty("did", out var didElement)
                            ? didElement.GetString()
                            : "";
                        content = $"Chat unlocked by {unlockedBy}";
                    }
                    else if (dataType.Contains("MemberAdd"))
                    {
                        messageType = "member_add";
                        content = "Member added";
                    }
                    else if (dataType.Contains("MemberRemove"))
                    {
                        messageType = "member_remove";
                        content = "Member removed";
                    }
                    else if (dataType.Contains("ConvoCreate"))
                    {
                        messageType = "create";
                        content = "Chat created";
                    }
                }
            }
            
            // Try to get full sender data from conversation members if available
            UserDto? sender = null;
            if (members != null && msg.Sender != null && members.TryGetValue(msg.Sender.Did ?? "", out var memberData))
            {
                sender = memberData;
            }
            else if (msg.Sender != null)
            {
                // Fallback to whatever data we have from the message
                sender = MapToUserDto(msg.Sender);
            }
            else if (!string.IsNullOrEmpty(msg.Sender?.Did)) // Safety check if msg.Sender is somehow not null but Did exists
            {
                sender = new UserDto(
                    Guid.Empty,
                    "",
                    "",
                    "",
                    "",
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    "user",
                    null,
                    false,
                    msg.Sender.Did
                );
            }

            // Extract Image URL from embed if present
            string? imageUrl = null;
            if (msg.Embed != null && msg.Embed.Value.ValueKind == JsonValueKind.Object)
            {
                if (msg.Embed.Value.TryGetProperty("$type", out var typeProp) && typeProp.GetString() == "app.bsky.embed.images#view")
                {
                    if (msg.Embed.Value.TryGetProperty("images", out var imagesProp) && imagesProp.ValueKind == JsonValueKind.Array && imagesProp.GetArrayLength() > 0)
                    {
                        var firstImage = imagesProp[0];
                        if (firstImage.TryGetProperty("fullsize", out var fullsizeProp))
                        {
                            imageUrl = fullsizeProp.GetString();
                        }
                    }
                }
            }

            return new MessageDto(
                msg.Id,
                convoId,
                msg.Sender?.Did ?? "",
                content ?? "",
                imageUrl,
                DateTimeOffset.Parse(msg.SentAt),
                false,
                false,
                false,
                sender,
                null, // LinkPreview handled by EnrichMessageAsync
                MapReplyToDto(msg.ReplyTo ?? msg.Reply, convoId, members),
                msg.Reactions?.Select(r => new MessageReactionDto(
                    r.Sender?.Did ?? "", 
                    r.Emoji, 
                    r.Sender != null ? (string.IsNullOrWhiteSpace(r.Sender.DisplayName) ? r.Sender.Handle : r.Sender.DisplayName) : null
                )).ToList(),
                messageType,
                msg.Rev
            );
        }

        private JoinLinkDto MapToJoinLinkDto(BlueskyJoinLink link)
        {
            if (link == null) return null!;

            var code = link.Code ?? "";
            // Construct full link URL from code if missing
            var linkUrl = link.Link;
            if (string.IsNullOrEmpty(linkUrl) && !string.IsNullOrEmpty(code))
            {
                linkUrl = $"https://bsky.app/messages/join/{code}";
            }

            return new JoinLinkDto(
                code, // Use code as ID
                link.ConvoId ?? "",
                link.JoinRule ?? "anyone",
                link.RequireApproval,
                linkUrl,
                !string.IsNullOrEmpty(link.CreatedAt) ? DateTimeOffset.Parse(link.CreatedAt) : DateTimeOffset.UtcNow,
                link.EnabledStatus != "enabled"
            );
        }

        private UserDto MapToUserDto(BlueskyMember m)
        {
            return new UserDto(
                Guid.Empty,
                m.Handle,
                m.Handle,
                null,
                string.IsNullOrWhiteSpace(m.DisplayName) ? m.Handle : m.DisplayName,
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
            [JsonPropertyName("id")]
            public string Id { get; set; } = string.Empty;
            [JsonPropertyName("rev")]
            public string Rev { get; set; } = string.Empty;
            [JsonPropertyName("members")]
            public List<BlueskyMember> Members { get; set; } = new();
            [JsonPropertyName("lastMessage")]
            public BlueskyMessage? LastMessage { get; set; }
            [JsonPropertyName("unreadCount")]
            public int UnreadCount { get; set; }
            [JsonPropertyName("kind")]
            public BlueskyConvoKind? Kind { get; set; }
            [JsonPropertyName("joinLink")]
            public BlueskyJoinLink? JoinLink { get; set; }
            [JsonPropertyName("muted")]
            public bool Muted { get; set; }
        }
        
        private class BlueskyConvoKind
        {
            [JsonPropertyName("$type")]
            public string Type { get; set; } = string.Empty;
            [JsonPropertyName("name")]
            public string? Name { get; set; }
            [JsonPropertyName("joinLink")]
            public BlueskyJoinLink? JoinLink { get; set; }
            [JsonPropertyName("lockStatus")]
            public string? LockStatus { get; set; }
        }
        private class BlueskyMember
        {
            [JsonPropertyName("did")]
            public string Did { get; set; } = string.Empty;
            [JsonPropertyName("handle")]
            public string Handle { get; set; } = string.Empty;
            [JsonPropertyName("displayName")]
            public string? DisplayName { get; set; }
            [JsonPropertyName("avatar")]
            public string? Avatar { get; set; }
        }
        private class BlueskyMessage
        {
            [JsonPropertyName("id")]
            public string Id { get; set; } = string.Empty;
            [JsonPropertyName("rev")]
            public string Rev { get; set; } = string.Empty;
            [JsonPropertyName("text")]
            public string? Text { get; set; }
            [JsonPropertyName("sentAt")]
            public string SentAt { get; set; } = string.Empty;
            [JsonPropertyName("sender")]
            public BlueskyMember? Sender { get; set; }
            
            [JsonPropertyName("reactions")]
            public List<BlueskyMessageReaction>? Reactions { get; set; }
            
            [JsonPropertyName("$type")]
            public string? Type { get; set; }
            
            [JsonPropertyName("data")]
            public JsonElement? Data { get; set; }
            
            [JsonPropertyName("reply")]
            public BlueskyMessageReply? Reply { get; set; }
            
            [JsonPropertyName("replyTo")]
            public BlueskyMessageReply? ReplyTo { get; set; }
            
            [JsonPropertyName("embed")]
            public JsonElement? Embed { get; set; }
        }

        private class BlueskyMessageRef
        {
            [JsonPropertyName("id")]
            public string? Id { get; set; }
            [JsonPropertyName("rev")]
            public string? Rev { get; set; }
            [JsonPropertyName("did")]
            public string? Did { get; set; }
            [JsonPropertyName("convoId")]
            public string? ConvoId { get; set; }
            [JsonPropertyName("messageId")]
            public string? MessageId { get; set; }
            [JsonPropertyName("text")]
            public string? Text { get; set; }
            [JsonPropertyName("sender")]
            public BlueskyMember? Sender { get; set; }
        }

        private class BlueskyMessageReply : BlueskyMessageRef
        {
            [JsonPropertyName("root")]
            public BlueskyMessageRef? Root { get; set; }
            [JsonPropertyName("parent")]
            public BlueskyMessageRef? Parent { get; set; }
        }

        private class BlueskyMessageReaction
        {
            [JsonPropertyName("value")]
            public string Emoji { get; set; } = string.Empty;
            
            [JsonPropertyName("sender")]
            public BlueskyMember? Sender { get; set; }
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

        private class BlueskyJoinLinkWrapper
        {
            [JsonPropertyName("joinLink")]
            public BlueskyJoinLink? JoinLink { get; set; }
        }

        private class BlueskyJoinLink
        {
            [JsonPropertyName("code")]
            public string? Code { get; set; }

            [JsonPropertyName("convoId")]
            public string? ConvoId { get; set; }

            [JsonPropertyName("joinRule")]
            public string? JoinRule { get; set; }

            [JsonPropertyName("requireApproval")]
            public bool RequireApproval { get; set; }

            [JsonPropertyName("link")]
            public string? Link { get; set; }

            [JsonPropertyName("enabledStatus")]
            public string? EnabledStatus { get; set; }

            [JsonPropertyName("createdAt")]
            public string? CreatedAt { get; set; }
        }
    }
}

