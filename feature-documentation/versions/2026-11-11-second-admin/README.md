# Second designated Google admin

The requested institutional account is registered alongside the original System Admin. Both accounts use Google sign-in and the same existing console and role/person views. A registered account without a linked Google identity is denied privileged reads until first Google sign-in. Other institutional email addresses do not gain admin access.

See [getting started](../../system-manual/01-getting-started/README.md#two-designated-google-admins), the [admin walkthrough](../../system-walkthrough/07-system-admin/README.md#two-designated-google-admins), [backend configuration](../../backend-system/supabase.md#two-designated-google-admins-11-november-2026) and [validation](validation/results.md).

Application commit `199be826ff591e0edf5a491d0eecb51cebb401ba` is live on [production](https://edupulse-prototype.vercel.app/). The exact deployment reached Ready and the public frontend/API checks passed on 11 November 2026 at 8:15 PM Philippine time. A final database read confirmed two registered admins, the original account retained and the new Google identity still awaiting first sign-in. See the [production receipt](validation/production-receipt.json).
