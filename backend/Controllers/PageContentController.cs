using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BSkyClone.Models;
using BSkyClone.DTOs;
using System.Threading.Tasks;
using System;

namespace BSkyClone.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PageContentController : ControllerBase
    {
        private readonly BSkyDbContext _context;

        public PageContentController(BSkyDbContext context)
        {
            _context = context;
        }

        // GET: api/PageContent/{slug}
        [HttpGet("{slug}")]
        public async Task<ActionResult<PageContentDto>> GetPageContent(string slug)
        {
            var content = await _context.PageContents.FindAsync(slug);

            if (content == null)
            {
                return NotFound();
            }

            return new PageContentDto
            {
                Slug = content.Slug,
                Title = content.Title,
                HtmlContent = content.HtmlContent,
                UpdatedAt = content.UpdatedAt
            };
        }

        // PUT: api/PageContent/{slug}
        [HttpPut("{slug}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdatePageContent(string slug, [FromBody] UpdatePageContentDto updateDto)
        {
            var content = await _context.PageContents.FindAsync(slug);

            if (content == null)
            {
                return NotFound();
            }

            content.Title = updateDto.Title;
            content.HtmlContent = updateDto.HtmlContent;
            content.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await PageContentExists(slug))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        private async Task<bool> PageContentExists(string slug)
        {
            return await _context.PageContents.AnyAsync(e => e.Slug == slug);
        }
    }
}
