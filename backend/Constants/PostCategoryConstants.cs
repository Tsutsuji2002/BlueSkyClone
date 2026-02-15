using System.Collections.Generic;

namespace BSkyClone.Constants;

public static class PostCategoryConstants
{
    public const string Art = "Art";
    public const string Tech = "Tech";
    public const string Gaming = "Gaming";
    public const string Nature = "Nature";
    public const string Music = "Music";
    public const string News = "News";
    public const string Politics = "Politics";
    public const string Movies = "Movies";
    public const string Science = "Science";
    public const string Sports = "Sports";
    public const string Food = "Food";

    public static readonly List<string> AllCategories = new()
    {
        Art, Tech, Gaming, Nature, Music, News, Politics, Movies, Science, Sports, Food
    };

    public static string Normalize(string category)
    {
        if (string.IsNullOrWhiteSpace(category)) return "unknown";
        var normalized = category.Trim();
        return AllCategories.Find(c => string.Equals(c, normalized, System.StringComparison.OrdinalIgnoreCase)) ?? "unknown";
    }
}
