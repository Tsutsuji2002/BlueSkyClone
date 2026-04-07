/**
 * PKCE (Proof Key for Code Exchange) Utilities
 * Used for secure OAuth 2.0 flows on public clients.
 */

export const generateCodeVerifier = (): string => {
    // Generate 96 random bytes, base64url-encode them → ~128 char verifier
    // PKCE spec requires 43-128 chars of URL-safe characters
    const array = new Uint8Array(96);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

export const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...Array.from(new Uint8Array(digest))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};
