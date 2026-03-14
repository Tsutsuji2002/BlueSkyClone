using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class Post
{
    public Guid Id { get; set; }

    public string Tid { get; set; } = null!;
    public string? Cid { get; set; }

    public Guid AuthorId { get; set; }

    public string? Content { get; set; }

    public DateTime? CreatedAt { get; set; }

    public Guid? ReplyToPostId { get; set; }

    public Guid? RootPostId { get; set; }
    public Guid? QuotePostId { get; set; }

    public int? LikesCount { get; set; }

    public int? RepostsCount { get; set; }

    public int? RepliesCount { get; set; }

    public int? QuotesCount { get; set; }

    public int? BookmarksCount { get; set; }

    public string? ReplyRestriction { get; set; }

    public bool? AllowQuotes { get; set; }
    public string? Language { get; set; }
    public bool? IsDeleted { get; set; }

    public virtual User Author { get; set; } = null!;

    public virtual LinkPreview? LinkPreview { get; set; }

    public virtual ICollection<Bookmark> Bookmarks { get; set; } = new List<Bookmark>();

    public virtual ICollection<Post> InverseReplyToPost { get; set; } = new List<Post>();

    public virtual ICollection<Post> InverseRootPost { get; set; } = new List<Post>();

    public virtual ICollection<Like> Likes { get; set; } = new List<Like>();

    public virtual ICollection<PostMedium> PostMedia { get; set; } = new List<PostMedium>();

    public virtual Post? ReplyToPost { get; set; }

    public virtual ICollection<Repost> Reposts { get; set; } = new List<Repost>();

    public virtual Post? RootPost { get; set; }
    public virtual Post? QuotePost { get; set; }
    public virtual ICollection<Post> InverseQuotePost { get; set; } = new List<Post>();
    public virtual ICollection<Interest> Interests { get; set; } = new List<Interest>();

    public virtual ICollection<Hashtag> Hashtags { get; set; } = new List<Hashtag>();

    public virtual ICollection<List> Lists { get; set; } = new List<List>();
}
