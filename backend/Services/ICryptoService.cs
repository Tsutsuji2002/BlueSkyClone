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

        /// <summary>
        /// Signs data using a Secp256k1 private key.
        /// </summary>
        byte[] Sign(byte[] data, string privateKey);

        /// <summary>
        /// Encrypts a private key for storage.
        /// </summary>
        string EncryptPrivateKey(string privateKey);

        /// <summary>
        /// Decrypts a private key from storage.
        /// </summary>
        string DecryptPrivateKey(string encryptedKey);
    }
}
