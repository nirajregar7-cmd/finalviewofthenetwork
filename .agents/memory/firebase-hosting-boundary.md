---
name: Firebase frontend-only hosting
description: The deployment boundary between Firebase Hosting and The Network's backend and database.
---

Firebase Hosting project `the-network-d1d4c` serves The Network's frontend only. Keep the API/backend on Replit and Neon as the primary database; do not move either as part of frontend hosting work.

Each Firebase build's `VITE_API_URL` must point to a currently published Replit API. A healthy development API does not prove the production URL works.

**Why:** the user explicitly chose Firebase project `the-network-d1d4c` for the frontend while keeping the backend on Replit and Neon as the database. A stale build-time API URL once caused Firebase to load while all app API calls failed.

**How to apply:** Before each Firebase release, verify the published API's `/api/healthz` and `/api/public/stats`, CORS from both custom domains, and the API origin embedded in the built frontend. Preserve the existing API and Neon setup.

For Firebase PWA releases, keep the API host in the build-time frontend setting, the frontend fallback, and the service worker's notification-action fallback aligned. When the app shell changes, bump the worker cache name and versioned registration URL together.

**Why:** an installed app continued using a cached shell and service worker that referenced an old Replit API, even though Firebase served a newer bundle.

**How to apply:** Before release, search the frontend and service worker for the old API host, verify the new host in the built JavaScript and deployed worker, and confirm both custom domains receive the new worker.

Firebase CLI publishing in this workspace must run from the Network artifact directory because its `firebase.json` is scoped there. The CLI is not interactively logged in; use the configured service-account credential only for the deploy process, keep it in a permission-restricted temporary file, and remove it on exit.

**Why:** a root-directory deploy could not find the Firebase config, and the artifact-directory deploy required non-interactive service-account authentication.

**How to apply:** Run Hosting-only deploys from the artifact root, use a temporary credential file with automatic cleanup, and never print or commit credential contents.
