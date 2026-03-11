import { AtpAgent } from '@atproto/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// The XRPC endpoints are at /xrpc, but the AtpAgent takes the base service URL.
// If API_URL is http://localhost:5000/api, the agent will call http://localhost:5000/api/xrpc/...
const service = API_URL.replace(/\/api$/, '');

export const agent = new AtpAgent({
    service: service,
});

export default agent;
