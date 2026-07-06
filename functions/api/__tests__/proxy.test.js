// Node 20 provides global fetch/Headers/Request/Response/URL.
/* global Response, Request, Buffer */
const { onRequest } = require('../[[path]].js');

describe('sandbox api proxy (pass-through)', () => {
  let captured;
  beforeEach(() => {
    captured = null;
    global.fetch = jest.fn(async (target, init) => {
      captured = { target, init };
      return new Response('{"ok":true}', { status: 200 });
    });
  });

  it('forwards Authorization, strips cookie, preserves path+query+method', async () => {
    const request = new Request(
      'https://x.auxi-web-review.pages.dev/api/me?y=1',
      {
        method: 'GET',
        headers: { Authorization: 'Bearer abc', Cookie: 'AUXI_SESSION=zzz' },
      },
    );
    const resp = await onRequest({
      request,
      env: {},
      params: { path: ['me'] },
    });

    expect(resp.status).toBe(200);
    expect(captured.target).toBe(
      'https://wardrobe-backend-production-c8d9.up.railway.app/api/me?y=1',
    );
    expect(captured.init.method).toBe('GET');
    expect(captured.init.headers.get('authorization')).toBe('Bearer abc');
    expect(captured.init.headers.get('cookie')).toBeNull();
  });

  it('forwards a POST body (e.g. login) untouched', async () => {
    const request = new Request(
      'https://x.auxi-web-review.pages.dev/api/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@b', password: 'p' }),
      },
    );
    await onRequest({ request, env: {}, params: { path: ['login'] } });
    expect(captured.target).toBe(
      'https://wardrobe-backend-production-c8d9.up.railway.app/api/login',
    );
    expect(captured.init.method).toBe('POST');
    const sent = Buffer.from(captured.init.body).toString();
    expect(JSON.parse(sent)).toEqual({ email: 'a@b', password: 'p' });
  });
});
