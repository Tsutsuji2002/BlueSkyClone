using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using BSkyClone.DTOs;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SupportRequestController : ControllerBase
{
    private readonly ISupportRequestService _supportService;

    public SupportRequestController(ISupportRequestService supportService)
    {
        _supportService = supportService;
    }

    [HttpPost]
    public async Task<IActionResult> SubmitRequest([FromBody] CreateSupportRequestDto dto)
    {
        Guid? userId = null;
        if (User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(userIdClaim, out var parsedId))
            {
                userId = parsedId;
            }
        }

        var result = await _supportService.SubmitRequestAsync(dto, userId);
        return Ok(result);
    }

    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAllRequests()
    {
        var result = await _supportService.GetAllRequestsAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetRequestById(Guid id)
    {
        var result = await _supportService.GetRequestByIdAsync(id);
        if (result == null) return NotFound(new { message = "Request not found" });
        return Ok(result);
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateSupportRequestStatusDto dto)
    {
        var success = await _supportService.UpdateStatusAsync(id, dto.Status);
        if (!success) return NotFound(new { message = "Request not found" });
        return Ok(new { message = "Status updated successfully" });
    }
}
