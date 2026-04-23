import { AtpAgent } from '@atproto/api';

const API_URL = '/api';
/**
 * The AtpAgent requires a fully qualified service URL (including protocol and host).
 * Since we are using an Nginx proxy that handles /xrpc on the same domain,
 * we use the current window origin as the service base.
 */
export const SERVICE_URL = (window.location.origin || 'http://localhost:5000');

export const agent = new AtpAgent({
    service: SERVICE_URL,
});

export default agent;
