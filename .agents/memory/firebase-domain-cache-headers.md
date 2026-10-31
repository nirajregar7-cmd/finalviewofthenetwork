---
name: Firebase custom-domain cache headers
description: Service-worker cache behavior can differ between Firebase Hosting URLs and Cloudflare-proxied custom domains.
---

When checking Firebase PWA deployments, inspect the app document and `/sw.js` from both the Firebase `web.app` URL and each custom domain. The Network custom domains are Cloudflare-proxied; explicit `Cache-Control: no-cache` plus CDN `no-store` headers on the app shell and worker produced `Cache-Control: no-cache` on both custom domains and `BYPASS` for the worker on 2026-10-19.

**Why:** Cloudflare previously served longer cache lifetimes than the Firebase origin, delaying app-shell and service-worker updates for installed users.

**How to apply:** After an app-shell or service-worker deployment, verify the new worker body, version, and cache headers on the Firebase URL and every custom domain. Keep hashed JS/CSS cacheable while revalidating HTML and worker scripts; do not assume origin headers propagate through Cloudflare.
