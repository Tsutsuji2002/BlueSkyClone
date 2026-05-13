#r "nuget: Microsoft.EntityFrameworkCore, 8.0.0"
#r "nuget: Microsoft.EntityFrameworkCore.SqlServer, 8.0.0"
#r "nuget: Microsoft.Extensions.Configuration, 8.0.0"
#r "nuget: Microsoft.Extensions.Configuration.Json, 8.0.0"
#r "nuget: Microsoft.Extensions.DependencyInjection, 8.0.0"
#r "bin/Debug/net8.0/BSkyClone.dll"

using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using BSkyClone.Models;
using System.IO;

var builder = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json");

var config = builder.Build();
var connectionString = config.GetConnectionString("DefaultConnection");

var services = new ServiceCollection();
services.AddDbContext<BSkyDbContext>(options =>
    options.UseSqlServer(connectionString));

using var serviceProvider = services.BuildServiceProvider();
using var context = serviceProvider.GetRequiredService<BSkyDbContext>();

var user1 = await context.Users.FirstOrDefaultAsync(u => u.Handle == "tsutsuji2606.bsky.social");
var user2 = await context.Users.FirstOrDefaultAsync(u => u.Handle == "cassy55.bsky.social");

if (user1 != null) Console.WriteLine($"tsutsuji2606: {user1.Id} ({user1.Did})");
else Console.WriteLine("tsutsuji2606 not found");

if (user2 != null) Console.WriteLine($"cassy55: {user2.Id} ({user2.Did})");
else Console.WriteLine("cassy55 not found");

if (user1 != null && user2 != null)
{
    var follow = await context.UserFollows.FirstOrDefaultAsync(f => f.FollowerId == user1.Id && f.FollowingId == user2.Id);
    Console.WriteLine($"Follow relationship exists: {follow != null}");
    if (follow != null) Console.WriteLine($"Follow Uri: {follow.Uri}");
}
