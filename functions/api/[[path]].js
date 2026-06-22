const BACKEND = 'https://wardrobe-backend-production-c8d9.up.railway.app/api';
let cachedToken = null;
let tokenExp = 0;

async function getToken(env, force) {
  const now = Date.now() / 1000;
  if (!force && cachedToken && now < tokenExp - 60) return cachedToken;
  const res = await fetch(BACKEND + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.REVIEW_EMAIL, password: env.REVIEW_PASSWORD }),
  });
  if (!res.ok) throw new Error('proxy login failed ' + res.status);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExp = now + (data.expires_in || 900);
  return cachedToken;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');
  const url = new URL(request.url);
  const target = BACKEND + '/' + path + url.search;
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

  const send = async (token) => {
    const h = new Headers(request.headers);
    h.set('Authorization', 'Bearer ' + token);
    h.delete('host');
    h.delete('cookie');
    return fetch(target, { method: request.method, headers: h, body });
  };

  let token;
  try { token = await getToken(env, false); }
  catch (e) { return new Response(JSON.stringify({ error: 'proxy_auth' }), { status: 502 }); }

  let resp = await send(token);
  if (resp.status === 401) { token = await getToken(env, true); resp = await send(token); }
  return new Response(resp.body, { status: resp.status, headers: resp.headers });
}
