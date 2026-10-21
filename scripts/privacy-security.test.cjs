const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createHmac } = require('node:crypto');
const ts = require('typescript');

test('Firebase auth loads and verifies JWKS keys without require(ESM) support', () => {
  const { spawnSync } = require('node:child_process');
  const script = `
    const assert = require('node:assert/strict');
    const { generateKeyPairSync } = require('node:crypto');
    const { getAuth } = require('firebase-admin/auth');
    assert.equal(typeof getAuth, 'function');
    const jwks = require('jwks-rsa');
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
    const client = jwks({ jwksUri: 'https://unused.example/jwks', cache: false, rateLimit: false });
    client.getKeys = async () => [jwk];
    client.getSigningKey('test-key').then(key => {
      assert.equal(key.getPublicKey(), publicKey.export({ format: 'pem', type: 'spki' }));
    }).catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', '-e', script], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});

function load(file, dependencies = {}, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, Buffer, Response, Request, URL, Date, process: { env: { NODE_ENV: 'test' } }, console,
    require(name) { if (name in dependencies) return dependencies[name]; if (name.startsWith('node:')) return require(name); throw Error(`Unexpected dependency ${name}`); },
    ...extra,
  });
  return exports;
}

function database(initial) {
  let stored = structuredClone(initial);
  const ref = { get: async () => ({ exists: !!stored, data: () => stored }), delete: async () => { stored = undefined; } };
  const db = {
    collection: () => ({ doc: () => ref, where: () => ({ get: async () => ({ docs: [] }) }) }),
    runTransaction: async callback => callback({ get: target => target.get(), update: (_ref, data) => { stored = { ...stored, ...data }; } }),
  };
  return { db, value: () => stored };
}

test('server auth rejects missing/forged sessions and verifies revocation', async () => {
  let token; let checks = 0;
  const access = load('lib/security/access.ts', {
    'server-only': {}, 'next/headers': { cookies: async () => ({ get: () => token ? { value: token } : undefined }) },
    'firebase-admin/auth': { getAuth: () => ({ verifySessionCookie: async (value, revoked) => { checks++; assert.equal(revoked, true); if (value !== 'valid') throw Error(); return { uid: 'owner' }; } }) },
    'next/navigation': {}, '@/lib/firebase/admin': { getAdminApp() {} }, '@/lib/firebase/constants': { SESSION_COOKIE_NAME: 'session' },
  });
  await assert.rejects(access.currentUser(), error => error.status === 401);
  token = 'forged'; await assert.rejects(access.currentUser(), error => error.status === 401);
  token = 'valid'; assert.equal((await access.currentUser()).uid, 'owner'); assert.equal(checks, 2);
  assert.throws(() => access.sameOrigin(new Request('https://app.test/api', { headers: { origin: 'https://evil.test' } })), error => error.status === 403);
});

test('ownership denies other users and legacy unclaimed stores', async () => {
  const databaseMock = database({ ownerUid: 'a' });
  const access = load('lib/security/access.ts', { 'server-only': {}, 'next/headers': {}, 'firebase-admin/auth': {}, 'next/navigation': {}, '@/lib/firebase/admin': { getAdminDb: () => databaseMock.db }, '@/lib/firebase/constants': {} });
  await assert.rejects(access.ownedStore('shop', 'b'), error => error.status === 404);
  assert.equal((await access.ownedStore('shop', 'a')).data().ownerUid, 'a');
});

test('retention removes old and undated records, retaining recent records', () => {
  const retention = load('lib/security/retention.ts', { '@/lib/firebase/admin': {}, './access': {} });
  const now = Date.now();
  const rows = retention.recentRecords([{ id: 'new', created_at: new Date(now - 1000).toISOString() }, { id: 'old', created_at: new Date(now - 31 * 86400000).toISOString() }, { id: 'unknown' }], now);
  assert.equal(rows.length, 1); assert.equal(rows[0].id, 'new');
});

test('webhooks reject forged HMAC and erase matching customer records', async () => {
  const mock = database({ abandoned_checkouts: [{ id: 'c1', customer_id: 'gid://shopify/Customer/42' }, { id: 'c2', customer_id: 'gid://shopify/Customer/99' }], orders: [{ id: 'gid://shopify/Order/10' }, { id: 'gid://shopify/Order/11' }] });
  const route = load('app/api/shopify/webhooks/[topic]/route.ts', { '@/lib/firebase/admin': { getAdminDb: () => mock.db }, '@/lib/security/access': { storeCollection: () => 'test' }, '@/lib/shopify/config': { normaliseShop: value => value, SHOPIFY_API_SECRET: () => 'secret' } });
  const body = JSON.stringify({ shop_domain: 'test.myshopify.com', customer: { id: 42 }, orders_to_redact: [10] });
  const request = signature => new Request('https://app.test/webhooks', { method: 'POST', body, headers: { 'x-shopify-hmac-sha256': signature, 'x-shopify-topic': 'customers/redact' } });
  assert.equal((await route.POST(request('bad'), { params: Promise.resolve({ topic: 'customers-redact' }) })).status, 401);
  assert.equal(mock.value().orders.length, 2);
  const signature = createHmac('sha256', 'secret').update(body).digest('base64');
  assert.equal((await route.POST(request(signature), { params: Promise.resolve({ topic: 'customers-redact' }) })).status, 200);
  assert.equal(mock.value().abandoned_checkouts[0].id, 'c2'); assert.equal(mock.value().orders[0].id, 'gid://shopify/Order/11');
  assert.equal(mock.value().redactedCustomerIds[0], '42');
});

test('sync cannot re-import redacted customer/order records and preserves failed resources', async () => {
  const now = new Date().toISOString();
  const mock = database({ redactedCustomerIds: ['42'], redactedOrderIds: ['10'], products: [{ id: 'saved' }] });
  const module = load('lib/shopify/save-data.ts', {
    '@/lib/firebase/admin': { getAdminDb: () => mock.db }, '@/lib/security/access': { storeCollection: () => 'test' },
    '@/lib/security/retention': { recentRecords: rows => rows },
  });
  await module.saveShopData('shop', { products: [], orders: [{ id: 'gid://shopify/Order/10', created_at: now }], abandonedCheckouts: [{ id: 'c1', customer_id: 'gid://shopify/Customer/42', created_at: now }, { id: 'c2', customer_id: 'gid://shopify/Customer/99', created_at: now }], errors: { products: 'Unavailable' } });
  assert.equal(mock.value().orders.length, 0); assert.equal(mock.value().abandoned_checkouts.length, 1); assert.equal(mock.value().products[0].id, 'saved');
});

test('diagnostic endpoints remain disabled', async () => {
  for (const path of ['app/api/test-shopify/route.ts', 'app/api/test-graphql/route.ts', ...fs.readdirSync('app/api/debug').map(name => `app/api/debug/${name}/route.ts`)]) {
    const route = load(path); assert.equal((await route.GET()).status, 404); assert.equal((await route.POST()).status, 404);
  }
});

test('connect form redirects to Shopify with 303, preserving OAuth state binding', async () => {
  let binding;
  const route = load('app/api/auth/route.ts', {
    'next/server': { NextResponse: { json: Response.json, redirect: (url, status = 307) => Response.redirect(url, status) } },
    'next/headers': { cookies: async () => ({ set: (_name, value) => { binding = JSON.parse(value); } }) },
    '@/lib/security/access': { currentUser: async () => ({ uid: 'owner' }), storeCollection: () => 'test', sameOrigin: () => 'https://app.test', apiError: () => Response.json({}, { status: 500 }) },
    '@/lib/firebase/admin': { getAdminDb: () => database(undefined).db },
    '@/lib/shopify/config': { normaliseShop: value => value, SHOPIFY_API_KEY: () => 'key', SHOPIFY_REDIRECT_URI: () => 'https://app.test/api/auth/callback', SHOPIFY_SCOPES: () => 'read_orders,read_customers', SHOPIFY_STATE_COOKIE: 'state', SHOPIFY_STATE_COOKIE_MAX_AGE: 600 },
  }, { crypto: require('node:crypto').webcrypto });
  const form = new URLSearchParams({ shop: 'test.myshopify.com', privacy: '2026-10-22' });
  const response = await route.POST(new Request('https://app.test/api/auth', { method: 'POST', body: form }));
  assert.equal(response.status, 303);
  const target = new URL(response.headers.get('location'));
  assert.equal(target.hostname, 'test.myshopify.com'); assert.equal(target.pathname, '/admin/oauth/authorize');
  assert.equal(binding.uid, 'owner'); assert.equal(binding.shop, 'test.myshopify.com'); assert.equal(target.searchParams.get('state'), binding.state);
});

test('missing deployment environment uses test data; production remains explicit', () => {
  const dependencies = { 'server-only': {}, 'next/headers': {}, 'firebase-admin/auth': {}, 'next/navigation': {}, '@/lib/firebase/admin': {}, '@/lib/firebase/constants': {} };
  const env = { NODE_ENV: 'production' };
  const access = load('lib/security/access.ts', dependencies, { process: { env } });
  assert.equal(access.storeCollection(), 'shopify_installs');
  env.APP_DATA_ENV = 'production'; assert.equal(access.storeCollection(), 'shopify_installs_production');
  env.APP_DATA_ENV = 'typo'; assert.throws(access.storeCollection, /APP_DATA_ENV/);
});

test('origin verification accepts configured Vercel hosts but rejects forged or absent origins', () => {
  const dependencies = { 'server-only': {}, 'next/headers': {}, 'firebase-admin/auth': {}, 'next/navigation': {}, '@/lib/firebase/admin': {}, '@/lib/firebase/constants': {} };
  const access = load('lib/security/access.ts', dependencies, { process: { env: { VERCEL_PROJECT_PRODUCTION_URL: 'vespire.vercel.app', VERCEL_URL: 'vespire-preview.vercel.app' } } });
  const request = origin => new Request('http://internal:3000/api/shopify/disconnect', { headers: { ...(origin ? { origin } : {}), 'x-forwarded-host': 'evil.example' } });
  assert.equal(access.sameOrigin(request('https://vespire.vercel.app')), 'https://vespire.vercel.app');
  assert.equal(access.sameOrigin(request('https://vespire-preview.vercel.app')), 'https://vespire-preview.vercel.app');
  for (const origin of [undefined, 'null', 'https://evil.example', 'https://vespire.vercel.app.evil.example', 'http://vespire.vercel.app']) {
    assert.throws(() => access.sameOrigin(request(origin)), error => error.status === 403);
  }
});

test('privacy-suppressed form origin requires a token bound to the same HTTP-only session', async () => {
  const dependencies = { 'server-only': {}, 'next/headers': { cookies: async () => ({ get: () => ({ value: 'session-a' }) }) }, 'firebase-admin/auth': {}, 'next/navigation': {}, '@/lib/firebase/admin': {}, '@/lib/firebase/constants': { SESSION_COOKIE_NAME: 'session' } };
  const access = load('lib/security/access.ts', dependencies);
  const token = await access.formCsrfToken();
  const request = (session, site = 'same-origin', origin = 'null') => new Request('https://app.test/api/auth', { headers: { origin, 'sec-fetch-site': site, cookie: `session=${session}` } });
  assert.equal(access.sameOrigin(request('session-a'), token), 'https://app.test');
  for (const [req, value] of [[request('session-b'), token], [request('session-a'), 'forged'], [request('session-a', 'cross-site'), token], [request('session-a', 'same-origin', 'https://evil.test'), token]]) {
    assert.throws(() => access.sameOrigin(req, value), error => error.status === 403);
  }
});

test('routine ID token refresh preserves the session; a different sign-in replaces it', async () => {
  let creates = 0; let writes = 0; let uid = 'same-user';
  const auth = {
    verifyIdToken: async () => ({ uid, auth_time: 123 }),
    verifySessionCookie: async () => ({ uid: 'same-user', auth_time: 123, exp: Date.now() / 1000 + 3600 }),
    createSessionCookie: async () => { creates++; return 'new-session'; },
  };
  const actions = load('lib/firebase/auth-actions.ts', {
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'existing-session' }), set: () => { writes++; } }) },
    'firebase-admin/auth': { getAuth: () => auth }, './admin': { getAdminApp() {} },
    './constants': { SESSION_COOKIE_NAME: 'session', SESSION_COOKIE_MAX_AGE: 604800 },
  });
  await actions.setSessionCookie('valid-id-token');
  assert.equal(creates, 0); assert.equal(writes, 0);
  uid = 'different-user'; await actions.setSessionCookie('another-valid-id-token');
  assert.equal(creates, 1); assert.equal(writes, 1);
});

test('protected field redaction preserves accessible checkout contact fields', async () => {
  let errorCode = 'ACCESS_DENIED'; let requests = 0;
  const fetcher = load('lib/shopify/graphql-fetch.ts', {
    './config': { SHOPIFY_API_VERSION: '2026-10' }, '@/lib/security/retention': { recentRecords: rows => rows },
  }, { AbortSignal, fetch: async () => {
    requests++;
    return { ok: true, json: async () => ({
      errors: [{ extensions: { code: errorCode }, path: ['abandonedCheckouts', 'nodes', 0, 'customer', 'firstName'] }],
      data: { abandonedCheckouts: { nodes: [{ id: 'checkout', name: '#1', createdAt: new Date().toISOString(), completedAt: null,
        customer: { id: 'customer', firstName: null, lastName: null, defaultEmailAddress: { emailAddress: 'test@example.com' }, defaultPhoneNumber: { phoneNumber: '+15555550123', smsMarketingConsent: { state: 'SUBSCRIBED', updatedAt: null } } },
        totalPriceSet: { shopMoney: { amount: '10', currencyCode: 'USD' } }, lineItems: { nodes: [] },
      }], pageInfo: { hasNextPage: false } } },
    }) };
  } });
  const rows = await fetcher.fetchAbandonedCheckoutsGraphQL('test.myshopify.com', 'token');
  assert.equal(requests, 1); assert.equal(rows[0].email, 'test@example.com');
  assert.equal(rows[0].phone, '+15555550123'); assert.equal(rows[0].sms_marketing_state, 'SUBSCRIBED');
  assert.equal(rows[0].customer_details_available, true); assert.match(rows[0].customer_details_warning, /Protected customer data/);
  errorCode = 'INTERNAL_SERVER_ERROR';
  await assert.rejects(fetcher.fetchAbandonedCheckoutsGraphQL('test.myshopify.com', 'token'), /GraphQL errors/);
});
