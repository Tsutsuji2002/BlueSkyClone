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

        private readonly MstService _mst;

        public RepoManager(BSkyDbContext dbContext, ICryptoService crypto, MstService mst)
        {
            _dbContext = dbContext;
            _crypto = crypto;
            _mst = mst;
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

            // Update MST
            // Key is collection/rkey. Since rkey is not passed, we'll try to find it in record or generate a TID
            string rkey = ProtocolUtils.GenerateTid();
            if (record is IDictionary<string, object> dict && dict.ContainsKey("$tid")) rkey = dict["$tid"].ToString();
            
            string mstKey = $"{collection}/{rkey}";
            var newRoot = await _mst.UpdateRecordAsync(did, mstKey, cid);

            // Sign the repo with the new root
            await SignRepoAsync(did, newRoot);

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
            var commitCid = ProtocolUtils.GenerateCid(commitBytes);
            var sig = _crypto.Sign(commitBytes, privateKey);
            var sigHex = Convert.ToHexString(sig);

            // 4. Store Commit Block
            var commitBlock = new RepoBlock
            {
                Cid = commitCid,
                Data = commitBytes,
                Did = user.Did,
                CreatedAt = DateTime.UtcNow
            };
            var existing = await _dbContext.RepoBlocks.FindAsync(commitCid);
            if (existing == null)
            {
                _dbContext.RepoBlocks.Add(commitBlock);
            }

            // 5. Update User state
            user.RepoRev = rev;
            user.RepoRoot = dataCid;
            user.RepoCommit = commitCid;
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
            using var ms = await GetRepoCheckoutStreamAsync(did);
            return ((MemoryStream)ms).ToArray();
        }

        public async Task<Stream> GetRepoCheckoutStreamAsync(string did)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Did == did);
            if (user == null) throw new Exception("User not found");

            var blocks = await _dbContext.RepoBlocks
                .Where(b => b.Did == did)
                .OrderBy(b => b.CreatedAt)
                .ToListAsync();

            var ms = new MemoryStream();
            
            // Write CAR v1 header with the current repo root
            await CarUtils.WriteHeaderAsync(ms, user.RepoRoot);

            foreach (var block in blocks)
            {
                await CarUtils.WriteBlockAsync(ms, block.Cid, block.Data);
            }

            ms.Position = 0;
            return ms;
        }

        public async Task<string?> GetLatestCommitAsync(string did)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Did == did);
            return user?.RepoCommit;
        }


        public async Task<string> UploadBlobAsync(string did, System.IO.Stream stream, string mimeType)
        {
            using var ms = new System.IO.MemoryStream();
            await stream.CopyToAsync(ms);
            var data = ms.ToArray();

            // Generate CID for the raw data
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
    }
}
