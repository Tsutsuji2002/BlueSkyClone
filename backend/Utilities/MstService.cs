using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using System.Formats.Cbor;

namespace BSkyClone.Utilities
{
    public class MstEntry
    {
        public string Key { get; set; }
        public string Value { get; set; }
        public string Subtree { get; set; } // CID of right child

        // For CBOR serialization (prefix-compressed)
        public int PrefixLen { get; set; }
        public string KeySuffix { get; set; }
    }

    public class MstNode
    {
        public string LeftChild { get; set; } // CID of left child
        public List<MstEntry> Entries { get; set; } = new List<MstEntry>();

        public int Level { get; set; }
    }

    public class MstService
    {
        private readonly BSkyDbContext _dbContext;

        public MstService(BSkyDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<string> UpdateRecordAsync(string did, string key, string valueCid)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Did == did);
            if (user == null) throw new Exception("User not found");

            string rootCid = user.RepoRoot;
            int keyLevel = GetKeyLevel(key);

            var newRoot = await InsertRecursiveAsync(rootCid, key, valueCid, keyLevel, did);
            
            user.RepoRoot = newRoot;
            await _dbContext.SaveChangesAsync();

            return newRoot;
        }

        private async Task<string> InsertRecursiveAsync(string nodeCid, string key, string value, int keyLevel, string did)
        {
            var node = await LoadNodeAsync(nodeCid);
            int nodeLevel = node?.Level ?? -1;

            if (keyLevel > nodeLevel)
            {
                // New key becomes a new node above the current subtree
                var (left, right) = await SplitAsync(nodeCid, key, did);
                var newNode = new MstNode
                {
                    Level = keyLevel,
                    LeftChild = left,
                    Entries = new List<MstEntry> { new MstEntry { Key = key, Value = value, Subtree = right } }
                };
                return await SaveNodeAsync(newNode, did);
            }

            // Standard insertion into current node or its children
            // If node is null (keyLevel <= nodeLevel but node is null - shouldn't happen with correct root but defensive)
            if (node == null)
            {
                 var newNode = new MstNode { Level = nodeLevel > -1 ? nodeLevel : 0, Entries = new List<MstEntry> { new MstEntry { Key = key, Value = value } } };
                 return await SaveNodeAsync(newNode, did);
            }

            if (nodeLevel > keyLevel)
            {
                // Descend
                int idx = 0;
                while (idx < node.Entries.Count && string.CompareOrdinal(key, node.Entries[idx].Key) > 0)
                {
                    idx++;
                }

                string targetChild = (idx == 0) ? node.LeftChild : node.Entries[idx - 1].Subtree;
                string newChild = await InsertRecursiveAsync(targetChild, key, value, keyLevel, did);

                if (idx == 0) node.LeftChild = newChild;
                else node.Entries[idx - 1].Subtree = newChild;

                return await SaveNodeAsync(node, did);
            }

            // nodeLevel == keyLevel
            // Find position
            int i = 0;
            while (i < node.Entries.Count && string.CompareOrdinal(key, node.Entries[i].Key) > 0)
            {
                i++;
            }

            if (i < node.Entries.Count && node.Entries[i].Key == key)
            {
                // Update existing
                node.Entries[i].Value = value;
            }
            else
            {
                // Split child at insertion point
                string targetChild = (i == 0) ? node.LeftChild : node.Entries[i - 1].Subtree;
                var (left, right) = await SplitAsync(targetChild, key, did);

                var newEntry = new MstEntry { Key = key, Value = value, Subtree = right };
                node.Entries.Insert(i, newEntry);

                if (i == 0) node.LeftChild = left;
                else node.Entries[i - 1].Subtree = left;
            }

            return await SaveNodeAsync(node, did);
        }

        private async Task<(string left, string right)> SplitAsync(string nodeCid, string key, string did)
        {
            if (string.IsNullOrEmpty(nodeCid)) return (null, null);

            var node = await LoadNodeAsync(nodeCid);
            if (node == null) return (null, null);
            
            // Find transition point
            int idx = 0;
            while (idx < node.Entries.Count && string.CompareOrdinal(key, node.Entries[idx].Key) > 0)
            {
                idx++;
            }

            // Split the child at the transition point
            string midChild = (idx == 0) ? node.LeftChild : node.Entries[idx - 1].Subtree;
            var (childLeft, childRight) = await SplitAsync(midChild, key, did);

            // Left side node
            var leftNode = new MstNode
            {
                Level = node.Level,
                LeftChild = (idx == 0) ? childLeft : node.LeftChild,
                Entries = node.Entries.Take(idx).ToList()
            };
            if (idx > 0) leftNode.Entries.Last().Subtree = childLeft;

            // Right side node
            var rightNode = new MstNode
            {
                Level = node.Level,
                LeftChild = childRight,
                Entries = node.Entries.Skip(idx).ToList()
            };

            return (await SaveNodeAsync(leftNode, did), await SaveNodeAsync(rightNode, did));
        }

