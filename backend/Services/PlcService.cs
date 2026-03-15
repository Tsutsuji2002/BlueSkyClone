using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using BSkyClone.Models;
using BSkyClone.Services;

namespace BSkyClone.Services
{
    public interface IPlcService
    {
        Task<string?> CreateIdentityAsync(User user);
        Task<bool> UpdateHandleAsync(string did, string newHandle);
    }

    public class PlcService : IPlcService
    {
        private readonly HttpClient _httpClient;
        private readonly string _plcDirectory;
        private readonly ICryptoService _crypto;
        private readonly string _pdsDid;

        public PlcService(IConfiguration configuration, ICryptoService crypto)
        {
            _httpClient = new HttpClient();
            _plcDirectory = configuration["PlcDirectory"] ?? "https://plc.directory";
            _crypto = crypto;
            _pdsDid = $"did:web:{configuration["DomainName"] ?? "bskyclone.site"}";
        }

        public async Task<string?> CreateIdentityAsync(User user)
        {
            // In AT Protocol, creating a did:plc identity involves:
            // 1. Generating a 'create' operation.
            // 2. Signing it with a rotation key.
            // 3. POSTing to PLC directory.

            var op = new
            {
                type = "plc_operation",
                verificationMethods = new
                {
                    atproto = user.SigningPublicKey
                },
                rotationKeys = new[] { user.SigningPublicKey }, // Simplified: using same key for rotation
                alsoKnownAs = new[] { $"at://{user.Handle}" },
                services = new
                {
                    atproto_pds = new
                    {
                        type = "AtprotoPds",
                        endpoint = $"https://{user.Handle.Split('.').Last()}" // Heuristic: domain from handle
                    }
                },
                prev = (string?)null
            };

            // Note: In reality, we need to sign the operation and format it as a signed op.
            // This is a placeholder for the actual PLC integration logic.
            try
            {
                var response = await _httpClient.PostAsJsonAsync($"{_plcDirectory}", op);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<JsonElement>();
                    return result.GetProperty("did").GetString();
                }
            }
            catch
            {
                // Fallback for demo/dev purposes
            }

            return null;
        }

        public async Task<bool> UpdateHandleAsync(string did, string newHandle)
        {
            // Similar to Create, but with 'prev' hash of current PLC state.
            // Skipping full implementation until rotation keys are managed.
            return true;
        }
    }
}
