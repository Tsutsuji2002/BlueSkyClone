using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

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
            
            results.Add("=== MST Tests Completed ===");
            await System.IO.File.WriteAllLinesAsync("mst_test_results.txt", results);
            Console.WriteLine("MST results written to mst_test_results.txt");
        }
    }
}
