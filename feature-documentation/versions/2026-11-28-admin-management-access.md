# 28 November 2026 · Admin management access

The verified System Admin can open the Dean and Program Coordinator dashboards, retry an academic records request and reload the selected account. Required records are read in bounded pages under the selected role.

## Verification

The production diagnostic verified a Dean account in 58 ms. Its legacy academic call took about 18 seconds and assembled 28.6 MB. In a rollback-only test against that database, representative pages for both management roles each took under 300 ms. The native tests check the role boundary, stable paging and absence of writes. The HTTP tests cover 1,205 attempts across three pages, timeout recovery, and Program Coordinator resource scope. Browser fixtures exercise the Admin switch, retry and reload without replay.

[Management support capture](../system-manual/36-dean-activity-records/README.md#open-as-system-admin) · [Production procedure](../backend-system/vercel.md#admin-management-paging)
