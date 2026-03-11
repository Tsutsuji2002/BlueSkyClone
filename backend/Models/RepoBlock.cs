using System.ComponentModel.DataAnnotations;

namespace BSkyClone.Models
{
    public class RepoBlock
    {
        [Key]
        [MaxLength(100)]
        public string Cid { get; set; } = string.Empty;

        [Required]
        public byte[] Data { get; set; } = Array.Empty<byte>();

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // The DID of the user this block belongs to (for multi-tenant PDS)
        [MaxLength(100)]
        public string Did { get; set; } = string.Empty;
    }
}
