import { AtpAgent } from '@atproto/api';

const API_URL = '/api';
// The XRPC endpoints are at /xrpc, but the AtpAgent takes the base service URL.
// If API_URL is http://localhost:5000/api, the agent will call http://localhost:5000/api/xrpc/...
export const SERVICE_URL = API_URL.replace(/\/api$/, '');

export const agent = new AtpAgent({
    service: SERVICE_URL,
});

export default agent;
