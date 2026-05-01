using Microsoft.EntityFrameworkCore;
using BSkyClone.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.IO;
using System.Text.Json;

class Program
{
    static async Task Main()
    {
        var connectionString = "Server=LAPTOP-S340\\SQLEXPRESS;Database=BlueSkyClone;Trusted_Connection=True;TrustServerCertificate=True;";
        var optionsBuilder = new DbContextOptionsBuilder<BSkyDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        using (var context = new BSkyDbContext(optionsBuilder.Options))
        {
            var did = "did:plc:jrwqqeyrvd3sl4hxv7lqaarh";
            var email = $"{did}@remote.bsky.social";
            
            // Check email conflict
            var emailConflict = await context.Users
                .Where(u => u.Email == email)
                .Select(u => new { u.Id, u.Did, u.Email, u.Handle })
                .ToListAsync();
            
            Console.WriteLine($"Email conflict check for: {email}");
            if (emailConflict.Count == 0)
                Console.WriteLine("  No email conflict.");
            else
                foreach (var u in emailConflict)
                    Console.WriteLine($"  CONFLICT: Id={u.Id} Did={u.Did} Handle={u.Handle}");

            // Check if already inserted by previous TestConsole run
            var byDid = await context.Users.FirstOrDefaultAsync(u => u.Did == did);
            if (byDid != null)
                Console.WriteLine($"\nDID record: Id={byDid.Id} Email={byDid.Email} Handle={byDid.Handle}");
            else
                Console.WriteLine($"\nNo record by DID.");
        }
    }
}
