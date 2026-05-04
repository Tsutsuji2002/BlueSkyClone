using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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

        public static ulong ReadVarint(Stream stream)
        {
            ulong value = 0;
            int shift = 0;
            while (true)
            {
                int b = stream.ReadByte();
                if (b == -1) throw new EndOfStreamException();
                value |= (ulong)(b & 0x7F) << shift;
                if ((b & 0x80) == 0) break;
                shift += 7;
            }
            return value;
        }

        public static async Task<List<(string Cid, byte[] Data)>> ReadBlocksAsync(Stream stream)
        {
            var results = new List<(string Cid, byte[] Data)>();
            
            // Read CAR Header length
            var headerLen = ReadVarint(stream);
            var headerBytes = new byte[headerLen];
            await stream.ReadAsync(headerBytes, 0, (int)headerLen);
            // We don't necessarily need to parse header roots for firehose ingest, but we could.

            while (stream.Position < stream.Length)
            {
                var blockLen = ReadVarint(stream);
                if (blockLen == 0) break;

                // CID is at the start of the block. In AT Protocol, it's usually 36 bytes for CIDv1.
                // However, we need to read it dynamically if possible.
                // For simplicity in our PDS logic, we assume CIDv1 starts with 0x01.
                // In firehose CARs, the CID is binary encoded (not string).
                
                // Let's use a smarter way: read the whole block then split.
                var blockData = new byte[blockLen];
                await stream.ReadAsync(blockData, 0, (int)blockLen);
                
                // First byte of CIDv1 is 0x01
                if (blockData[0] == 0x01)
                {
                    // CIDv1: [version][codec][multihash]
                    // In AT Protocol, it's typically 1 (ver) + 1 (codec) + multihash
                    // Multihash for sha2-256 starts with 0x12 0x20
                    // Total CID length is usually 1+1+2+32 = 36 bytes.
                    int cidLen = 36; 
                    var cidBytes = blockData.Take(cidLen).ToArray();
                    var recordData = blockData.Skip(cidLen).ToArray();
                    
                    // We need to convert binary CID to string for our internal indexing
                    var cidString = ProtocolUtils.EncodeCid(cidBytes);
                    
                    results.Add((cidString, recordData));
                }
            }
            return results;
        }
    }
}
