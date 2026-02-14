using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;
using System;
using System.IO;
using System.Threading.Tasks;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MediaController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;

    public MediaController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(IFormFile file, [FromQuery] string folder = "chat")
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded");
        }

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest("Invalid file type");
        }

        try
        {
            var uploadsFolder = Path.Combine(_environment.WebRootPath ?? "wwwroot", "uploads", folder);
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var uniqueFileName = Guid.NewGuid().ToString() + extension;
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            var url = $"/uploads/{folder}/{uniqueFileName}";
            return Ok(new { url });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// On-the-fly image resizing endpoint. Returns a resized/compressed version of an image.
    /// Cached on disk to avoid re-processing.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("resize")]
    [ResponseCache(Duration = 86400, Location = ResponseCacheLocation.Any)] // Cache 24h
    public async Task<IActionResult> Resize([FromQuery] string path, [FromQuery] int w = 600, [FromQuery] int q = 80)
    {
        if (string.IsNullOrWhiteSpace(path))
            return BadRequest("Path is required");

        // Clamp values
        w = Math.Clamp(w, 50, 1920);
        q = Math.Clamp(q, 10, 100);

        // Security: Only allow paths within /uploads/
        var cleanPath = path.TrimStart('/');
        if (!cleanPath.StartsWith("uploads/"))
            return BadRequest("Invalid path");

        // Prevent path traversal
        if (cleanPath.Contains(".."))
            return BadRequest("Invalid path");

        var webRoot = _environment.WebRootPath ?? "wwwroot";
        var originalPath = Path.Combine(webRoot, cleanPath.Replace('/', Path.DirectorySeparatorChar));

        if (!System.IO.File.Exists(originalPath))
            return NotFound();

        // Video files: just redirect to original
        var ext = Path.GetExtension(originalPath).ToLowerInvariant();
        var videoExtensions = new[] { ".mp4", ".mov", ".webm", ".ogg", ".m4v" };
        if (videoExtensions.Contains(ext))
            return Redirect($"/{cleanPath}");

        // Check cache
        var cacheDir = Path.Combine(webRoot, "cache", "resized");
        var cacheFileName = $"{Path.GetFileNameWithoutExtension(cleanPath.Replace('/', '_'))}_{w}_{q}.webp";
        var cachePath = Path.Combine(cacheDir, cacheFileName);

        if (System.IO.File.Exists(cachePath))
        {
            var cachedBytes = await System.IO.File.ReadAllBytesAsync(cachePath);
            return File(cachedBytes, "image/webp");
        }

        // Resize image
        try
        {
            using var image = await Image.LoadAsync(originalPath);

            // Only resize if the image is wider than requested
            if (image.Width > w)
            {
                var ratio = (double)w / image.Width;
                var newHeight = (int)(image.Height * ratio);
                image.Mutate(x => x.Resize(w, newHeight));
            }

            // Ensure cache directory exists
            if (!Directory.Exists(cacheDir))
                Directory.CreateDirectory(cacheDir);

            // Save as WebP for best compression
            var encoder = new WebpEncoder { Quality = q };
            using var ms = new MemoryStream();
            await image.SaveAsync(ms, encoder);
            var bytes = ms.ToArray();

            // Write to cache (fire and forget)
            _ = System.IO.File.WriteAllBytesAsync(cachePath, bytes);

            return File(bytes, "image/webp");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[MediaController] Resize error: {ex.Message}");
            // Fallback: serve original
            var originalBytes = await System.IO.File.ReadAllBytesAsync(originalPath);
            var contentType = ext switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".webp" => "image/webp",
                _ => "application/octet-stream"
            };
            return File(originalBytes, contentType);
        }
    }
}
