const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createHmac } = require('node:crypto');
const ts = require('typescript');

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
    '@/lib/security/access': { currentUser: async () => ({ uid: 'owner' }), storeCollection: () => 'test', sameOrigin() {}, apiError: () => Response.json({}, { status: 500 }) },
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
