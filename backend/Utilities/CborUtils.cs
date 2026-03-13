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
