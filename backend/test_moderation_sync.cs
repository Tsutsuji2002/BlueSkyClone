using BSkyClone.Services;
using BSkyClone.Models;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

// This script verifies the moderation sync logic
// Usage: dotnet run --project backend --script test_moderation_sync.cs

var serviceProvider = new ServiceCollection()
    // Mock or setup real dependencies here if running outside the main app context
    // For simplicity, we assume this is run via a test runner that provides the DI container
    .BuildServiceProvider();

var userService = serviceProvider.GetService<IUserService>();

if (userService == null) {
    Console.WriteLine("UserService not found in DI container.");
    return;
}

// 1. Test Muting
Console.WriteLine("--- Testing Muting ---");
var viewerId = Guid.Parse("YOUR_VIEWER_ID_HERE"); // Replace with a real test user ID
var targetId = Guid.Parse("TARGET_USER_ID_HERE"); // Replace with a real target user ID

var muteResult = await userService.MuteUserAsync(viewerId, targetId);
Console.WriteLine($"Mute result: {muteResult}");

var mutedUsers = await userService.GetMutedUsersAsync(viewerId);
Console.WriteLine($"Muted count: {mutedUsers.Users.Count}");
foreach(var u in mutedUsers.Users) {
    Console.WriteLine($"- {u.Handle} (DID: {u.Did})");
}

// 2. Test Blocking
Console.WriteLine("\n--- Testing Blocking ---");
var blockResult = await userService.BlockUserAsync(viewerId, targetId);
Console.WriteLine($"Block result: {blockResult}");

var blockedUsers = await userService.GetBlockedUsersAsync(viewerId);
Console.WriteLine($"Blocked count: {blockedUsers.Users.Count}");
foreach(var u in blockedUsers.Users) {
    Console.WriteLine($"- {u.Handle} (DID: {u.Did})");
}

// 3. Test Unmuting/Unblocking
Console.WriteLine("\n--- Testing Unmute/Unblock ---");
await userService.UnmuteUserAsync(viewerId, targetId);
await userService.UnblockUserAsync(viewerId, targetId);
Console.WriteLine("Cleanup done.");
