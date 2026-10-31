---
name: Firebase Hosting and Admin health
description: Firebase Hosting deployment and API-side Firebase Admin initialization are independent checks.
---

Firebase Hosting now targets project `the-network-d1d4c`; the app's Firebase Messaging client still uses project `the-netwowrk`. Keep their service-account credentials separate.

**Why:** The Hosting credential authenticates successfully for deployment but Firebase Admin rejects it for FCM because it belongs to a different project.

**How to apply:** Use the Hosting credential only for Firebase Hosting deploys and a service account for the client Messaging project in the API. Check API Admin startup separately from Hosting success; never print credential values.

## Firebase CLI authentication

The Firebase CLI does not automatically use Replit's `FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON` secret. For Hosting deploys, provide it as a temporary `GOOGLE_APPLICATION_CREDENTIALS` file, restrict file permissions, and remove it immediately after the CLI exits. Never place the credential in the workspace or print it.

**Why:** the local Firebase CLI had no logged-in user session; a process-substitution credential path was not accepted, while a temporary file allowed the Hosting service account to authenticate.

**How to apply:** Use `FIREBASE_DEPLOY_SERVICE_ACCOUNT_JSON` only for Hosting deploys; keep it separate from `FCM_SERVICE_ACCOUNT_JSON`, which the API uses for Messaging.

## Hosting target vs. Firebase client project

A Hosting service-account project only selects the Hosting destination. It does not migrate the browser Firebase SDK or FCM project; change those only when the user explicitly asks for that migration. For each new Hosting site, allow its exact `web.app` and `firebaseapp.com` origins in REST and Socket.IO CORS, and include both hosts in service-worker API routing.

**Why:** The Network's Hosting, browser Firebase client, and API-side Firebase Admin may belong to different projects. A new Hosting origin can load the app but still be blocked from the API.

**How to apply:** Before deploying to a new Firebase project, verify the built API origin, API and Socket.IO origin allowlists, service-worker host routing, and the separate Firebase client/Admin configuration.
