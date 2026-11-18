import { Client } from 'pg';
import {
  hashBearerToken,
  logNativeApiError,
  readAuthSession,
  readAuthUserProfile,
  readBootstrap,
  sanitizeApiResponse,
} from './native-api.mjs';

const allowedOrigins = new Set([
  'https://the-network.web.app',
  'https://the-netwowrk.web.app',
  'https://the-network-72bba.web.app',
  'https://the-network-72bba.firebaseapp.com',
  'https://the-network-d1d4c.web.app',
  'https://the-network-d1d4c.firebaseapp.com',
  'https://the-network-44912.web.app',
  'https://the-network-44912.firebaseapp.com',
  'https://the-network.co.in',
  'https://www.the-network.co.in',
  'https://the-network-1vw.pages.dev',
  'https://www.the-network-1vw.pages.dev',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const publicStatsSql = `
  WITH active_users AS MATERIALIZED (
    SELECT college, school_name
    FROM users
    WHERE is_suspended = false
  ),
  college_groups AS (
    SELECT MIN(TRIM(college)) AS name, COUNT(*)::text AS students
    FROM active_users
    WHERE NULLIF(TRIM(college), '') IS NOT NULL
      AND LENGTH(TRIM(college)) > 1
      AND TRIM(college) <> '.'
    GROUP BY LOWER(TRIM(college))
    ORDER BY COUNT(*) DESC, MIN(TRIM(college)) ASC
    LIMIT 24
  ),
  school_groups AS (
    SELECT MIN(TRIM(school_name)) AS name, COUNT(*)::text AS students
    FROM active_users
    WHERE NULLIF(TRIM(school_name), '') IS NOT NULL
      AND LENGTH(TRIM(school_name)) > 1
      AND TRIM(school_name) <> '.'
    GROUP BY LOWER(TRIM(school_name))
    ORDER BY COUNT(*) DESC, MIN(TRIM(school_name)) ASC
    LIMIT 24
  )
  SELECT
    (SELECT COUNT(*)::text FROM active_users) AS students,
    (
      SELECT COUNT(DISTINCT LOWER(TRIM(college)))::text
      FROM active_users
      WHERE NULLIF(TRIM(college), '') IS NOT NULL
        AND LENGTH(TRIM(college)) > 1
        AND TRIM(college) <> '.'
    ) AS colleges,
    COALESCE(
      (SELECT json_agg(json_build_object('name', name, 'students', students)) FROM college_groups),
      '[]'::json
    ) AS college_directory,
    COALESCE(
      (SELECT json_agg(json_build_object('name', name, 'students', students)) FROM school_groups),
      '[]'::json
    ) AS school_directory
`;

function isApiRequest(pathname) {
  return pathname === '/api'
    || pathname.startsWith('/api/')
    || pathname === '/socket.io'
    || pathname.startsWith('/socket.io/');
}

function isHealthRequest(request, url) {
  return request.method === 'GET' && url.pathname === '/api/healthz';
}

function isPublicStatsRequest(request, url) {
  return request.method === 'GET' && url.pathname === '/api/public/stats';
}

export function isNativeStartupRequest(request, url) {
  return request.method === 'GET'
    && (url.pathname === '/api/auth/me' || url.pathname === '/api/bootstrap');
}

function isNativeStartupPath(pathname) {
  return pathname === '/api/auth/me' || pathname === '/api/bootstrap';
}

function isAllowedDevelopmentOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname.endsWith('.replit.dev')
      || hostname.endsWith('.replit.app')
      || hostname.endsWith('.the-network-1vw.pages.dev')
      || hostname.endsWith('.azurestaticapps.net');
  } catch {
    return false;
  }
}

function corsHeaders(request) {
  const headers = new Headers({ vary: 'Origin' });
  const origin = request.headers.get('origin');
  if (!origin || (!allowedOrigins.has(origin) && !isAllowedDevelopmentOrigin(origin))) {
    return headers;
  }

  headers.set('access-control-allow-origin', origin);
  if (request.method === 'OPTIONS') {
    headers.set('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    headers.set('access-control-allow-headers', request.headers.get('access-control-request-headers') || 'authorization,content-type');
    headers.set('access-control-max-age', '600');
    headers.append('vary', 'Access-Control-Request-Headers');
  }
  return headers;
}

function jsonResponse(request, body, init = {}) {
  const headers = new Headers(init.headers);
  for (const [name, value] of corsHeaders(request)) {
    if (name === 'vary' && headers.has(name)) {
      headers.set(name, `${headers.get(name)}, ${value}`);
    } else {
      headers.set(name, value);
    }
  }
  return Response.json(body, { ...init, headers });
}

function normalizeDirectory(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => ({
    name: entry.name,
    students: Number(entry.students),
  }));
}

async function readPublicStats(client) {
  const result = await client.query(publicStatsSql);
  const row = result.rows[0];
  if (!row) throw new Error('Public stats query returned no result.');

  return {
    students: Number(row.students ?? 0),
    colleges: Number(row.colleges ?? 0),
    collegeDirectory: normalizeDirectory(row.college_directory),
    schoolDirectory: normalizeDirectory(row.school_directory),
  };
}

