using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public interface IAccessLogService
{
    Task LogAsync(Guid? userId, string handle, string ipAddress, string? userAgent, string action = "login");
}

public class AccessLogService : IAccessLogService
{
    private readonly BSkyDbContext _context;

    public AccessLogService(BSkyDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(Guid? userId, string handle, string ipAddress, string? userAgent, string action = "login")
    {
        try
        {
            var log = new AccessLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Handle = handle,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Action = action,
                CreatedAt = DateTime.UtcNow
            };
            _context.AccessLogs.Add(log);
            await _context.SaveChangesAsync();
        }
        catch
        {
            // Never let logging crash the application
        }
    }
}
