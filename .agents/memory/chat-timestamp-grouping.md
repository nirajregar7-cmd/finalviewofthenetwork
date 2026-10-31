---
name: Stable chat timestamps
description: Keep message time labels and date separators stable through optimistic sends and server refreshes.
---

In chat UI, derive date separators and displayed clock times from the message's canonical `createdAt`. Treat display strings such as “Just now” or “4:37 PM” as presentation-only; they can change after a send or refetch and must not be used as a date key.

**Why:** Using a changing display string for grouping caused bogus separators and vertical layout shifts when optimistic messages were replaced by server data.

**How to apply:** Use `createdAt` for day grouping and the clock label. If it is missing, use a safe fallback for display only; never parse a clock-time string as a date marker.
