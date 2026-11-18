# API container deployment

The root `Dockerfile` builds and runs this Express and Socket.IO API on port
`5000`. It intentionally continues to use the configured PostgreSQL database;
it does not create, migrate, or copy a database.

## Required environment

Configure these values in the container platform's secret store, not in source
control:

- `NEON_DATABASE_URL` — current production Neon connection string.
- `SESSION_SECRET` — required for email OTP challenge signing.
- `QUIZ_CRON_SECRET` — credential for the scheduled quiz endpoint.

Configure any existing integrations that the deployment needs using the
existing variables: `GEMINI_API_KEY`, `GEMINI_MODEL`,
`FCM_SERVICE_ACCOUNT_JSON` (or `GOOGLE_CREDENTIALS_JSON`), `VAPID_PRIVATE_KEY`,
`VAPID_PUBLIC_KEY`, `VAPID_EMAIL`, `BREVO_API_KEY`, the `BREVO_SMTP_*` and
`BREVO_EMAIL_FROM` variables, or the `SMTP_*` and `EMAIL_FROM` variables.
Never put their values in the image, repository, or build arguments.

## Azure Container Apps rollout

The `Publish API container` GitHub Actions workflow builds the root
`Dockerfile` on the `azure-api-deploy` branch and publishes
`ghcr.io/nirajregar7-cmd/finalviewofthenetwork-api:latest`. Make the GHCR
package public before configuring Container Apps to pull it anonymously. The
image contains application code only; runtime credentials belong in Container
Apps secrets.

1. Deploy that image to a Container App with external HTTP ingress on port
   `5000`. Probe `/api/healthz`.
2. Keep the existing Render service and Neon database intact as rollback.
3. Start with one replica. This API has in-process scheduled jobs and
   Socket.IO rooms; multiple replicas can duplicate jobs and do not share
   realtime events without additional coordination.
4. Verify health, login/session restoration, representative API routes,
   database reads/writes, email/push integrations, quiz scheduling, and
   Socket.IO before changing any frontend API origin.
5. Only after that verification, switch the frontend API origin and monitor
   both services. Do not run independent production schedulers on both hosts.

One replica is a migration starting point, not a capacity guarantee. Horizontal
scaling requires moving scheduled jobs to a single worker and configuring a
shared Socket.IO adapter before raising the replica limit.
