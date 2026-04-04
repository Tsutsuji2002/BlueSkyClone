using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Linq;
using System.Threading.Tasks;

class DbCheck
{
    static async Task Main(string[] args)
    {
        var services = new ServiceCollection();
        // Manual setup for DI to access DB
        // This is tricky without the full Program.cs setup, 
        // but I can just use a raw DbContext if I have the connection string.
        
        string connectionString = "Server=LAPTOP-S340\\SQLEXPRESS;Database=BlueSkyClone;Trusted_Connection=True;TrustServerCertificate=True;";
        var optionsBuilder = new DbContextOptionsBuilder<BSkyDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        using (var context = new BSkyDbContext(optionsBuilder.Options))
        {
            var words = await context.MutedWords.ToListAsync();
            Console.WriteLine($"Total MutedWords: {words.Count}");
            foreach (var w in words)
            {
                Console.WriteLine($"User: {w.UserId}, Word: {w.Word}, Targets: {w.Targets}, Behavior: {w.MuteBehavior}");
            }

            var users = await context.Users.Select(u => new { u.Id, u.Handle }).ToListAsync();
            Console.WriteLine("\nUsers:");
            foreach (var u in users)
            {
                Console.WriteLine($"{u.Id} -> {u.Handle}");
            }
        }
    }
}
