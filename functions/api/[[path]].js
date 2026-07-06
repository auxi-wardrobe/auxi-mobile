// Sandbox API proxy — pass-through. Forwards the client's own Authorization
// header to the backend; holds NO credentials. Auth comes from the shared
// session cookie (mirrored into the app's Authorization) or the impersonation
// ?token=. The sandbox cookie is stripped so it never reaches the backend.
/* global Response */
const BACKEND = 'https://wardrobe-backend-production-c8d9.up.railway.app/api';

export async function onRequest(context) {
  const { request, params } = context;
  const path = Array.isArray(params.path)
    ? params.path.join('/')
    : params.path || '';
  const url = new URL(request.url);
  const target = BACKEND + '/' + path + url.search;
  const body = ['GET', 'HEAD'].includes(request.method)
    ? undefined
    : await request.arrayBuffer();

  const h = new Headers(request.headers);
  h.delete('host');
  h.delete('cookie');

  const resp = await fetch(target, {
    method: request.method,
    headers: h,
    body,
  });
  return new Response(resp.body, {
    status: resp.status,
    headers: resp.headers,
  });
}
