namespace BSkyClone.DTOs;

public class UpdateInteractionSettingsRequest
{
    public string? Uri { get; set; }
    public string? ReplyRestriction { get; set; }
    public bool? AllowQuotes { get; set; }
}
