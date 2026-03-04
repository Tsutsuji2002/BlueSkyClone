using System;
using System.ComponentModel.DataAnnotations;

namespace BSkyClone.DTOs;

public class CreateSupportRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    public string? Username { get; set; }

    [Required]
    public string Category { get; set; } = string.Empty;

    [Required]
    public string DeviceType { get; set; } = string.Empty;
}

public class SupportRequestDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string Category { get; set; } = string.Empty;
    public string DeviceType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public Guid? UserId { get; set; }
}

public class UpdateSupportRequestStatusDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
}
