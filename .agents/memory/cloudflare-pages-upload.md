---
name: Cloudflare Pages uploads
description: Wrangler v4 direct uploads for The Network from this pnpm monorepo.
---

When using Wrangler v4 from the workspace root, its first `pages project create` may delegate to Workers and fail monorepo app detection. Use `--force` on the initial Pages project creation to force direct Pages creation; after the project exists, deploy normally without `--force`. For Pages Functions, run Wrangler with `--cwd` set to the artifact root so it discovers that artifact's `functions/` directory.

**Why:** the workspace root is a pnpm monorepo, not a single Workers app, and Wrangler's automatic delegation rejected it. In this environment, local Workerd outbound requests also failed TLS certificate verification even though the same upstream worked from the shell and from deployed Cloudflare Functions.

**How to apply:** For initial direct-upload setup, create the Pages project with `wrangler pages project create ... --force`, then use `wrangler pages deploy` for uploads. When bundling or deploying Functions, set `--cwd` to the artifact root; verify upstream calls against the deployed Pages URL rather than disabling TLS verification in local Workerd.
