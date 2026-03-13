using System.Threading.Tasks;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services
{
    public class DidResolverService : IDidResolver
    {
        private readonly IUnitOfWork _unitOfWork;

        public DidResolverService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<User?> ResolveDidAsync(string did)
        {
            if (string.IsNullOrEmpty(did)) return null;
            
            return await _unitOfWork.Users.Query()
                .FirstOrDefaultAsync(u => u.Did == did && u.IsDeleted != true);
        }

        public async Task<User?> ResolveHandleAsync(string handle)
        {
            if (string.IsNullOrEmpty(handle)) return null;

            // Handle might not have the full domain suffix in some local contexts, 
            // but AT Protocol usually expects the full handle.
            return await _unitOfWork.Users.Query()
                .FirstOrDefaultAsync(u => u.Handle == handle && u.IsDeleted != true);
        }

        public async Task<string?> GetHandleByDidAsync(string did)
        {
            var user = await ResolveDidAsync(did);
            return user?.Handle;
        }
    }
}
