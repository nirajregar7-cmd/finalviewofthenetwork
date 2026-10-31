---
name: Chat realtime hosting
description: The Network's persistent chat transport and deployment requirements.
---

The Network uses authenticated Socket.IO for live chat delivery while REST remains responsible for writes and history. In-process chat broadcasts require REST requests and Socket.IO connections to reach the same persistent API service. Replit artifacts in one project publish under one domain, but the web artifact's build can run before the API routes are available on an initial publish.

**Why:** Serverless API functions cannot hold long-lived Socket.IO connections, and they cannot directly broadcast to sockets attached to a separate process. The static SEO prerender also previously blocked the first publish by requiring live API snapshots before the same project's API was published.

**How to apply:** Publish the API service as a persistent Replit VM. For an externally hosted static frontend, set its build-time `VITE_API_URL` to the published Replit project/API origin—not a Firebase or Cloudflare frontend domain—so REST and Socket.IO use the same host. Keep first-publish SEO snapshot generation non-blocking with an explicit warning; regenerate snapshots after the API is live. Keep Neon as the database source of truth.
