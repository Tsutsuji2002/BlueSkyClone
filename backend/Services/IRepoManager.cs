using BSkyClone.Models;
using System.Threading.Tasks;

namespace BSkyClone.Services
{
    public interface IRepoManager
    {
        Task<string> CreateRecordAsync(string did, string collection, object record);
        Task<RepoBlock?> GetBlockAsync(string cid);
        Task<byte[]> GetRepoCheckoutAsync(string did);
        Task<string> SignRepoAsync(string did, string dataCid);
    }
}