        private async Task<MstNode> LoadNodeAsync(string cid)
        {
            if (string.IsNullOrEmpty(cid)) return null;
            var block = await _dbContext.RepoBlocks.FindAsync(cid);
            if (block == null) return null;

            // Decode DAG-CBOR (Need to implement CborUtils.Decode or a minimal parser)
            // For now, I'll assume I'll add a minimal Decode to CborUtils or handle it here
            return Deserialize(block.Data);
        }

        private async Task<string> SaveNodeAsync(MstNode node, string did)
        {
            if (node == null) return null;
            if (node.Entries.Count == 0 && string.IsNullOrEmpty(node.LeftChild)) return null;

            byte[] data = Serialize(node);
            string cid = ProtocolUtils.GenerateCid(data);

            var block = await _dbContext.RepoBlocks.FindAsync(cid);
            if (block == null)
            {
                _dbContext.RepoBlocks.Add(new RepoBlock 
                { 
                    Cid = cid, 
                    Data = data, 
                    Did = did,
                    CreatedAt = DateTime.UtcNow 
                });
            }

            return cid;
        }

        private int GetKeyLevel(string key)
        {
            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(key));
            
            // Count leading zeros in nibbles (fanout 16)
            int level = 0;
            foreach (byte b in hash)
            {
                if ((b >> 4) == 0) 
                {
                    level++;
                    if ((b & 0x0F) == 0) level++;
                    else break;
                }
                else break;
            }
            return level;
        }

        public byte[] Serialize(MstNode node)
        {
            using var ms = new MemoryStream();
            var writer = new CborWriter();
            
            // Canonical ordering: "e" (entries) before "l" (leftChild)
            writer.WriteStartMap(node.LeftChild == null ? 1 : 2);
            
            // Entries
            writer.WriteTextString("e");
            writer.WriteStartArray(node.Entries.Count);
            string lastKey = "";
            foreach (var entry in node.Entries)
            {
                // k, p, t, v
                int mapSize = (entry.Subtree == null) ? 3 : 4;
                writer.WriteStartMap(mapSize);
                
                // k: key suffix
                writer.WriteTextString("k");
                int prefixLen = 0;
                while (prefixLen < lastKey.Length && prefixLen < entry.Key.Length && lastKey[prefixLen] == entry.Key[prefixLen])
                {
                    prefixLen++;
                }
                writer.WriteTextString(entry.Key.Substring(prefixLen));

                // p: prefix len
                writer.WriteTextString("p");
                writer.WriteInt32(prefixLen);
                
                // t: subtree (right child)
                if (entry.Subtree != null)
                {
                    writer.WriteTextString("t");
                    writer.WriteTextString(entry.Subtree);
                }

                // v: value cid
                writer.WriteTextString("v");
                writer.WriteTextString(entry.Value);
                
                writer.WriteEndMap();
                lastKey = entry.Key;
            }
            writer.WriteEndArray();

            // LeftChild (link)
            if (node.LeftChild != null)
            {
                writer.WriteTextString("l");
                writer.WriteTextString(node.LeftChild);
            }

            writer.WriteEndMap();
            return writer.Encode();
        }

        private MstNode Deserialize(byte[] data)
        {
            var dict = CborUtils.Decode(data) as Dictionary<string, object>;
            if (dict == null) return null;

            var node = new MstNode();
            if (dict.TryGetValue("l", out var left)) node.LeftChild = left as string;
            
            if (dict.TryGetValue("e", out var entriesObj) && entriesObj is List<object> entriesList)
            {
                string lastKey = "";
                foreach (var entryObj in entriesList)
                {
                    if (entryObj is Dictionary<string, object> entryDict)
                    {
                        int p = (int)((long)entryDict["p"]);
                        string k = entryDict["k"] as string;
                        string key = lastKey.Substring(0, p) + k;
                        
                        node.Entries.Add(new MstEntry
                        {
                            Key = key,
                            Value = entryDict["v"] as string,
                            Subtree = entryDict.ContainsKey("t") ? entryDict["t"] as string : null,
                            PrefixLen = p,
                            KeySuffix = k
                        });
                        lastKey = key;
                    }
                }
            }

            if (node.Entries.Count > 0)
            {
                node.Level = GetKeyLevel(node.Entries[0].Key);
            }

            return node; 
        }
    }
}
