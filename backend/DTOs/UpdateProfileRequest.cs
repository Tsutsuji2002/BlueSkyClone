using Microsoft.AspNetCore.Http;

namespace BSkyClone.DTOs;

public class UpdateProfileRequest
{
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public string? Location { get; set; }
    public string? Website { get; set; }
    public IFormFile? Avatar { get; set; }
    public IFormFile? CoverImage { get; set; }
    public bool RemoveAvatar { get; set; }
    public bool RemoveCoverImage { get; set; }
}
