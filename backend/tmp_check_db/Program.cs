using Microsoft.EntityFrameworkCore;
using BSkyClone.Models;
using System.Linq;
using System;

try
{
    var optionsBuilder = new DbContextOptionsBuilder<BSkyDbContext>();
    optionsBuilder.UseSqlite("Data Source=C:\\Projects\\BlueSky\\backend\\bskyclone.db");

    using var context = new BSkyDbContext(optionsBuilder.Options);
    var post = context.Posts.Include(p => p.Hashtags).FirstOrDefault(p => p.Tid == "3mn4lfahghk2n");

    if (post == null)
    {
        Console.WriteLine("Post not found in DB.");
    }
    else
    {
        Console.WriteLine($"Found Post: {post.Id}, Content: {post.Content}");
        Console.WriteLine("Hashtags:");
        foreach (var h in post.Hashtags)
        {
            Console.WriteLine($"- {h.Name} (Slug: {h.Slug})");
        }
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
}
