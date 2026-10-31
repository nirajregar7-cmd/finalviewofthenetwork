---
name: Password length policy
description: The Network's minimum password length for registration and password resets.
---

The minimum password length is 8 characters, not 12. Apply the same threshold to signup, OTP registration challenges, self-service password resets, and admin password resets.

**Why:** The product owner explicitly confirmed that eight characters is acceptable; a 12-character limit blocked signup.

**How to apply:** Keep client and server validation and error messages aligned at 8 characters. Do not reject existing users during login solely because an older password is shorter.
