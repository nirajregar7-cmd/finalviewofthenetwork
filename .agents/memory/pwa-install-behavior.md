---
name: PWA install and launch behavior
description: Product requirement for preserving The Network's installable PWA and making installed launches use cached app files.
---

Keep the installable PWA and cached app shell in production. On signed-in launches, show a limited, account-specific profile/feed snapshot from IndexedDB first, then refresh from the server. Keep messages online-only, omit email addresses from the snapshot, and clear it on logout or rejected authentication.

Do not register the app-shell service worker in Vite development previews. If an older development session has it registered, remove only that worker and its app-shell caches; leave Firebase messaging workers intact.

**Why:** The user wants installed launches to feel immediate rather than like a website reload and chose a saved screen with background refresh. In Replit's Vite preview, an app-shell service worker can interfere with dynamic `/src/...` module requests and leave the preview stuck on a failed-import overlay.

**How to apply:** Preserve the manifest, install prompt, production service-worker registration, and installed-PWA behavior. Keep the snapshot scoped to one account and short-lived. When an app-shell release changes cached HTML or assets, bump the service-worker cache version and its versioned registration URL. For the Cloudflare-proxied custom domain, prevent edge caching of worker scripts with CDN no-store headers; Firebase's browser cache header alone may not control Cloudflare.
