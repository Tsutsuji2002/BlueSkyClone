using Microsoft.AspNetCore.Mvc;
using BSkyClone.Services;
using BSkyClone.Utilities;
using Microsoft.EntityFrameworkCore;
using BSkyClone.Models;

namespace BSkyClone.Controllers
{
    [ApiController]
    [Route("xrpc")]
    public class SyncController : ControllerBase
    {
        private readonly IRepoManager _repo;
        private readonly BSkyDbContext _dbContext;

        public SyncController(IRepoManager repo, BSkyDbContext dbContext)
        {
            _repo = repo;
            _dbContext = dbContext;
        }

        [HttpGet("com.atproto.sync.getRepo")]
        public async Task<IActionResult> GetRepo(string did, string? since = null)
        {
            try
            {
                var stream = await _repo.GetRepoCheckoutStreamAsync(did);
                return File(stream, "application/vnd.ipld.car", $"{did}.car");
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "InvalidRequest", message = ex.Message });
            }
        }

        [HttpGet("com.atproto.sync.getLatestCommit")]
        public async Task<IActionResult> GetLatestCommit(string did)
        {
            var commitCid = await _repo.GetLatestCommitAsync(did);
            if (commitCid == null) return NotFound(new { error = "RepoNotFound" });

            return Ok(new
            {
                cid = commitCid,
                rev = "" // Rev should be fetched from user if needed
            });
        }

        [HttpGet("com.atproto.sync.getBlocks")]
        public async Task<IActionResult> GetBlocks(string did, [FromQuery] List<string> cids)
        {
            try
            {
                var ms = new MemoryStream();
                // For getBlocks, AT Protocol often omits the header roots or uses a dummy.
                // We'll write a simple header with the first CID or empty roots.
                await CarUtils.WriteHeaderAsync(ms, cids.Count > 0 ? cids[0] : "");

                foreach (var cid in cids)
                {
                    var block = await _repo.GetBlockAsync(cid);
                    if (block != null && block.Did == did)
                    {
                        await CarUtils.WriteBlockAsync(ms, block.Cid, block.Data);
                    }
                }

                ms.Position = 0;
                return File(ms, "application/vnd.ipld.car", "blocks.car");
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "InvalidRequest", message = ex.Message });
            }
        }

        [HttpGet("com.atproto.sync.listRepos")]
        public async Task<IActionResult> ListRepos(int limit = 50, string? cursor = null)
        {
            var users = await _dbContext.Users
                .Where(u => !string.IsNullOrEmpty(u.RepoCommit))
                .Take(limit)
                .Select(u => new { did = u.Did, head = u.RepoCommit })
                .ToListAsync();

            return Ok(new
            {
                repos = users
            });
        }
        
        [HttpGet("com.atproto.sync.getCheckout")]
        public async Task<IActionResult> GetCheckout(string did)
        {
            // Legacy/Alias for getRepo
            return await GetRepo(did);
        }
    }
}
