# Cloudflare API gateway

This Worker serves `/api/healthz`, `/api/public/stats`, `/api/auth/me`, and
`/api/bootstrap` directly. The authenticated routes validate the existing
Bearer sessions against `auth_sessions` and read the existing Neon database
through Cloudflare Hyperdrive. The static-site frontend routes only these
three data endpoints (`/public/stats`, `/auth/me`, `/bootstrap`) through this
Worker; all other REST and Socket.IO traffic continues to use its existing
Render origin.

Do not set the frontend `VITE_API_URL` to this Worker. Unmigrated routes still
proxy to Render, and live testing found that proxy path can receive a Cloudflare
managed challenge (HTTP 429). Keep Render available as the fallback and
rollback target during migration.

## Local checks

From the repository root, run:

```powershell
node --test artifacts/api-gateway/src/index.test.mjs
```

## Deploy

Authenticate Wrangler to the Cloudflare account, then run:

```powershell
npx wrangler deploy --config artifacts/api-gateway/wrangler.jsonc
```

Cloudflare account access is required. Do not put database credentials,
application secrets, or API tokens in this directory or commit them.
