---
name: Avatar cache freshness
description: Cache policy for profile photos served from stable user-avatar URLs.
---

Profile-photo URLs are stable while their underlying database image can change. Serve them with revalidation or give each changed photo a new versioned URL; never mark the stable path immutable for a long max-age.

**Why:** immutable caching under an unchanged URL can keep an old photo visible after the user replaces it.

**How to apply:** When changing avatar serving or CDN behavior, verify both browser freshness and image aspect-ratio handling without modifying stored user photos.
