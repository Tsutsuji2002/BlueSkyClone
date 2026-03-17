using BSkyClone.Models;
using System.Threading.Tasks;

namespace BSkyClone.Services
{
    public interface IRepoManager
    {
        Task<string> CreateRecordAsync(string did, string collection, object record, string? rkey = null);
        Task DeleteRecordAsync(string did, string collection, string rkey);
        Task<RepoBlock?> GetBlockAsync(string cid);
        Task<byte[]> GetRepoCheckoutAsync(string did);
        Task<Stream> GetRepoCheckoutStreamAsync(string did);
        Task<string?> GetLatestCommitAsync(string did);
        Task<string> SignRepoAsync(string did, string dataCid);
        Task<string> UploadBlobAsync(string did, System.IO.Stream stream, string mimeType);
    }
}
