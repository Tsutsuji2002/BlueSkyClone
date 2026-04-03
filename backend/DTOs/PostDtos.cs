using BSkyClone.Models;

namespace BSkyClone.DTOs;

public class FacetDto
{
    public FacetIndexDto Index { get; set; } = null!;
    public List<FacetFeatureDto> Features { get; set; } = new();
}

public class FacetIndexDto
{
    public int ByteStart { get; set; }
    public int ByteEnd { get; set; }
}

public class FacetFeatureDto
{
    public string Type { get; set; } = null!; // $type
    public string? Did { get; set; } // for mentions
    public string? Uri { get; set; } // for links
    public string? Tag { get; set; } // for tags (optional in some lexicons)
}

public class PostDto
{
    public Guid Id { get; set; }
    public string Tid { get; set; } = null!;
    /// <summary>AT-Protocol URI: at://{author.did}/app.bsky.feed.post/{tid}</summary>
    public string? Uri { get; set; }
    /// <summary>Synthetic CID — the post GUID stringified until real CID generation is added.</summary>
    public string? Cid { get; set; }
    public string? Content { get; set; }
    public List<FacetDto> Facets { get; set; } = new();
    public DateTime? CreatedAt { get; set; }
    public AuthorDto Author { get; set; } = null!;
    public List<string> ImageUrls { get; set; } = new();
    public List<MediaDto> Media { get; set; } = new();
    public string? VideoUrl { get; set; }
    public int LikesCount { get; set; }
    public int RepostsCount { get; set; }
    public int RepliesCount { get; set; }
    public int QuotesCount { get; set; }
    public int BookmarksCount { get; set; }
    public Guid? ReplyToPostId { get; set; }
    public string? ReplyToHandle { get; set; }
    public Guid? RootPostId { get; set; }
    public Guid? QuotePostId { get; set; }
    public PostDto? QuotePost { get; set; }
    public PostDto? ParentPost { get; set; }
    public bool IsLiked { get; set; }
    public bool IsBookmarked { get; set; }
    public bool IsReposted { get; set; }
    public LinkPreviewDto? LinkPreview { get; set; }
    public List<string> Tags { get; set; } = new();
    public List<string> Interests { get; set; } = new();
    public string? ListCaption { get; set; } // For Curated Lists
    public Guid? AddedByUserId { get; set; } // For Curated Lists
    public PostMuteDto MuteInfo { get; set; } = new();
    public string ReplyRestriction { get; set; } = "anyone";
    public bool? AllowQuotes { get; set; } = true;
    public string? Language { get; set; }
    public bool CanReply { get; set; } = true;
    public bool IsDeleted { get; set; }
    public AuthorDto? RepostedBy { get; set; }
    public PostViewerDto? Viewer { get; set; }
    public bool IsLinkPreviewPending { get; set; }
    public List<string> Labels { get; set; } = new();
    public bool IsPinned { get; set; }
}

public class PostViewerDto
{
    public string? Repost { get; set; } // URI of the repost record
    public string? Like { get; set; } // URI of the like record
    public bool ThreadMuted { get; set; }
    public bool ReplyDisabled { get; set; }
    public bool EmbeddingDisabled { get; set; }
}

public class MediaDto
{
    public Guid Id { get; set; }
    public string Url { get; set; } = null!;
    public string? AltText { get; set; }
    public string? Type { get; set; } // "image", "video"
    public string? ThumbnailUrl { get; set; }
    public string? Cid { get; set; }
}

public class PostMuteDto
{
    public bool IsMuted { get; set; }
    public string Behavior { get; set; } = "none"; // "hide", "warn"
    public string? Reason { get; set; }
}

public class LinkPreviewDto
{
    public string Url { get; set; } = null!;
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Image { get; set; }
    public string? Domain { get; set; }
}

public class AuthorDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = null!;
    public string Handle { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsFollowing { get; set; }
    public bool IsVerified { get; set; }
    public string? Did { get; set; }
    /// <summary>AT-URI of the follow record — needed to unfollow from post context.</summary>
    public string? FollowingReference { get; set; }
    public AuthorViewerDto? Viewer { get; set; }
    public List<string> Labels { get; set; } = new();
}

public class AuthorViewerDto
{
    public bool Muted { get; set; }
    public bool BlockedBy { get; set; }
    public string? Blocking { get; set; } // URI of the block record
    public string? Following { get; set; } // URI of the follow record
}

public class CreatePostRequest
{
    public string? Content { get; set; }
    public List<IFormFile>? Images { get; set; }
    public List<string>? AltTexts { get; set; }
    public IFormFile? Video { get; set; }
    public string? ReplyToPostId { get; set; }
    public string? RootPostId { get; set; }
    public string? QuotePostId { get; set; }
    public List<Guid>? ExistingMediaIdsToKeep { get; set; }

    // Direct URLs for XRPC/AT Protocol compatibility where media is already uploaded as blobs
    public List<string>? PreUploadedImageUrls { get; set; }
    public List<string>? PreUploadedAltTexts { get; set; }
    public string? PreUploadedVideoUrl { get; set; }

    // Optional Link Preview Metadata
    public string? LinkPreviewUrl { get; set; }
    public string? LinkPreviewTitle { get; set; }
    public string? LinkPreviewDescription { get; set; }
    public string? LinkPreviewImage { get; set; }
    public string? LinkPreviewDomain { get; set; }

    // Per-post settings
    public string? ReplyRestriction { get; set; }
    public bool? AllowQuotes { get; set; }
    public string? Language { get; set; }
    public string? GifUrl { get; set; }
    public List<string>? Labels { get; set; }
}

public class FeedDto
{
    public Guid Id { get; set; }
    public string Tid { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string Handle { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public AuthorDto? Creator { get; set; }
    public int SubscribersCount { get; set; }
    public bool IsPinned { get; set; }
    public int PinnedOrder { get; set; }
    public bool IsSubscribed { get; set; }
    public string? Uri { get; set; }
}

public class PagedPostDto
{
    public IEnumerable<PostDto> Posts { get; set; } = new List<PostDto>();
    public string? Cursor { get; set; }
}

public class PagedFeedsDto
{
    public IEnumerable<FeedDto> Feeds { get; set; } = new List<FeedDto>();
    public string? Cursor { get; set; }
}

