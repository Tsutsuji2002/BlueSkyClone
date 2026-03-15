using Microsoft.AspNetCore.Mvc;
using BSkyClone.Services;
using BSkyClone.Models;
using System.Threading.Tasks;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Linq;

namespace BSkyClone.Controllers
{
    [ApiController]
    [Route("xrpc")]
    public class IdentityController : ControllerBase
    {
        private readonly IDidResolver _didResolver;
        private readonly IPlcService _plcService;
        private readonly IUserService _userService;

        public IdentityController(IDidResolver didResolver, IPlcService plcService, IUserService userService)
        {
            _didResolver = didResolver;
            _plcService = plcService;
            _userService = userService;
        }

        [HttpGet("com.atproto.identity.resolveHandle")]
        public async Task<IActionResult> ResolveHandle([FromQuery] string handle)
        {
            if (string.IsNullOrEmpty(handle))
            {
                return BadRequest(new { error = "InvalidRequest", message = "Handle is required" });
            }

            var user = await _didResolver.ResolveHandleAsync(handle);
            if (user == null)
            {
                return NotFound(new { error = "HandleNotFound", message = "Handle not found" });
            }

            return Ok(new { did = user.Did });
        }

        [Authorize]
        [HttpPost("com.atproto.identity.updateHandle")]
        public async Task<IActionResult> UpdateHandle([FromBody] UpdateHandleRequest request)
        {
            if (string.IsNullOrEmpty(request.Handle))
            {
                return BadRequest(new { error = "InvalidRequest", message = "Handle is required" });
            }

            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            
            var userId = Guid.Parse(userIdClaim);
            var did = User.FindFirstValue("did");

            // 1. Check if handle is taken
            var existingUser = await _didResolver.ResolveHandleAsync(request.Handle);
            if (existingUser != null && existingUser.Id != userId)
            {
                return BadRequest(new { error = "HandleAlreadyTaken", message = "Handle is already taken" });
            }

            // 2. Update PLC directory (if using did:plc)
            if (did != null && did.StartsWith("did:plc:"))
            {
                var successPlc = await _plcService.UpdateHandleAsync(did, request.Handle);
                if (!successPlc)
                {
                    return StatusCode(500, new { error = "PlcUpdateFailed", message = "Failed to update PLC directory" });
                }
            }

            // 3. Local update
            var successLocal = await _userService.UpdateHandleAsync(userId, request.Handle);
            if (!successLocal)
            {
                return StatusCode(500, new { error = "LocalUpdateFailed", message = "Failed to update local handle state" });
            }
            
            return Ok();
        }

        public class UpdateHandleRequest
        {
            public string Handle { get; set; } = null!;
        }
    }
}
