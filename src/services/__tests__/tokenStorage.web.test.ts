/**
 * Runs in the default (node) jest env — no jsdom installed. We stub the three
 * browser globals the web token store touches: localStorage, document.cookie,
 * location.hostname. jest.resetModules() re-evaluates the module each test so
 * the module-level ephemeral flag resets to false.
 */
class MemStorage {
  store = new Map<string, string>();
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, String(v));
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}

// Minimal cookie jar: honours Max-Age=0 as delete, records raw set strings so
// tests can assert on attributes (Domain, Secure, …).
function makeCookieJar() {
  const jar = new Map<string, string>();
  const raw: string[] = [];
  return {
    raw,
    get cookie() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(str: string) {
      raw.push(str);
      const [pair, ...attrs] = str.split('; ');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      const val = pair.slice(eq + 1);
      const maxAge = attrs.find(a => a.toLowerCase().startsWith('max-age='));
      if (maxAge && maxAge.split('=')[1] === '0') jar.delete(name);
      else jar.set(name, val);
    },
  };
}

const nowSec = () => Math.floor(Date.now() / 1000);
let jar: ReturnType<typeof makeCookieJar>;
let store: MemStorage;

function loadModule(hostname = 'abc123.auxi-web-review.pages.dev') {
  jest.resetModules();
  store = new MemStorage();
  jar = makeCookieJar();
  (globalThis as any).localStorage = store;
  (globalThis as any).document = jar;
  (globalThis as any).location = { hostname };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../tokenStorage.web');
}

const bundle = () => ({
  access_token: 'acc-1',
  refresh_token: 'ref-1',
  access_token_expires_at: nowSec() + 900,
  refresh_token_expires_at: nowSec() + 60 * 60 * 24 * 7,
  user_email: 'x@test',
});

describe('tokenStorage.web shared cookie', () => {
  it('setTokens writes localStorage AND a Domain-scoped shared cookie', async () => {
    const m = loadModule();
    await m.setTokens(bundle());
    expect(await m.getAccessToken()).toBe('acc-1');
    expect(jar.cookie).toContain('AUXI_SESSION=');
    const raw = jar.raw.join('\n');
    expect(raw).toContain('Domain=auxi-web-review.pages.dev');
    expect(raw).toContain('Secure');
    expect(raw).toContain('SameSite=Lax');
    expect(raw).toContain('Path=/');
    expect(raw).toMatch(/Max-Age=\d+/);
  });

  it('omits Domain on non-pages.dev hosts (localhost dev)', async () => {
    const m = loadModule('localhost');
    await m.setTokens(bundle());
    expect(jar.raw.join('\n')).not.toContain('Domain=');
  });

  it('clearTokens removes the shared cookie and localStorage', async () => {
    const m = loadModule();
    await m.setTokens(bundle());
    await m.clearTokens();
    expect(await m.getAccessToken()).toBeNull();
    expect(jar.cookie).not.toContain('AUXI_SESSION=');
  });

  it('ephemeral mode: setTokens writes localStorage but NOT the cookie', async () => {
    const m = loadModule();
    m.enableEphemeralMode();
    await m.setTokens({ access_token: 'imp-1' });
    expect(await m.getAccessToken()).toBe('imp-1');
    expect(jar.cookie).not.toContain('AUXI_SESSION=');
  });

  it('hydrateFromSharedCookie seeds localStorage from a valid cookie', async () => {
    // Session A writes the cookie.
    const a = loadModule();
    await a.setTokens(bundle());
    const cookieValue = jar.cookie;

    // Fresh "subdomain": empty localStorage, same shared cookie present.
    const b = loadModule();
    (globalThis as any).document = {
      get cookie() {
        return cookieValue;
      },
      set cookie(_s: string) {},
    };
    const hydrated = await b.hydrateFromSharedCookie();
    expect(hydrated).toBe(true);
    expect(await b.getAccessToken()).toBe('acc-1');
  });

  it('hydrateFromSharedCookie ignores an expired session', async () => {
    const m = loadModule();
    const dead = {
      ...bundle(),
      access_token_expires_at: nowSec() - 10,
      refresh_token_expires_at: nowSec() - 10,
    };
    (globalThis as any).document = {
      get cookie() {
        return 'AUXI_SESSION=' + encodeURIComponent(JSON.stringify(dead));
      },
      set cookie(_s: string) {},
    };
    expect(await m.hydrateFromSharedCookie()).toBe(false);
    expect(await m.getAccessToken()).toBeNull();
  });

  it('hydrateFromSharedCookie is a no-op when localStorage already has a token', async () => {
    const m = loadModule();
    await m.setTokens(bundle());
    expect(await m.hydrateFromSharedCookie()).toBe(false);
  });

  it('ephemeral mode: clearTokens does NOT delete the shared cookie', async () => {
    const m = loadModule();
    await m.setTokens(bundle());              // non-ephemeral → cookie written
    expect(jar.cookie).toContain('AUXI_SESSION=');
    m.enableEphemeralMode();
    await m.clearTokens();
    expect(jar.cookie).toContain('AUXI_SESSION=');   // cookie survives
    expect(await m.getAccessToken()).toBeNull();      // localStorage still cleared
  });

  it('falls back to Max-Age=2592000 when refresh_token_expires_at is 0', async () => {
    const m = loadModule();
    await m.setTokens({ access_token: 'a', refresh_token_expires_at: 0 });
    expect(jar.raw.join('\n')).toContain('Max-Age=2592000');
  });
});
