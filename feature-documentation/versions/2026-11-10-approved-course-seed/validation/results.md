# Persisted intake validation

Seven named app-only instructor accounts signed in through Supabase with their existing private test credentials. For each owner, the intake tooling read the current production workspace, retained a private before-snapshot, read the actual supplied files, and called `retainApprovedFile`, `parseSyllabusFile` and the shared `approvedSyllabusCandidate` adapter. Each proposed workspace passed the production schema and unchanged 3 MB envelope.

Thirteen approved copies were added; Libby's existing, already repaired WMAD 304 matched the supplied original and was preserved. Every save used the owner's JWT and current workspace revision through the production workspace API. Readback confirmed all source hashes and complete extracted outlines. Each instructor now has both assigned approved originals represented; another pre-existing syllabus in Marielle's account was preserved. Existing content and registrations were compared unchanged. No privileged key, password reset, institutional appointment, generation result, publication, learner attempt or material-open record was created by this increment.

The private receipt lists per-account revisions, source hashes, warnings and workspace byte counts. Source PDFs, credential journals and private account snapshots are not committed. The documented upload/review interface is unchanged, so its existing compatibility captures remain applicable.

## Persisted BSIT rosters

The production registered-student endpoint was paginated under the instructor credentials and filtered to the exact BSIT program and department. All 417 matching profiles were assigned by their recorded year level, in deterministic student-number order, to test blocks of at most 35. The existing `registerCourseStudents` operation built each owner workspace; saves used fresh revisions, production schema checks and authenticated workspace API readback. All seven accounts verified the expected memberships, totaling 1,389 across 14 subjects and 47 course/block combinations. No other program was included, no student password was changed, and existing excluded memberships were preserved.

Readback compared content and syllabi unchanged and confirmed no attempt or material-access additions. This increment establishes persisted enrollment, not published material, answered activity or genuine student completion. Private before-snapshots and aggregate execution receipts are retained locally; student lists and credentials are excluded from Git.

Remaining: substantive generation from the approved outlines and read references; explicit shared-syllabus persistence; block-specific delivery; visibly labelled test submissions on registered accounts; delivery and monitoring verification. No generated or answered item is claimed by this receipt.
