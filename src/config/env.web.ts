// Web build: ALL API calls go same-origin (/api) to the Cloudflare Pages Function
// proxy, which injects auth server-side. ROOT_URL='' so services that build
// `${ROOT_URL}/api` (e.g. wardrobeService) also route through the proxy.
// Real item images are absolute R2 URLs, so empty ROOT_URL doesn't affect them.
export const ROOT_URL = '';
export const BASE_URL = '/api';
