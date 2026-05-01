using System.Collections.Generic;
using System.Threading.Tasks;

namespace BSkyClone.Services
{
    public interface ITrendingService
    {
        TrendingData GetTrendingData();
        Task RefreshTrendingAsync();
    }

    public class TrendingData
    {
        public List<TrendingTopicDto> Topics { get; set; } = new();
        public List<object> Accounts { get; set; } = new();
    }

    public class TrendingTopicDto
    {
        public string Id { get; set; } = "";
        public string Hashtag { get; set; } = "";
        public int PostsCount { get; set; }
        public string Category { get; set; } = "";
        public string? Link { get; set; }
    }
}
