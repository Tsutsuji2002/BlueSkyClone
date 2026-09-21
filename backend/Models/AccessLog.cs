namespace BSkyClone.Models;

public class AccessLog
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Handle { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string? UserAgent { get; set; }
    public string Action { get; set; } = "login";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual User? User { get; set; }
}
