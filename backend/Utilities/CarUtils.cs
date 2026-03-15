using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace BSkyClone.Utilities
{
    public static class CarUtils
    {
        /// <summary>
        /// Writes a CAR v1 header to the stream.
        /// CAR v1 header is a DAG-CBOR encoded map: { version: 1, roots: [rootCid] }
        /// </summary>
        public static async Task WriteHeaderAsync(Stream stream, string rootCid)
        {
            var header = new Dictionary<string, object>
            {
                { "version", 1L },
                { "roots", new List<object> { rootCid } }
            };

            var headerBytes = CborUtils.Encode(header);
            
            // Write length-prefix (varint)
            WriteVarint(stream, (ulong)headerBytes.Length);
            await stream.WriteAsync(headerBytes, 0, headerBytes.Length);
        }

        /// <summary>
        /// Writes a block to the CAR stream.
        /// Each block is prefixed with [varint(len(cid) + len(data))][cid][data]
        /// </summary>
        public static async Task WriteBlockAsync(Stream stream, string cid, byte[] data)
        {
            // Convert CID string to bytes (simplified for local CIDv1)
            // In a full implementation, this should handle multihashes/multicodecs properly.
            // Our GenerateCid uses bafyreib + base32(multihash)
            byte[] cidBytes = ProtocolUtils.DecodeCid(cid);
            
            ulong totalLen = (ulong)(cidBytes.Length + data.Length);
            WriteVarint(stream, totalLen);
            
            await stream.WriteAsync(cidBytes, 0, cidBytes.Length);
            await stream.WriteAsync(data, 0, data.Length);
        }

        public static void WriteVarint(Stream stream, ulong value)
        {
            while (value >= 0x80)
            {
                stream.WriteByte((byte)(value | 0x80));
                value >>= 7;
            }
            stream.WriteByte((byte)value);
        }
    }
}
