using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.App.Bsky.Notification
{
    public class ListNotificationsResponse
    {
        [JsonPropertyName("notifications")]
        public List<NotificationView> Notifications { get; set; } = new();

        [JsonPropertyName("cursor")]
        public string? Cursor { get; set; }
    }

    public class NotificationView
    {
        [JsonPropertyName("uri")]
        public string Uri { get; set; } = string.Empty;

        [JsonPropertyName("cid")]
        public string Cid { get; set; } = string.Empty;

        [JsonPropertyName("author")]
        public Actor.Defs.ProfileViewBasic Author { get; set; } = new();

        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;

        [JsonPropertyName("reasonSubject")]
        public string? ReasonSubject { get; set; }

        [JsonPropertyName("postAuthorHandle")]
        public string? PostAuthorHandle { get; set; }

        [JsonPropertyName("postId")]
        public string? PostId { get; set; }

        [JsonPropertyName("record")]
        public object Record { get; set; } = new();

        [JsonPropertyName("isRead")]
        public bool IsRead { get; set; }

        [JsonPropertyName("indexedAt")]
        public string IndexedAt { get; set; } = string.Empty;

        // Extended fields for custom notification types (list_invitation etc.)
        [JsonPropertyName("listId")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public Guid? ListId { get; set; }

        [JsonPropertyName("invitationStatus")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? InvitationStatus { get; set; }

        [JsonPropertyName("title")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Title { get; set; }

        [JsonPropertyName("content")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Content { get; set; }
    }

    public class GetUnreadCountResponse
    {
        [JsonPropertyName("count")]
        public int Count { get; set; }
    }

    public class UpdateSeenRequest
    {
        [JsonPropertyName("seenAt")]
        public string SeenAt { get; set; } = string.Empty;
    }
}
