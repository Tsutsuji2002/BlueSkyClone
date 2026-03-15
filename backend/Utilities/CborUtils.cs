using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;

namespace BSkyClone.Utilities
{
    /// <summary>
    /// A minimal, deterministic DAG-CBOR encoder for AT Protocol.
    /// Follows DAG-CBOR spec: https://ipld.io/specs/codecs/dag-cbor/spec/
    /// </summary>
    public static class CborUtils
    {
        public static byte[] Encode(object obj)
        {
            using var ms = new MemoryStream();
            EncodeToStream(obj, ms);
            return ms.ToArray();
        }

        private static void EncodeToStream(object obj, Stream stream)
        {
            if (obj == null) { stream.WriteByte(0xF6); return; }
            if (obj is bool b) { stream.WriteByte((byte)(b ? 0xF5 : 0xF4)); return; }
            if (obj is string s) { EncodeString(s, stream); return; }
            if (obj is long l) { EncodeInteger(l, stream); return; }
            if (obj is int i) { EncodeInteger(i, stream); return; }
            if (obj is byte[] bytes) { EncodeByteString(bytes, stream); return; }
            if (obj is IDictionary<string, object> dict) { EncodeMap(dict, stream); return; }
            if (obj is IEnumerable<object> list) { EncodeArray(list, stream); return; }
            if (obj is Guid g) { EncodeString(g.ToString(), stream); return; }

            throw new NotSupportedException($"Type {obj.GetType().Name} is not supported for CBOR encoding.");
        }

        private static void EncodeInteger(long value, Stream stream)
        {
            if (value >= 0) { WriteHeader(0, (ulong)value, stream); }
            else { WriteHeader(1, (ulong)(-value - 1), stream); }
        }

        private static void EncodeString(string value, Stream stream)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(value);
            WriteHeader(3, (ulong)bytes.Length, stream);
            stream.Write(bytes, 0, bytes.Length);
        }

        private static void EncodeByteString(byte[] value, Stream stream)
        {
            WriteHeader(2, (ulong)value.Length, stream);
            stream.Write(value, 0, value.Length);
        }

        private static void EncodeArray(IEnumerable<object> list, Stream stream)
        {
            var items = list.ToList();
            WriteHeader(4, (ulong)items.Count, stream);
            foreach (var item in items) EncodeToStream(item, stream);
        }

        private static void EncodeMap(IDictionary<string, object> dict, Stream stream)
        {
            // DAG-CBOR requires keys to be sorted lexicographically by length, then by value.
            // "Map keys must be sorted: first by length, then lexicographically by value."
            var sortedKeys = dict.Keys.OrderBy(k => k.Length).ThenBy(k => k, StringComparer.Ordinal).ToList();

            WriteHeader(5, (ulong)sortedKeys.Count, stream);
            foreach (var key in sortedKeys)
            {
                EncodeString(key, stream);
                EncodeToStream(dict[key], stream);
            }
        }

        public static object Decode(byte[] data)
        {
            using var ms = new MemoryStream(data);
            return DecodeFromStream(ms);
        }

        public static object DecodeFromStream(Stream stream)
        {
            int b = stream.ReadByte();
            if (b == -1) throw new EndOfStreamException();

            byte major = (byte)(b >> 5);
            byte info = (byte)(b & 0x1F);

            switch (major)
            {
                case 0: return (long)ReadUint(info, stream);
                case 1: return -1L - (long)ReadUint(info, stream);
                case 2: return ReadBytes(info, stream);
                case 3: return Encoding.UTF8.GetString(ReadBytes(info, stream));
                case 4:
                    {
                        var count = (int)ReadUint(info, stream);
                        var list = new List<object>(count);
                        for (int i = 0; i < count; i++) list.Add(DecodeFromStream(stream));
                        return list;
                    }
                case 5:
                    {
                        var count = (int)ReadUint(info, stream);
                        var dict = new Dictionary<string, object>(count);
                        for (int i = 0; i < count; i++)
                        {
                            var keyObj = DecodeFromStream(stream);
                            var key = keyObj?.ToString() ?? $"key_{i}";
                            var val = DecodeFromStream(stream);
                            dict[key] = val;
                        }
                        return dict;
                    }
                case 6:
                    {
                        var tag = ReadUint(info, stream);
                        var taggedVal = DecodeFromStream(stream);
                        if (tag == 42 && taggedVal is byte[] cidBytes)
                        {
                            if (cidBytes.Length > 0 && cidBytes[0] == 0x00)
                            {
                                var actualBytes = cidBytes.Skip(1).ToArray();
                                return ProtocolUtils.EncodeCid(actualBytes);
                            }
                            return cidBytes;
                        }
                        return taggedVal;
                    }
                case 7:
                    if (info <= 23)
                    {
                        if (info == 20) return false;
                        if (info == 21) return true;
                        if (info == 22) return null;
                        if (info == 23) return null; // Undefined
                        return (int)info; // Simple value
                    }
                    if (info == 24) return (int)stream.ReadByte(); // Simple value next byte
                    if (info >= 25 && info <= 27)
                    {
                        // Floats - we don't strictly need them for firehose commit metadata, but let's at least skip them
                        int size = (info == 25) ? 2 : (info == 26 ? 4 : 8);
                        byte[] floatBytes = new byte[size];
                        stream.Read(floatBytes, 0, size);
                        return null; // Return null for floats for now
                    }
                    break;
            }

            throw new NotSupportedException($"Major type {major} info {info} is not supported.");
        }

        private static ulong ReadUint(byte info, Stream stream)
        {
            if (info < 24) return info;
            if (info == 24) return (byte)stream.ReadByte();
            if (info == 25)
            {
                byte[] b = new byte[2];
                stream.Read(b, 0, 2);
                return (ulong)(BitConverter.ToUInt16(b.Reverse().ToArray(), 0));
            }
            if (info == 26)
            {
                byte[] b = new byte[4];
                stream.Read(b, 0, 4);
                return (ulong)(BitConverter.ToUInt32(b.Reverse().ToArray(), 0));
            }
            if (info == 27)
            {
                byte[] b = new byte[8];
                stream.Read(b, 0, 8);
                return (ulong)(BitConverter.ToUInt64(b.Reverse().ToArray(), 0));
            }
            throw new NotSupportedException($"Info {info} not supported for uint.");
        }

        private static byte[] ReadBytes(byte info, Stream stream)
        {
            var len = (int)ReadUint(info, stream);
            byte[] bytes = new byte[len];
            stream.Read(bytes, 0, len);
            return bytes;
        }

        private static void WriteHeader(byte major, ulong value, Stream stream)
        {
            if (value < 24) stream.WriteByte((byte)((major << 5) | (byte)value));
            else if (value <= 0xFF)
            {
                stream.WriteByte((byte)((major << 5) | 24));
                stream.WriteByte((byte)value);
            }
            else if (value <= 0xFFFF)
            {
                stream.WriteByte((byte)((major << 5) | 25));
                stream.Write(BitConverter.GetBytes((ushort)value).Reverse().ToArray(), 0, 2);
            }
            else if (value <= 0xFFFFFFFF)
            {
                stream.WriteByte((byte)((major << 5) | 26));
                stream.Write(BitConverter.GetBytes((uint)value).Reverse().ToArray(), 0, 4);
            }
            else
            {
                stream.WriteByte((byte)((major << 5) | 27));
                stream.Write(BitConverter.GetBytes(value).Reverse().ToArray(), 0, 8);
            }
        }
    }
}
