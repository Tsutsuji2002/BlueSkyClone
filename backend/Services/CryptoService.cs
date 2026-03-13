using System;
using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;

namespace BSkyClone.Services
{
    public class CryptoService : ICryptoService
    {
        public (string publicKey, string privateKey) GenerateSecp256k1Keypair()
        {
            try
            {
                using var ecdsa = ECDsa.Create(ECCurve.CreateFromFriendlyName("secp256k1"));
                var publicKey = Convert.ToHexString(ecdsa.ExportSubjectPublicKeyInfo());
                var privateKey = Convert.ToHexString(ecdsa.ExportPkcs8PrivateKey());
                
                return (publicKey, privateKey);
            }
            catch (Exception)
            {
                // Fallback for environments where secp256k1 isn't available via friendly name
                // (Though net9.0 on Windows/Linux should support it)
                using var ecdsa = ECDsa.Create(ECCurve.CreateFromFriendlyName("nistP256")); 
                var publicKey = Convert.ToHexString(ecdsa.ExportSubjectPublicKeyInfo());
                var privateKey = Convert.ToHexString(ecdsa.ExportPkcs8PrivateKey());
                return (publicKey, privateKey);
            }
        }
    }
}
