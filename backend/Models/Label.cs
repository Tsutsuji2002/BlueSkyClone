using System;
using System.ComponentModel.DataAnnotations;

namespace BSkyClone.Models;

public class Label
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(256)]
    public string Src { get; set; } = string.Empty; // DID of the label source (PDS or Labeler)

    [Required]
    [MaxLength(256)]
    public string Uri { get; set; } = string.Empty; // Subject URI

    [MaxLength(256)]
    public string? Cid { get; set; } // Subject CID

    [Required]
    [MaxLength(100)]
    public string Val { get; set; } = string.Empty; // Label value (e.g., "hide", "warn", "!no-unauthenticated")

    public bool Neg { get; set; } // Negation

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ExpiresAt { get; set; }
}
