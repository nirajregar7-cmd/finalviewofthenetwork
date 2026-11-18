import assert from 'node:assert/strict';
import test from 'node:test';
import worker, {
  isApiRequest,
  isHealthRequest,
  isNativeStartupRequest,
  isPublicStatsRequest,
  readPublicStats,
} from './index.mjs';

test('only API and Socket.IO paths are forwarded', () => {
  assert.equal(isApiRequest('/api'), true);
  assert.equal(isApiRequest('/api/auth/login'), true);
  assert.equal(isApiRequest('/socket.io/'), true);
  assert.equal(isApiRequest('/assets/app.js'), false);
});

test('health endpoint is handled at the edge without calling Render', async () => {
  const response = await worker.fetch(
    new Request('https://api.example.test/api/healthz'),
    {},
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'cloudflare-api-gateway',
  });
});

test('only GET requests to the health path bypass the upstream', () => {
  assert.equal(
    isHealthRequest(new Request('https://api.example.test/api/healthz'), new URL('https://api.example.test/api/healthz')),
    true,
  );
  assert.equal(
    isHealthRequest(new Request('https://api.example.test/api/healthz', { method: 'POST' }), new URL('https://api.example.test/api/healthz')),
    false,
  );
});

test('only GET requests to the public stats path use the native endpoint', () => {
  assert.equal(
    isPublicStatsRequest(new Request('https://api.example.test/api/public/stats'), new URL('https://api.example.test/api/public/stats')),
    true,
  );
  assert.equal(
    isPublicStatsRequest(new Request('https://api.example.test/api/public/stats', { method: 'POST' }), new URL('https://api.example.test/api/public/stats')),
    false,
  );
});

test('only GET requests to authenticated startup paths use native handlers', () => {
  for (const pathname of ['/api/auth/me', '/api/bootstrap']) {
    assert.equal(
      isNativeStartupRequest(
        new Request(`https://api.example.test${pathname}`),
        new URL(`https://api.example.test${pathname}`),
      ),
      true,
    );
    assert.equal(
      isNativeStartupRequest(
        new Request(`https://api.example.test${pathname}`, { method: 'POST' }),
        new URL(`https://api.example.test${pathname}`),
      ),
      false,
    );
  }
});

test('native startup handler requires a bearer token before querying the database', async () => {
  const response = await worker.fetch(
    new Request('https://api.example.test/api/auth/me'),
    { HYPERDRIVE: { connectionString: 'postgres://not-used' } },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Sign in to continue.' });
});

test('native startup OPTIONS requests are answered without forwarding', async () => {
  const response = await worker.fetch(
    new Request('https://api.example.test/api/bootstrap', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://www.the-network.co.in',
        'access-control-request-headers': 'authorization,content-type',
      },
    }),
    {},
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://www.the-network.co.in');
});

test('Azure Static Web Apps origins can call the native startup endpoints', async () => {
  const response = await worker.fetch(
    new Request('https://api.example.test/api/bootstrap', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://polite-island-0193ff200.5.azurestaticapps.net',
        'access-control-request-headers': 'authorization,content-type',
      },
    }),
    {},
  );

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'https://polite-island-0193ff200.5.azurestaticapps.net',
  );
});

test('public stats mapping matches the API response shape', async () => {
  const result = await readPublicStats({
    async query(sql) {
      assert.match(sql, /FROM users/);
      assert.match(sql, /WHERE is_suspended = false/);
      assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE)\b/i);
      return {
        rows: [{
          students: '87',
          colleges: '12',
          college_directory: [{ name: 'Example College', students: '20' }],
          school_directory: [{ name: 'Example School', students: '7' }],
        }],
      };
    },
  });

  assert.deepEqual(result, {
    students: 87,
    colleges: 12,
    collegeDirectory: [{ name: 'Example College', students: 20 }],
    schoolDirectory: [{ name: 'Example School', students: 7 }],
  });
});

test('non-API paths are not proxied', async () => {
  const response = await worker.fetch(
    new Request('https://api.example.test/'),
    { RENDER_API_ORIGIN: 'https://the-network-api.onrender.com' },
  );

  assert.equal(response.status, 404);
});

test('API requests preserve method, query, authorization, and body when proxied', async () => {
  const originalFetch = globalThis.fetch;
  let upstreamRequest;
  globalThis.fetch = async (request) => {
    upstreamRequest = request;
    return Response.json({ ok: true }, { status: 201 });
  };

  try {
    const response = await worker.fetch(
      new Request('https://api.example.test/api/posts?limit=5', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ text: 'hello' }),
      }),
      { RENDER_API_ORIGIN: 'https://the-network-api.onrender.com' },
    );

    assert.equal(response.status, 201);
    assert.equal(upstreamRequest.url, 'https://the-network-api.onrender.com/api/posts?limit=5');
    assert.equal(upstreamRequest.method, 'POST');
    assert.equal(upstreamRequest.headers.get('authorization'), 'Bearer test-token');
    assert.deepEqual(await upstreamRequest.json(), { text: 'hello' });
    assert.deepEqual(await response.json(), { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
