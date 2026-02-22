using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace BSkyClone.Services;

public interface IFileService
{
    void DeleteFile(string? relativePath);
}

public class FileService : IFileService
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<FileService> _logger;

    public FileService(IWebHostEnvironment environment, ILogger<FileService> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public void DeleteFile(string? relativePath)
    {
        if (string.IsNullOrEmpty(relativePath)) return;

        try
        {
            // relativePath is like "/uploads/avatars/uuid.jpg"
            // We need to strip the leading slash if it exists
            var path = relativePath.TrimStart('/');
            var fullPath = Path.Combine(_environment.WebRootPath ?? "wwwroot", path);

            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
                _logger.LogInformation("Deleted file: {Path}", fullPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file: {Path}", relativePath);
        }
    }
}
