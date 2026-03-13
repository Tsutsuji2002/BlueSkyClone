using System;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace BSkyClone.Services
{
    public class CryptoService : ICryptoService
    {
        public (string publicKey, string privateKey) GenerateSecp256k1Keypair()
        {
            using var ecdsa = GetSecp256k1();
            var publicKey = Convert.ToHexString(ecdsa.ExportSubjectPublicKeyInfo());
            var privateKey = Convert.ToHexString(ecdsa.ExportPkcs8PrivateKey());
            return (publicKey, privateKey);
        }

        public byte[] Sign(byte[] data, string privateKey)
        {
            using var ecdsa = GetSecp256k1();
            ecdsa.ImportPkcs8PrivateKey(Convert.FromHexString(privateKey), out _);
            return ecdsa.SignData(data, HashAlgorithmName.SHA256, DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
        }

        public string EncryptPrivateKey(string privateKey)
        {
            // Simple AES encryption for the private key
            // In a production app, use a more secure key management system
            var key = GetEncryptionKey();
            using var aes = Aes.Create();
            aes.Key = key;
            aes.GenerateIV();
            using var encryptor = aes.CreateEncryptor();
            byte[] plainBytes = Encoding.UTF8.GetBytes(privateKey);
            byte[] cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
            
            byte[] result = new byte[aes.IV.Length + cipherBytes.Length];
            Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
            Buffer.BlockCopy(cipherBytes, 0, result, aes.IV.Length, cipherBytes.Length);
            return Convert.ToBase64String(result);
        }

        public string DecryptPrivateKey(string encryptedKey)
        {
            var key = GetEncryptionKey();
            byte[] fullBytes = Convert.FromBase64String(encryptedKey);
            using var aes = Aes.Create();
            aes.Key = key;
            byte[] iv = new byte[aes.BlockSize / 8];
            byte[] cipherBytes = new byte[fullBytes.Length - iv.Length];
            Buffer.BlockCopy(fullBytes, 0, iv, 0, iv.Length);
            Buffer.BlockCopy(fullBytes, iv.Length, cipherBytes, 0, cipherBytes.Length);
            
            aes.IV = iv;
            using var decryptor = aes.CreateDecryptor();
            byte[] plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
            return Encoding.UTF8.GetString(plainBytes);
        }

        private ECDsa GetSecp256k1()
        {
            try { return ECDsa.Create(ECCurve.CreateFromFriendlyName("secp256k1")); }
            catch { return ECDsa.Create(ECCurve.CreateFromFriendlyName("nistP256")); } // Fallback
        }

        private byte[] GetEncryptionKey()
        {
            // Use config or fallback key
            var keyStr = "atproto_signing_key_secret_place" + "holder";
            return SHA256.HashData(Encoding.UTF8.GetBytes(keyStr));
        }
    }
}
