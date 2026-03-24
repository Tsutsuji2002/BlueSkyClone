using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace BSkyClone.Services
{
    public class DidResolverService : IDidResolver
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly HttpClient _httpClient;
        private readonly string _plcDirectory;
        private readonly string _localDomain;

        public DidResolverService(IUnitOfWork unitOfWork, IConfiguration configuration)
        {
            _unitOfWork = unitOfWork;
            _httpClient = new HttpClient();
            _plcDirectory = configuration["PlcDirectory"] ?? "https://plc.directory";
            _localDomain = configuration["DomainName"] ?? "bskyclone.site";
        }

        public async Task<User?> ResolveDidAsync(string did)
        {
            if (string.IsNullOrEmpty(did)) return null;
            
            return await _unitOfWork.Users.Query()
                .FirstOrDefaultAsync(u => u.Did == did && u.IsDeleted != true);
        }

        public async Task<User?> ResolveHandleAsync(string handle)
        {
            if (string.IsNullOrEmpty(handle)) return null;

            // 1. Check local users
            var localUser = await _unitOfWork.Users.Query()
                .FirstOrDefaultAsync(u => u.Handle == handle && u.IsDeleted != true);
            
            if (localUser != null) return localUser;

            // 2. External resolution (Handle to DID)
            // A. DNS TXT record (skipping for now, requires DNS lookup)
            // B. HTTP .well-known
            try
            {
                var response = await _httpClient.GetAsync($"https://{handle}/.well-known/atproto-did");
                if (response.IsSuccessStatusCode)
                {
                    var did = await response.Content.ReadAsStringAsync();
                    return new User { Did = did.Trim(), Handle = handle }; // Dummy user for external DIDs
                }
            }
            catch { /* Skip and continue */ }

            // C. Fallback to bsky.social AppView for handle resolution
            try
            {
                var response = await _httpClient.GetAsync($"https://api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle={handle}");
                if (response.IsSuccessStatusCode)
                {
                    var data = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
                    if (data != null && data.TryGetValue("did", out var did))
                    {
                        return new User { Did = did.Trim(), Handle = handle };
                    }
                }
            }
            catch { /* Skip and continue */ }

            return null;
        }

        public async Task<DidDocument?> ResolveToDocumentAsync(string did)
        {
            if (string.IsNullOrEmpty(did)) return null;

            if (did.StartsWith("did:plc:"))
            {
                return await ResolvePlcDidAsync(did);
            }
            else if (did.StartsWith("did:web:"))
            {
                return await ResolveWebDidAsync(did);
            }

            // Local did:web for this PDS
            if (did == $"did:web:{_localDomain}")
            {
                return new DidDocument
                {
                    Id = did,
                    Service = new List<Service>
                    {
                        new Service { Id = "#atproto_pds", Type = "AtprotoPds", ServiceEndpoint = $"https://{_localDomain}" }
                    }
                };
            }

            return null;
        }

        private async Task<DidDocument?> ResolvePlcDidAsync(string did)
        {
            try
            {
                return await _httpClient.GetFromJsonAsync<DidDocument>($"{_plcDirectory}/{did}");
            }
            catch
            {
                return null;
            }
        }

        private async Task<DidDocument?> ResolveWebDidAsync(string did)
        {
            try
            {
                var domain = did.Split(':').Last();
                return await _httpClient.GetFromJsonAsync<DidDocument>($"https://{domain}/.well-known/did.json");
            }
            catch
            {
                return null;
            }
        }
    }
}
