# Resumable courseware generation, 10 November 2026

Course generation now saves validated parts into a private, unfinished preview before requesting the next part. Lesson calls handle one outline topic. A content-check failure can leave a gap while other independent parts/weeks finish; connection, quota, timeout and storage failures stop further calls. Explicit **Resume** restores the saved input/plan, skips acknowledged parts and finishes the missing work. Reload alone never starts inference.

Existing reviewed/published work is preserved. Older drafts stay intact until the entire replacement is assembled. The original draft comparison is retained across reload, so resuming cannot overwrite a newer instructor edit. Unfinished previews have read/PDF controls but cannot be checked, released or given delivery settings. The API and additive database trigger enforce that marker's draft-only status.

[Updated workflow and reviewed captures](../../system-manual/26-outline-driven-courseware/README.md) · [Validation and limits](validation/results.md).
