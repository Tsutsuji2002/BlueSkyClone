using BSkyClone.Models;

namespace BSkyClone.Services;

public interface ILinkService
{
    Task<LinkPreview?> GetLinkPreviewAsync(string content);
}
