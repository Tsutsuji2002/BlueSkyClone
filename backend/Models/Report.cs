using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BSkyClone.Models;

public class Report
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public string SubjectType { get; set; } = string.Empty; // "com.atproto.admin.defs#repoRef" or "com.atproto.repo.strongRef"

    [Required]
    [MaxLength(256)]
    public string SubjectUri { get; set; } = string.Empty;

    [MaxLength(256)]
    public string? SubjectCid { get; set; }

    [Required]
    [MaxLength(50)]
    public string ReasonType { get; set; } = string.Empty; // "com.atproto.moderation.defs#reasonSpam", etc.

    public string? ReasonText { get; set; }

    public Guid ReporterId { get; set; }

    [ForeignKey("ReporterId")]
    public virtual User Reporter { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "open"; // open, resolved, dismissed
}
