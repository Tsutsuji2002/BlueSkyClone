using System;
using System.Threading.Tasks;
using BSkyClone.Models;

namespace BSkyClone.Services
{
    public interface IDidResolver
    {
        /// <summary>
        /// Resolves a DID (e.g., did:plc:123) to a local User object.
        /// </summary>
        Task<User?> ResolveDidAsync(string did);

        /// <summary>
        /// Resolves a Handle (e.g., alice.bsky.social) to a local User object.
        /// </summary>
        Task<User?> ResolveHandleAsync(string handle);

        /// <summary>
        /// Resolves a DID to its current Handle.
        /// </summary>
        Task<string?> GetHandleByDidAsync(string did);
    }
}
