using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace BSkyClone.Models;

public class ListPost
{
    public Guid Id { get; set; }
    public Guid ListId { get; set; }
    public virtual List List { get; set; } = null!;
    public Guid PostId { get; set; }
    public virtual Post Post { get; set; } = null!;
    public Guid AddedByUserId { get; set; }
    public virtual User AddedByUser { get; set; } = null!;
    public DateTime AddedAt { get; set; }
    public string? Caption { get; set; }
}
