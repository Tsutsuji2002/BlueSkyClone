using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BSkyClone.Utilities;

namespace BSkyClone.Services
{
    public class RepoManager : IRepoManager
    {
        private readonly BSkyDbContext _dbContext;

        public RepoManager(BSkyDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<string> CreateRecordAsync(string did, string collection, object record)
        {
            var json = JsonSerializer.Serialize(record);
            var data = Encoding.UTF8.GetBytes(json);
            
            // In a real AT Proto PDS, this would be a dag-cbor CID.
            var cid = ProtocolUtils.GenerateCid(data);

            var block = new RepoBlock
            {
                Cid = cid,
                Data = data,
                Did = did,
                CreatedAt = DateTime.UtcNow
            };

            // Check if block already exists
            var existing = await _dbContext.RepoBlocks.FindAsync(cid);
            if (existing == null)
            {
                _dbContext.RepoBlocks.Add(block);
                await _dbContext.SaveChangesAsync();
            }

            return cid;
        }

        public async Task<RepoBlock?> GetBlockAsync(string cid)
        {
            return await _dbContext.RepoBlocks.FindAsync(cid);
        }

        public async Task<byte[]> GetRepoCheckoutAsync(string did)
        {
            // In a real PDS, this would return a .car file containing the MST.
            // For now, we'll return a concatenated byte array of all blocks for that DID.
            var blocks = await _dbContext.RepoBlocks
                .Where(b => b.Did == did)
                .OrderBy(b => b.CreatedAt)
                .ToListAsync();

            using var ms = new MemoryStream();
            foreach (var block in blocks)
            {
                ms.Write(block.Data, 0, block.Data.Length);
            }
            return ms.ToArray();
        }


    }
}
