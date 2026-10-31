---
name: Protected post images
description: How signed-in web clients should load protected post-image endpoints.
---

Post images should remain behind the API's session authentication. Load them with `fetch` and the signed-in bearer token, then render a temporary object URL; do not make the image endpoint public to work around broken `<img>` requests.

**Why:** ordinary browser `<img>` requests cannot attach the app's bearer token, and making student uploads public would bypass the API's access boundary.

**How to apply:** Use the authenticated image loader for post images in feeds, community views, shared-post cards, and lightboxes.
