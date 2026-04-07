import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';

const CLIENT_ID = 'https://bskyclone.site/client-metadata.json';
const REDIRECT_URI = window.location.origin + '/oauth-callback';

export const initiateOAuth = async (pdsUrl: string = 'https://bsky.social') => {
    try {
        const verifier = generateCodeVerifier();
        const challenge = await generateCodeChallenge(verifier);

        // Save state for callback
        sessionStorage.setItem('oauth_verifier', verifier);
        sessionStorage.setItem('oauth_pds_url', pdsUrl);

        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: 'atproto transition:generic',
            code_challenge: challenge,
            code_challenge_method: 'S256',
            state: Math.random().toString(36).substring(7)
        });

        // Add additional scope if needed
        // scope: 'atproto transition:generic transition:chat.bsky',

        console.log('Initiating OAuth redirect to:', pdsUrl);
        window.location.href = `${pdsUrl}/oauth/authorize?${params.toString()}`;
    } catch (error) {
        console.error('Failed to initiate OAuth:', error);
        throw error;
    }
};
