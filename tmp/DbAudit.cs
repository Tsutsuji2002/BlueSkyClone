using System;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public class DbAudit
{
    public static async Task Run(IServiceProvider services)
    {
        var db = services.GetRequiredService<BSkyDbContext>();
        var corruptedPosts = await db.Posts
            .Where(p => p.Uri != null && p.Uri.StartsWith("at://did:plc:"))
            .ToListAsync();
        
        var corruptedAuthors = await db.Users
            .Where(u => u.Did != null && u.Did.Contains(".") && u.Did.StartsWith("did:plc:"))
            .ToListAsync();

        Console.WriteLine($"Found {corruptedPosts.Count} corrupted posts (URI starting with at://did:plc:handle)");
        foreach(var p in corruptedPosts.Take(5)) Console.WriteLine($" - {p.Uri}");
        
        Console.WriteLine($"Found {corruptedAuthors.Count} corrupted users (DID containing a dot/handle)");
        foreach(var u in corruptedAuthors.Take(5)) Console.WriteLine($" - {u.Did} ({u.Handle})");
    }
}
