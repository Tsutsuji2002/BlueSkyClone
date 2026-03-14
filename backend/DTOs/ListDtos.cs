using System;
using System.ComponentModel.DataAnnotations;

namespace BSkyClone.DTOs;

public class ListDto
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public UserDto? Owner { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? Purpose { get; set; }
    public string? AvatarUrl { get; set; }
    public int MembersCount { get; set; }
    public int PostsCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsPinned { get; set; }
    public bool IsOwner { get; set; }
    public string? Tid { get; set; }
    public string? Cid { get; set; }
    public string? Uri { get; set; }
}

public class CreateListDto
{
    [Required]
    [MaxLength(256)]
    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string? Purpose { get; set; } = "social"; // e.g., 'social', 'mod'

    public string? Avatar { get; set; }
}

public class UpdateListDto
{
    [MaxLength(256)]
    public string? Name { get; set; }

    public string? Description { get; set; }

    public string? Avatar { get; set; }
}

public class ListItemDto
{
    public Guid UserId { get; set; }
    public UserDto User { get; set; } = null!;
    public DateTime JoinedAt { get; set; }
}

public class AddListMemberDto
{
    public Guid UserId { get; set; }
}

public class AddListPostRequest
{
    public Guid PostId { get; set; }
    public string? Caption { get; set; }
}