async function handlePublicStats(request, env) {
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    connectionTimeoutMillis: 5000,
    query_timeout: 8000,
  });

  try {
    await client.connect();
    const data = await readPublicStats(client);
    return jsonResponse(request, data, {
      headers: { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('Cloudflare public stats database request failed.', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: error && typeof error === 'object' && 'code' in error ? error.code : undefined,
    });
    return jsonResponse(request, { error: 'Public statistics are temporarily unavailable.' }, { status: 503 });
  } finally {
    try {
      await client.end();
    } catch (error) {
      console.error('Cloudflare public stats database client close failed.', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }
}

function bearerToken(request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(\S+)$/i);
  return match?.[1] || null;
}

async function handleNativeStartup(request, env, pathname) {
  const token = bearerToken(request);
  if (!token) {
    return jsonResponse(request, { error: 'Sign in to continue.' }, { status: 401 });
  }

  try {
    const session = await readAuthSession(await hashBearerToken(token), env);
    if (!session) {
      return jsonResponse(request, { error: 'Your session has expired. Please sign in again.' }, { status: 401 });
    }
    if (session.isSuspended) {
      return jsonResponse(request, {
        error: 'This account has been suspended. Contact support if you believe this is a mistake.',
        code: 'ACCOUNT_SUSPENDED',
      }, { status: 403 });
    }
    if (session.revokedAt) {
      return jsonResponse(request, { error: 'Your session has expired. Please sign in again.' }, { status: 401 });
    }

    const isAdmin = session.role === 'admin';
    const data = pathname === '/api/auth/me'
      ? { user: await readAuthUserProfile(session.userId, env) }
      : await readBootstrap(session.userId, session.role, env);
    if (pathname === '/api/auth/me' && !data.user) {
      return jsonResponse(request, { error: 'Your session is no longer valid.' }, { status: 401 });
    }
    const body = sanitizeApiResponse(
      data,
      session.userId,
      isAdmin,
      pathname === '/api/auth/me',
    );
    return jsonResponse(request, body, {
      headers: {
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'x-frame-options': 'DENY',
      },
    });
  } catch (error) {
    logNativeApiError(`Cloudflare ${pathname} request failed.`, error);
    return jsonResponse(request, {
      error: pathname === '/api/bootstrap'
        ? 'Unable to load your app data right now.'
        : 'Unable to restore your session right now.',
      requestId: request.headers.get('cf-ray') || undefined,
    }, { status: 503 });
  }
}

function proxyWebSocket(upstream) {
  const [client, server] = Object.values(new WebSocketPair());
  const remote = upstream.webSocket;
  let closed = false;

  server.accept({ allowHalfOpen: true });
  remote.accept({ allowHalfOpen: true });

  const closeBoth = (code, reason) => {
    if (closed) return;
    closed = true;
    for (const socket of [server, remote]) {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        try {
          socket.close(code, reason);
        } catch {
          socket.close();
        }
      }
    }
  };

  server.addEventListener('message', (event) => {
    if (remote.readyState === WebSocket.OPEN) remote.send(event.data);
  });
  remote.addEventListener('message', (event) => {
    if (server.readyState === WebSocket.OPEN) server.send(event.data);
  });
  server.addEventListener('close', (event) => closeBoth(event.code, event.reason));
  remote.addEventListener('close', (event) => closeBoth(event.code, event.reason));
  server.addEventListener('error', () => closeBoth(1011, 'WebSocket proxy error'));
  remote.addEventListener('error', () => closeBoth(1011, 'WebSocket upstream error'));

  return new Response(null, { status: 101, webSocket: client });
}

async function forwardRequest(request, upstreamOrigin) {
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, upstreamOrigin);
  const headers = new Headers(request.headers);
  headers.delete('host');

  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    duplex: request.method === 'GET' || request.method === 'HEAD' ? undefined : 'half',
    redirect: 'manual',
  });
  const upstreamResponse = await fetch(upstreamRequest);

  if (upstreamResponse.webSocket) return proxyWebSocket(upstreamResponse);
  return new Response(upstreamResponse.body, upstreamResponse);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      request.method === 'OPTIONS'
      && (
        url.pathname === '/api/healthz'
        || url.pathname === '/api/public/stats'
        || isNativeStartupPath(url.pathname)
      )
    ) {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (isHealthRequest(request, url)) {
      return jsonResponse(request, { status: 'ok', service: 'cloudflare-api-gateway' });
    }

    if (isPublicStatsRequest(request, url)) {
      if (!env.HYPERDRIVE?.connectionString) {
        return jsonResponse(request, { error: 'Database connection is not configured.' }, { status: 503 });
      }
      return handlePublicStats(request, env);
    }

    if (isNativeStartupRequest(request, url)) {
      if (!env.HYPERDRIVE?.connectionString) {
        return jsonResponse(request, { error: 'Database connection is not configured.' }, { status: 503 });
      }
      return handleNativeStartup(request, env, url.pathname);
    }

    if (!isApiRequest(url.pathname)) {
      return new Response('Not found', { status: 404 });
    }

    let upstreamOrigin;
    try {
      upstreamOrigin = new URL(env.RENDER_API_ORIGIN);
    } catch {
      return jsonResponse(request, { error: 'API upstream is not configured.' }, { status: 503 });
    }

    if (upstreamOrigin.protocol !== 'https:') {
      return jsonResponse(request, { error: 'API upstream must use HTTPS.' }, { status: 500 });
    }

    try {
      return await forwardRequest(request, upstreamOrigin);
    } catch (error) {
      console.error('API upstream request failed.', error);
      return jsonResponse(request, { error: 'The API is temporarily unavailable.' }, { status: 502 });
    }
  },
};

export { forwardRequest, isApiRequest, isHealthRequest, isPublicStatsRequest, readPublicStats };
