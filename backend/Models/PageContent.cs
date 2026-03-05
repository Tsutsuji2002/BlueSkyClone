using System;
using System.ComponentModel.DataAnnotations;

namespace BSkyClone.Models
{
    public class PageContent
    {
        [Key]
        public string Slug { get; set; } = string.Empty; // e.g., "privacy-policy"
        
        [Required]
        public string Title { get; set; } = string.Empty;
        
        [Required]
        public string HtmlContent { get; set; } = string.Empty;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
