using System;

namespace BSkyClone.DTOs
{
    public class PageContentDto
    {
        public string Slug { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string HtmlContent { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }

    public class UpdatePageContentDto
    {
        public string Title { get; set; } = string.Empty;
        public string HtmlContent { get; set; } = string.Empty;
    }
}
