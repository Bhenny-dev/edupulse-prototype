# Workspace save controls in Settings, 6 November 2026

Removed the page-wide workspace save banner at the owner's request. **Settings → Data & Privacy** retains **Export workspace backup** and displays **Retry save** after a failed save, or **Load latest after export** after a revision conflict. Conflict reload still requires a backup first. Healthy Settings and other page layouts retain their existing controls.

Device journaling, workspace persistence, API authorization and revision rules are unchanged. A hidden status announces the actual save state. The reported hosted connectivity failure is not diagnosed or repaired by this interface change.

[Manual 14](../../system-manual/14-pulse-and-outline-workspace/README.md#save-recovery-without-a-page-wide-banner) includes the three affected screenshots. The updated capture fixture records synthetic workspace failures and conflicts; it does not use real student data or establish hosted persistence.

See [validation](validation/results.md) for checks and publishing status.
