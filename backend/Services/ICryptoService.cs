using System;

namespace BSkyClone.Services
{
    public interface ICryptoService
    {
        /// <summary>
        /// Generates a new Secp256k1 keypair and returns the public key as a hex string.
        /// In a real PDS, the private key would be securely stored (e.g., in a HSM or encrypted).
        /// For this implementation, we focus on the public key.
        /// </summary>
        (string publicKey, string privateKey) GenerateSecp256k1Keypair();
    }
}
