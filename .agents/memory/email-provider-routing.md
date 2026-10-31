---
name: Email provider routing
description: Required provider selection for The Network authentication OTP and activity emails.
---

For The Network, OTP emails must use Brevo. Activity emails must use Gmail SMTP.

**Why:** The user explicitly specified this routing after signup OTP delivery failed.

**How to apply:** Keep signup OTP on Brevo; keep activity notifications on Gmail SMTP.
