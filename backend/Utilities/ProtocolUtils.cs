using System;
using System.Security.Cryptography;
using System.Text;

namespace BSkyClone.Utilities
{
    public static class ProtocolUtils
    {
        private const string CidAlphabet = "abcdefghijklmnopqrstuvwxyz234567";
        private const string TidAlphabet = "234567abcdefghijklmnopqrstuvwxyz";

        /// <summary>
        /// Generates an AT Protocol compatible TID (Transaction ID).
        /// A TID is a 13-character base32-encoded string representing microseconds since Unix epoch.
        /// </summary>
        public static string GenerateTid()
        {
            // Get microseconds since Unix epoch using Ticks (100-nanosecond intervals)
            var now = (DateTimeOffset.UtcNow.Ticks - DateTimeOffset.UnixEpoch.Ticks) / 10;
            
            // AT Protocol TID is 64-bit:
            // - Bit 63: 0
            // - Bits 62-10: 53-bit timestamp (microseconds)
            // - Bits 9-0: 10-bit clock ID/random (we'll use 0 for simplicity)
            long tidInt = now << 10;
            
            return EncodeTid(tidInt);
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

            // CIDv1 binary prefix for dag-cbor: 0x01 (version), 0x71 (dag-cbor)
            byte[] cidv1 = new byte[multihash.Length + 2];
            cidv1[0] = 0x01;
            cidv1[1] = 0x71;
            Buffer.BlockCopy(multihash, 0, cidv1, 2, multihash.Length);

            return EncodeCid(cidv1);
        }

        private static string EncodeTid(long val)
        {
            char[] result = new char[13];
            for (int i = 12; i >= 0; i--)
            {
                result[i] = TidAlphabet[(int)(val & 0x1F)];
                val >>= 5;
            }
            return new string(result);
        }

        public static string EncodeBase32Raw(byte[] data)
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
                    result.Append(CidAlphabet[(buffer >> (bufferLength - 5)) & 0x1F]);
                    bufferLength -= 5;
                }
            }

            if (bufferLength > 0)
            {
                result.Append(CidAlphabet[(buffer << (5 - bufferLength)) & 0x1F]);
            }

            return result.ToString();
        }

        /// <summary>
        /// Decodes a simplified CID string back to its byte representation.
        /// </summary>
        public static byte[] DecodeCid(string cid)
        {
            if (cid.StartsWith("b"))
            {
                var base32 = cid.Substring(1);
                return DecodeBase32Raw(base32);
            }
            throw new NotSupportedException($"Unsupported CID format: {cid}");
        }

        public static string EncodeCid(byte[] cidBytes)
        {
            // Standard CIDv1 in base32 starts with 'b' (multibase prefix)
            // followed by the base32 encoding of the binary CID (Version, Codec, Multihash)
            return "b" + EncodeBase32Raw(cidBytes);
        }

        private static byte[] DecodeBase32Raw(string input)
        {
            var result = new List<byte>();
            int buffer = 0;
            int bufferLength = 0;

            foreach (char c in input.ToLowerInvariant())
            {
                int val = CidAlphabet.IndexOf(c);
                if (val == -1) continue;

                buffer = (buffer << 5) | val;
                bufferLength += 5;

                if (bufferLength >= 8)
                {
                    result.Add((byte)((buffer >> (bufferLength - 8)) & 0xFF));
                    bufferLength -= 8;
                }
            }
            return result.ToArray();
        }
    }
}
