using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using BSkyClone.Models;
using Microsoft.Extensions.DependencyInjection;

namespace BSkyClone.Diagnostics
{
    public class DbCheck
    {
        public static async Task Main(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<BSkyDbContext>();
            optionsBuilder.UseSqlServer("Server=LAPTOP-S340\\SQLEXPRESS;Database=BlueSkyClone;Trusted_Connection=True;TrustServerCertificate=True;");

            using var context = new BSkyDbContext(optionsBuilder.Options);
            try
            {
                var count = await context.Posts.CountAsync();
                Console.WriteLine($"Total posts in DB: {count}");

                var posts = await context.Posts
                    .Include(p => p.Author)
                    .Include(p => p.PostMedia)
                    .Take(5)
                    .ToListAsync();

                foreach (var p in posts)
                {
                    Console.WriteLine($"Post ID: {p.Id}, Tid: {p.Tid}, Author: {p.Author?.Handle ?? "NULL"}, Cid: {p.Cid ?? "NULL"}");
                    foreach (var m in p.PostMedia)
                    {
                        Console.WriteLine($"  - Media Type: {m.Type}, Cid: {m.Cid ?? "NULL"}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"DIAGNOSTIC ERROR: {ex.Message}");
                if (ex.InnerException != null) Console.WriteLine($"INNER: {ex.InnerException.Message}");
            }
        }
    }
}
