---
name: Community and standalone group creation
description: The permission boundary between community groups and student-created standalone groups.
---

Only community admins may create groups attached to a community. Students may create standalone groups outside communities.

**Why:** The user specified this distinction for The Network.

**How to apply:** Enforce the community-admin rule in the API as well as the community UI. Standalone group creation must not attach a community ID.
