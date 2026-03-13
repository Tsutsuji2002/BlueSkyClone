using System;
using System.Security.Cryptography;
using System.Text;

namespace BSkyClone.Utilities
{
    public static class ProtocolUtils
    {
        private const string Base32Chars = "abcdefghijklmnopqrstuvwxyz234567";

        /// <summary>
        /// Generates an AT Protocol compatible TID (Transaction ID).
        /// A TID is a 13-character base32-encoded string representing microseconds since Unix epoch.
        /// </summary>
        public static string GenerateTid()
        {
            // Get microseconds since Unix epoch
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000;
            // Add a small counter or random part if needed for high-concurrency, 
            // but for a simple implementation, microsecond precision is usually enough.
            
            return EncodeBase32(now);
        }

        /// <summary>
        /// Generates a CIDv1 (Content Identifier) for the given data.
        /// Simplified implementation for local compatibility.
        /// </summary>
        public static string GenerateCid(byte[] data)
        {
            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(data);
            
            // Multihash prefix for SHA-256 (0x12) and length (0x20)
            byte[] multihash = new byte[hash.Length + 2];
            multihash[0] = 0x12; // sha2-256
            multihash[1] = 0x20; // 32 bytes
            Buffer.BlockCopy(hash, 0, multihash, 2, hash.Length);

            // Raw CIDv1 prefix (Version 1, dag-cbor=0x71, identity=0x00?)
            // For now, we use a simple base32 encoding of the multihash
            // which is a common representation of CIDv1.
            return "bafyreib" + EncodeBase32Raw(multihash);
        }

        private static string EncodeBase32(long val)
        {
            char[] result = new char[13];
            for (int i = 12; i >= 0; i--)
            {
                result[i] = Base32Chars[(int)(val & 0x1F)];
                val >>= 5;
            }
            return new string(result);
        }

        private static string EncodeBase32Raw(byte[] data)
        {
            StringBuilder result = new StringBuilder((data.Length * 8 + 4) / 5);
            int buffer = 0;
            int bufferLength = 0;

            foreach (byte b in data)
            {
                buffer = (buffer << 8) | b;
                bufferLength += 8;

                while (bufferLength >= 5)
                {
                    result.Append(Base32Chars[(buffer >> (bufferLength - 5)) & 0x1F]);
                    bufferLength -= 5;
                }
            }

            if (bufferLength > 0)
            {
                result.Append(Base32Chars[(buffer << (5 - bufferLength)) & 0x1F]);
            }

            return result.ToString();
        }
    }
}
