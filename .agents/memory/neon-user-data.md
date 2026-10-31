---
name: Neon user data
description: The Network's authoritative database for its existing student accounts.
---

The user selected Neon as the authoritative database for existing student accounts. The app uses the securely stored `NEON_DATABASE_URL`. Public stats count non-suspended accounts, not all user rows; do not treat that figure as the total database population.

**Why:** the user explicitly requested this database connection, and the public aggregate intentionally excludes suspended accounts.

**How to apply:** Keep `NEON_DATABASE_URL` as the application's database source and fail clearly if Neon is unavailable instead of falling back to an empty or unrelated database. If the API reports the variable missing while the secret exists, restart its managed workflow before changing the credential. Do not replace this selected database without explicit instruction.
