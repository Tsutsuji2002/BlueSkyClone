using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.DTOs;
using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public class SupportRequestService : ISupportRequestService
{
    private readonly BSkyDbContext _context;

    public SupportRequestService(BSkyDbContext context)
    {
        _context = context;
    }

    public async Task<SupportRequestDto> SubmitRequestAsync(CreateSupportRequestDto dto, Guid? userId)
    {
        var request = new SupportRequest
        {
            Email = dto.Email,
            Description = dto.Description,
            Username = dto.Username,
            Category = dto.Category,
            DeviceType = dto.DeviceType,
            UserId = userId,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.SupportRequests.Add(request);
        await _context.SaveChangesAsync();

        return MapToDto(request);
    }

    public async Task<IEnumerable<SupportRequestDto>> GetAllRequestsAsync()
    {
        var requests = await _context.SupportRequests
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return requests.Select(MapToDto);
    }

    public async Task<SupportRequestDto?> GetRequestByIdAsync(Guid id)
    {
        var request = await _context.SupportRequests.FindAsync(id);
        if (request == null) return null;

        return MapToDto(request);
    }

    public async Task<bool> UpdateStatusAsync(Guid id, string status)
    {
        var request = await _context.SupportRequests.FindAsync(id);
        if (request == null) return false;

        request.Status = status;
        await _context.SaveChangesAsync();

        return true;
    }

    private SupportRequestDto MapToDto(SupportRequest request)
    {
        return new SupportRequestDto
        {
            Id = request.Id,
            Email = request.Email,
            Description = request.Description,
            Username = request.Username,
            Category = request.Category,
            DeviceType = request.DeviceType,
            Status = request.Status,
            CreatedAt = request.CreatedAt,
            UserId = request.UserId
        };
    }
}
