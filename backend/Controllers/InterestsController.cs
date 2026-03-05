using BSkyClone.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InterestsController : ControllerBase
{
    private readonly BSkyDbContext _context;

    public InterestsController(BSkyDbContext context)
    {
        _context = context;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var interests = await _context.Interests
            .Where(i => i.IsDeleted != true)
            .Select(i => new
            {
                i.Id,
                i.Name,
                UsersCount = i.Users.Count
            })
            .OrderByDescending(i => i.UsersCount)
            .ToListAsync();

        return Ok(interests);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var interest = await _context.Interests
            .Where(i => i.Id == id)
            .Select(i => new
            {
                i.Id,
                i.Name,
                UsersCount = i.Users.Count
            })
            .FirstOrDefaultAsync();

        if (interest == null)
            return NotFound(new { message = "Interest not found" });

        return Ok(interest);
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] CreateInterestRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Interest name is required" });

        // Check if interest already exists
        var exists = await _context.Interests.AnyAsync(i => i.Name.ToLower() == request.Name.ToLower());
        if (exists)
            return BadRequest(new { message = "Interest already exists" });

        var interest = new Interest
        {
            Name = request.Name.Trim(),
            Slug = request.Name.Trim().ToLower().Replace(" ", "-")
        };

        _context.Interests.Add(interest);
        await _context.SaveChangesAsync();

        return Ok(new { id = interest.Id, name = interest.Name, usersCount = 0 });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateInterestRequest request)
    {
        var interest = await _context.Interests.FindAsync(id);
        if (interest == null)
            return NotFound(new { message = "Interest not found" });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Interest name is required" });

        interest.Name = request.Name.Trim();
        interest.Slug = request.Name.Trim().ToLower().Replace(" ", "-");
        await _context.SaveChangesAsync();

        return Ok(new { id = interest.Id, name = interest.Name });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var interest = await _context.Interests.FindAsync(id);
        if (interest == null)
            return NotFound(new { message = "Interest not found" });

        interest.IsDeleted = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Interest deleted successfully" });
    }
}

public record CreateInterestRequest(string Name);
