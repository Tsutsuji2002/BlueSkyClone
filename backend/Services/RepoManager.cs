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
        private readonly ICryptoService _crypto;

        public RepoManager(BSkyDbContext dbContext, ICryptoService crypto)
        {
            _dbContext = dbContext;
            _crypto = crypto;
        }

        public async Task<string> CreateRecordAsync(string did, string collection, object record)
        {
            // Use deterministic DAG-CBOR for the record
            var data = CborUtils.Encode(record);
            
            // Generate protocol-compliant CID
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

            // In a full implementation, we would now update the MST and sign the Repo Commit.
            // For Phase 3, we've successfully moved to binary CBOR storage.
            return cid;
        }

        public async Task<string> SignRepoAsync(string identity, string dataCid)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => 
                u.Did == identity || u.Handle == identity || u.Username == identity || u.Id.ToString() == identity);
            
            if (user == null) throw new Exception($"User '{identity}' not found.");
            
            if (string.IsNullOrEmpty(user.EncryptedSigningPrivateKey))
                throw new Exception("User has no signing identity. Please log in again to generate one.");

            // 1. Decrypt private key
            var privateKey = _crypto.DecryptPrivateKey(user.EncryptedSigningPrivateKey);

            // 2. Prepare Commit Object (Simplified AT Protocol format)
            var rev = ProtocolUtils.GenerateTid();
            var commitData = new Dictionary<string, object>
            {
                { "did", user.Did },
                { "rev", rev },
                { "data", dataCid },
                { "version", 3 }
            };

            // 3. Serialize and Sign
            var commitBytes = CborUtils.Encode(commitData);
            var sig = _crypto.Sign(commitBytes, privateKey);
            var sigHex = Convert.ToHexString(sig);

            // 4. Update User state
            user.RepoRev = rev;
            user.RepoCommitSignature = sigHex;
            
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync();

            return sigHex;
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
