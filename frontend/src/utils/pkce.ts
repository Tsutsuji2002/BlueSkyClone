/**
 * PKCE (Proof Key for Code Exchange) Utilities
 * Used for secure OAuth 2.0 flows on public clients.
 */

export const generateCodeVerifier = (): string => {
    const array = new Uint32Array(56);
    window.crypto.getRandomValues(array);
    return Array.from(array, (dec) => ('0' + dec.toString(16)).substr(-2)).join('');
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
