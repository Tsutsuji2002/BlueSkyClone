using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BSkyClone.Utilities;
using Microsoft.Extensions.Caching.Distributed;
using System.Net.Http;
using System.Net.Http.Headers;

namespace BSkyClone.Services
{
    public class RepoManager : IRepoManager
    {
        private readonly BSkyDbContext _dbContext;
        private readonly ICryptoService _crypto;
        private readonly MstService _mst;
        private readonly IDistributedCache _cache;

        public RepoManager(BSkyDbContext dbContext, ICryptoService crypto, MstService mst, IDistributedCache cache)
        {
            _dbContext = dbContext;
            _crypto = crypto;
            _mst = mst;
            _cache = cache;
        }

        public async Task<string> CreateRecordAsync(string did, string collection, object record, string? rkey = null)
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
            // Key is collection/rkey.
            if (string.IsNullOrEmpty(rkey))
            {
                rkey = ProtocolUtils.GenerateTid();
                if (record is IDictionary<string, object> dict && dict.ContainsKey("$tid")) rkey = dict["$tid"].ToString() ?? rkey;
            }
            
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

        public async Task DeleteRecordAsync(string did, string collection, string rkey)
        {
            // 1. Try to proxy delete to official PDS if user is logged in
            try
            {
                var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Did == did);
                if (user != null)
                {
                    var token = await _cache.GetStringAsync($"BlueskyToken_{user.Id}");
                    if (!string.IsNullOrEmpty(token))
                    {
                        using var client = new HttpClient();
                        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
                        
                        var payload = new { repo = did, collection = collection, rkey = rkey };
                        var jsonPayload = JsonSerializer.Serialize(payload);
                        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                        
                        var response = await client.PostAsync("https://bsky.social/xrpc/com.atproto.repo.deleteRecord", content);
                        if (response.IsSuccessStatusCode)
                        {
                            await File.AppendAllTextAsync("C:\\Projects\\BlueSky\\backend\\debug_bsky.txt", $"[RepoManager] Remote Record Delete SUCCESS: {collection}/{rkey} for {did}\n");
                            Console.WriteLine($"[RepoManager] Proxied record delete to BlueSky: {collection}/{rkey}");
                        }
                        else
                        {
                            var error = await response.Content.ReadAsStringAsync();
                            await File.AppendAllTextAsync("C:\\Projects\\BlueSky\\backend\\debug_bsky.txt", $"[RepoManager] Remote Record Delete FAILED: {response.StatusCode} - {error}\n");
                            Console.WriteLine($"[RepoManager] Bluesky Record Delete Failed: {response.StatusCode} - {error}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RepoManager] Error proxying record delete: {ex.Message}");
            }

            // 2. Perform local MST update (Sync local state)
            string mstKey = $"{collection}/{rkey}";
            var newRoot = await _mst.DeleteRecordAsync(did, mstKey);

            // Sign the repo with the new root
            if (!string.IsNullOrEmpty(newRoot))
            {
                await SignRepoAsync(did, newRoot);
            }
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
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => 
                (u.Did != null && u.Did.ToLower() == did.ToLower()) || 
                (u.Handle != null && u.Handle.ToLower() == did.ToLower()));
            
            if (user == null) 
            {
                Console.WriteLine($"[RepoManager] GetRepo: User not found for DID: {did}");
                throw new Exception("User not found");
            }

            if (string.IsNullOrEmpty(user.RepoRoot))
            {
                Console.WriteLine($"[RepoManager] GetRepo: User {did} has no RepoRoot. Returning empty CAR.");
            }

            var blocks = await _dbContext.RepoBlocks
                .Where(b => b.Did == user.Did)
                .OrderBy(b => b.CreatedAt)
                .ToListAsync();

            var ms = new MemoryStream();
            
            // Write CAR v1 header. If root is null, use empty string to avoid crashes.
            await CarUtils.WriteHeaderAsync(ms, user.RepoRoot ?? "");

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

        public async Task FetchRemoteRepoAsync(string did, string serviceEndpoint)
        {
            // Placeholder: In a full implementation, this would call com.atproto.sync.getRepo
            // and ingest all blocks into our local RepoBlocks table.
            // For Phase 17, we are using social-level sync (app.bsky.feed.getAuthorFeed) in PostService.
            await Task.CompletedTask;
        }


        public async Task<string> UploadBlobAsync(string did, System.IO.Stream stream, string mimeType)
        {
            // 1. Try to proxy to official PDS if user is logged in
            try
            {
                var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Did == did);
                if (user != null)
                {
                    var token = await _cache.GetStringAsync($"BlueskyToken_{user.Id}");
                    if (!string.IsNullOrEmpty(token))
                    {
                        using var client = new HttpClient();
                        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
                        
                        var content = new StreamContent(stream);
                        content.Headers.ContentType = new MediaTypeHeaderValue(mimeType);
                        
                        var response = await client.PostAsync("https://bsky.social/xrpc/com.atproto.repo.uploadBlob", content);
                        if (response.IsSuccessStatusCode)
                        {
                            var responseBody = await response.Content.ReadAsStringAsync();
                            var json = JsonDocument.Parse(responseBody);
                            var cid = json.RootElement.GetProperty("blob").GetProperty("ref").GetProperty("$link").GetString();
                            
                            if (!string.IsNullOrEmpty(cid))
                            {
                                await File.AppendAllTextAsync("C:\\Projects\\BlueSky\\backend\\debug_bsky.txt", $"[RepoManager] Blob Upload SUCCESS, CID: {cid}\n");
                                Console.WriteLine($"[RepoManager] Proxied blob upload to BlueSky, CID: {cid}");
                                return cid;
                            }
                        }
                        else
                        {
                            var error = await response.Content.ReadAsStringAsync();
                            await File.AppendAllTextAsync("C:\\Projects\\BlueSky\\backend\\debug_bsky.txt", $"[RepoManager] Blob Upload FAILED: {response.StatusCode} - {error}\n");
                            Console.WriteLine($"[RepoManager] Bluesky Blob Upload Failed: {response.StatusCode} - {error}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RepoManager] Error proxying blob upload: {ex.Message}");
            }

            // Fallback: Local CID generation (won't federate correctly for remote users)
            stream.Position = 0;
            using var ms = new System.IO.MemoryStream();
            await stream.CopyToAsync(ms);
            var data = ms.ToArray();

            var localCid = ProtocolUtils.GenerateCid(data, 0x55);
            var block = new RepoBlock
            {
                Cid = localCid,
                Data = data,
                Did = did,
                CreatedAt = DateTime.UtcNow
            };

            var existing = await _dbContext.RepoBlocks.FindAsync(localCid);
            if (existing == null)
            {
                _dbContext.RepoBlocks.Add(block);
                await _dbContext.SaveChangesAsync();
            }

            return localCid;
        }
    }
}
