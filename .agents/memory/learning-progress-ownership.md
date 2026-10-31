---
name: Learning progress ownership
description: Keep roadmap completion and learner counts tied to the authenticated student's real data.
---

Treat learning progress as user-owned, not as a property of the shared topic template. Do not present template progress, sample avatars, or invented student counts as real account data. Use actual community records for learner counts and profiles. Until a user-scoped server endpoint exists, browser-local progress is a temporary limitation; cross-device persistence should use the existing API and Neon database.

**Why:** the app has many authenticated students, and shared sample roadmap values can falsely imply that each student has the same completion state or peers.

**How to apply:** Derive completion from the signed-in student's checklist. Only show community figures when a real matching community record is available. Keep public/authentication surfaces unchanged when updating signed-in learning UI.
