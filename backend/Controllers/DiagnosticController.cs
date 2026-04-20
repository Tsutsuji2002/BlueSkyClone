using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using BSkyClone.DTOs;
using System.Collections.Generic;

namespace BSkyClone.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DiagnosticController : ControllerBase
    {
        private readonly IPostService _postService;
        public DiagnosticController(IPostService postService) { _postService = postService; }

        [Authorize]
        [HttpGet("bookmarks")]
        public async Task<IActionResult> DebugBookmarks()
        {
            try
            {
                var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

                var pagedResult = await _postService.GetBookmarkedPostsAsync(userId);
                
                string debugInfo = $"UserId: {userId}\n";
                debugInfo += $"Count: {pagedResult.Posts.Count()}\n";
                foreach (var p in pagedResult.Posts) {
                    debugInfo += $"\nPost {p.Id}:\n- isBookmarked: {p.IsBookmarked}\n- isLiked: {p.IsLiked}\n- LinkPreview: {p.LinkPreview != null}\n- MediaCount: {p.Media.Count}\n- Uri: {p.Uri}";
                }
                return Ok(new { debug = debugInfo });
            }
            catch (Exception ex)
            {
                return Ok(new { error = ex.ToString() });
            }
        }
    }
}
