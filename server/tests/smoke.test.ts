// server/tests/smoke.test.ts
//
// Black-box smoke test: talks to a RUNNING server over HTTP.
//   SMOKE_BASE_URL   default http://localhost:3001
//   SMOKE_WITH_DATA  set to "1" to also run checks that read Firestore
//
// Run:  npm run test:smoke
// The server must be started separately (with a working .env). The checks in
// the default run never need data in Firestore, but the server itself still
// needs valid Firebase credentials to boot.
//
// Assumes RECAPTCHA_ENFORCE_APP_CHECK=false on the target server and a fresh
// rate-limit window (contact is limited to 3/min, results lookup to 10/min).
import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = (process.env.SMOKE_BASE_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
const WITH_DATA = process.env.SMOKE_WITH_DATA === '1';
const REQUEST_TIMEOUT_MS = 20_000;
const WAKE_TIMEOUT_MS = 80_000; // Render free instances can take ~50s to wake

interface CallResult {
  status: number;
  headers: Headers;
  body: unknown;
}

async function call(path: string, init: RequestInit = {}): Promise<CallResult> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }
  return { status: res.status, headers: res.headers, body };
}

function asRecord(value: unknown): Record<string, unknown> {
  assert.ok(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    'expected a JSON object body',
  );
  return value as Record<string, unknown>;
}

function assertErrorBody(body: unknown): void {
  assert.equal(typeof asRecord(body).error, 'string', 'expected { error: string }');
}

function postJson(path: string, payload: unknown): Promise<CallResult> {
  return call(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

before(
  async () => {
    const deadline = Date.now() + WAKE_TIMEOUT_MS;
    let lastError = '';
    while (Date.now() < deadline) {
      try {
        const res = await call('/api/health');
        if (res.status === 200) return;
        lastError = `status ${res.status}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
      await sleep(3000);
    }
    throw new Error(
      `Server not reachable at ${BASE_URL}/api/health (${lastError}). ` +
        'Start it first, or set SMOKE_BASE_URL.',
    );
  },
  { timeout: WAKE_TIMEOUT_MS + 10_000 },
);

describe('health', () => {
  it('GET /api/health returns ok without touching Firestore', async () => {
    const res = await call('/api/health');
    assert.equal(res.status, 200);
    const body = asRecord(res.body);
    assert.equal(body.status, 'ok');
    assert.equal(typeof body.uptime, 'number');
    assert.equal(typeof body.time, 'string');
  });

  it('is not cacheable and carries basic security headers', async () => {
    const res = await call('/api/health');
    assert.match(res.headers.get('cache-control') ?? '', /no-store/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-powered-by'), null);
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404 under /api', async () => {
    const res = await call('/api/definitely-not-a-route');
    assert.equal(res.status, 404);
    assertErrorBody(res.body);
  });
});

describe('admin endpoints reject anonymous requests', () => {
  const protectedPaths = [
    '/api/admission',
    '/api/notices',
    '/api/gallery',
    '/api/faq',
    '/api/contact',
    '/api/payments',
    '/api/payments/invoices',
    '/api/students',
    '/api/teachers',
    '/api/attendance?classId=1&date=2026-01-01',
    '/api/exams',
    '/api/results/exam/none',
    '/api/reports/dashboard',
    '/api/expenses',
    '/api/settings',
    '/api/users',
  ];

  for (const path of protectedPaths) {
    it(`GET ${path} → 401`, async () => {
      const res = await call(path);
      assert.equal(res.status, 401);
      assertErrorBody(res.body);
    });
  }

  it('rejects a malformed bearer token', async () => {
    const res = await call('/api/students', {
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    assert.equal(res.status, 401);
    assertErrorBody(res.body);
  });
});

describe('public endpoints validate input before doing any work', () => {
  it('POST /api/contact with an empty body → 400', async () => {
    const res = await postJson('/api/contact', {});
    assert.equal(res.status, 400);
    assertErrorBody(res.body);
  });

  it('POST /api/results/lookup with an empty body → 400', async () => {
    const res = await postJson('/api/results/lookup', {});
    assert.equal(res.status, 400);
    assertErrorBody(res.body);
  });
});

describe('public data endpoints (SMOKE_WITH_DATA=1)', { skip: !WITH_DATA }, () => {
  it('GET /api/health/deep → ok (Firestore reachable)', async () => {
    const res = await call('/api/health/deep');
    assert.equal(res.status, 200);
    assert.equal(asRecord(res.body).status, 'ok');
  });

  it('GET /api/settings/public → { item }', async () => {
    const res = await call('/api/settings/public');
    assert.equal(res.status, 200);
    assert.ok('item' in asRecord(res.body));
  });

  it('GET /api/notices/published → { items: [] }', async () => {
    const res = await call('/api/notices/published');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(asRecord(res.body).items));
  });

  it('GET /api/gallery/published → { items: [] }', async () => {
    const res = await call('/api/gallery/published');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(asRecord(res.body).items));
  });

  it('GET /api/faq/published → RAW ARRAY', async () => {
    const res = await call('/api/faq/published');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body), 'FAQ public endpoint must return a raw array');
  });

  it('GET /api/results/exams/published → { items: [] }', async () => {
    const res = await call('/api/results/exams/published');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(asRecord(res.body).items));
  });
});
