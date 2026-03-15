using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using BSkyClone.Services;

namespace BSkyClone.Utilities
{
    public static class MstTestRunner
    {
        public static async Task RunTests(IServiceProvider services)
        {
            var results = new List<string>();
            results.Add("=== MST Logic Verification ===");
            var dbContext = services.GetRequiredService<BSkyDbContext>();
            var mst = services.GetRequiredService<MstService>();

            try 
            {
                // Create a test user if needed or use a dummy DID
                string suffix = Guid.NewGuid().ToString().Substring(0, 8);
                string testDid = "did:plc:msttest" + suffix;
                var user = new User { 
                    Did = testDid, 
                    Username = "msttest" + suffix, 
                    Handle = "msttest" + suffix + ".bsky.social", 
                    Email = testDid + "@test.com", 
                    PasswordHash = "x", 
                    Salt = "x" 
                };
                dbContext.Users.Add(user);
                await dbContext.SaveChangesAsync();

                var records = new Dictionary<string, string>
                {
                    { "app.bsky.feed.post/1", "bafyreib1" },
                    { "app.bsky.feed.post/2", "bafyreib2" },
                    { "app.bsky.feed.post/3", "bafyreib3" },
                    { "app.bsky.feed.post/4", "bafyreib4" },
                    { "app.bsky.feed.post/5", "bafyreib5" },
                    { "app.bsky.feed.post/6", "bafyreib6" },
                    { "app.bsky.feed.post/7", "bafyreib7" },
                    { "app.bsky.feed.post/8", "bafyreib8" },
                    { "app.bsky.feed.post/9", "bafyreib9" }
                };

                // Test 1: Insertion order doesn't change root CID
                results.Add("Test 1: Determinism (Insertion Order)");
                
                // Order A
                string rootA = null;
                user.RepoRoot = null; // Reset
                await dbContext.SaveChangesAsync();
                foreach (var kv in records)
                {
                    results.Add($"  Inserting {kv.Key}...");
                    rootA = await mst.UpdateRecordAsync(testDid, kv.Key, kv.Value);
                    results.Add($"  New Root: {rootA}");
                }
                results.Add($"Root A: {rootA}");

                // Order B (Reverse)
                string suffixB = Guid.NewGuid().ToString().Substring(0, 8);
                string testDidB = "did:plc:msttest" + suffixB;
                var userB = new User { 
                    Did = testDidB, 
                    Username = "msttest" + suffixB, 
                    Handle = "msttest" + suffixB + ".bsky.social", 
                    Email = testDidB + "@test.com", 
                    PasswordHash = "x", 
                    Salt = "x" 
                };
                dbContext.Users.Add(userB);
                await dbContext.SaveChangesAsync();

                string rootB = null;
                foreach (var kv in records.Reverse())
                {
                    results.Add($"  Inserting {kv.Key} (Reverse)...");
                    rootB = await mst.UpdateRecordAsync(testDidB, kv.Key, kv.Value);
                    results.Add($"  New Root: {rootB}");
                }
                results.Add($"Root B: {rootB}");

                if (rootA == rootB)
                {
                    results.Add("SUCCESS: Root CIDs match regardless of insertion order.");
                }
                else
                {
                    results.Add("FAILURE: Root CIDs do not match!");
                }

                // Cleanup
                dbContext.Users.Remove(user);
                dbContext.Users.Remove(userB);
                await dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                results.Add($"ERROR: {ex.Message}");
                var inner = ex.InnerException;
                while (inner != null)
                {
                    results.Add($"INNER ERROR: {inner.Message}");
                    inner = inner.InnerException;
                }
                results.Add(ex.StackTrace);
            }
        }
        public static async Task SeedRepo(IServiceProvider services)
        {
            try
            {
                var dbContext = services.GetRequiredService<BSkyDbContext>();
                var mst = services.GetRequiredService<MstService>();
                var repo = services.GetRequiredService<IRepoManager>();

                string testDid = "did:plc:sync-test-user";
                var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Did == testDid);
                
                if (user == null)
                {
                    user = new User 
                    { 
                        Did = testDid, 
                        Username = "synctest", 
                        Handle = "synctest.test", 
                        Email = "sync@test.com", 
                        PasswordHash = "x", 
                        Salt = "x" 
                    };
                    dbContext.Users.Add(user);
                    await dbContext.SaveChangesAsync();
                    
                    // Ensure user has signing keys (SignRepoAsync needs them)
                    var crypto = services.GetRequiredService<ICryptoService>();
                    var keys = crypto.GenerateSecp256k1Keypair();
                    user.EncryptedSigningPrivateKey = crypto.EncryptPrivateKey(keys.privateKey);
                    user.SigningPublicKey = keys.publicKey;
                    await dbContext.SaveChangesAsync();
                }

                var records = new Dictionary<string, string>
                {
                    { "app.bsky.feed.post/1", "bafyreib-post1" },
                    { "app.bsky.feed.post/2", "bafyreib-post2" },
                    { "app.bsky.feed.post/3", "bafyreib-post3" }
                };

                Console.WriteLine($"Seeding repo for {testDid}...");
                foreach (var kv in records)
                {
                    var rec = new Dictionary<string, object>
                    {
                        { "text", kv.Value },
                        { "createdAt", DateTime.UtcNow.ToString("o") }
                    };
                    await repo.CreateRecordAsync(testDid, kv.Key.Split('/')[0], rec);
                }
                Console.WriteLine("Seeding completed.");
            }
            catch (Exception ex)
            {
                var errorLines = new List<string>
                {
                    $"SEED ERROR: {ex.Message}",
                    ex.StackTrace ?? ""
                };
                if (ex.InnerException != null)
                {
                    errorLines.Add($"INNER: {ex.InnerException.Message}");
                    errorLines.Add(ex.InnerException.StackTrace ?? "");
                }
                System.IO.File.WriteAllLines("seed_error.txt", errorLines);
                Console.WriteLine("Seed failed. Error written to seed_error.txt");
            }
        }
    }
}
