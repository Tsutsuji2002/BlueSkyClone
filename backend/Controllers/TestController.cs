using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using BSkyClone.Services;

namespace BSkyClone.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class TestController : ControllerBase
    {
        private readonly IPostService _postService;
        public TestController(IPostService postService) { _postService = postService; }

        [HttpGet("bookmarks")]
        public async Task<IActionResult> Get(Guid userId)
        {
            var posts = await _postService.GetBookmarkedPostsAsync(userId);
            return Ok(posts);
        }
    }
}
