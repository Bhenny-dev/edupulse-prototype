# Conversation completion register

The owner asked for an audit of unfinished work across the conversation, with each validated increment pushed separately. This register distinguishes implemented features, persisted seed evidence and work still requiring completion. Earlier requests remain in scope unless a later instruction replaced them.

## Confirmed increments

| Requested outcome | Evidence and current limit |
| --- | --- |
| Restore documented role pages, charts, controls and approved visual structure | [Restored role pages](../../system-walkthrough/09-restored-role-pages/README.md); preserve these while completing backend work. |
| Clean Pulse, component targeting, file drops, field actions and the wider outline | [Component workflow](../../system-manual/14-pulse-and-outline-workspace/README.md); whole-outline incremental generation is tracked separately below. |
| Consolidated Course actions, content formatting and evaluation summary after the material | [Course generation/review](../../system-manual/03-courseware-generation-and-review/README.md) and [outline-driven generation](../../system-manual/26-outline-driven-courseware/README.md). Actual seeded generation is still being reviewed. |
| Help and keyboard shortcuts in Settings, loading feedback, saved provider connections, voice and specific provider errors | [Interface/loading](../../system-manual/12-interface-and-loading/README.md), [saved connections](../../system-manual/19-loading-and-saved-connections/README.md), [voice/errors](../../system-manual/20-voice-and-provider-errors/README.md). Direct ChatGPT plan access remains subject to provider authorization, distinct from OpenAI API billing. |
| System-first lookup without AI credits, spelling suggestions, web images, relevant follow-ups and public landing answers | [System search](../../system-manual/24-system-first-search/README.md), [public lookup](../../system-manual/32-public-pulse-search/README.md), [follow-up validation](../2026-11-09-conversation-follow-ups/validation/results.md). Verified self-account recognition is pushed at `35bb71a`; deployment is Ready and both hosted checks passed. |
| Correct registered student accounts/profiles and named staff with surname logins | [Student directory](../../system-manual/16-student-directory/README.md), [named staff](../../system-manual/25-staff-test-accounts/README.md). Current seed uses verified existing accounts without changing passwords. |
| Approved source PDFs accepted, complete title/weeks, retained originals and warnings rather than invented weeks | [Compatibility validation](../2026-11-09-syllabus-file-compatibility/validation/results.md); existing WMAD 304 repaired at `1fe48d1`. |
| Retain/read syllabus links and readable book copies, source citations and readable/PDF exports | [Retained sources](../../system-manual/31-retained-syllabus-sources/README.md), [reader validation](../2026-11-10-course-source-reading/validation/results.md). Unread metadata is explicitly not cited as book content. |
| Every named instructor receives approved syllabi; BSIT-only student subject enrollment | [Persisted seed](../2026-11-10-approved-course-seed/README.md): all 14 originals across seven named instructors; 417 BSIT students, 1,389 subject memberships, 47 test course/block groups. No other program was enrolled. |
| Direct capstone paper update based on Chapters 1–2, existing methodology and verified findings | The original Word file was updated and rendered/reviewed in the prior paper increment. Local receipt and backup preserve the before/after evidence. New pipeline tests must not become claims of genuine learner completion or participant evaluation. |
| Visible week-by-week outline preparation with retained partial results and same-course references | [Progressive outline release](../2026-11-10-progressive-outlines/README.md), pushed at `e296b5f`; production Ready. Use controls place validated weeks without saving. Persistent shared sources and reload restoration remain open. |
| Link/file-only reference intake with private RAG/vector indexing | [Reference intake](../2026-11-10-reference-intake/README.md), pushed at `e416b68`; production Ready, deployed HTTP/storage/retrieval canary passed and temporary records cleaned up. |

## Active completion queue

1. **Synced labelled progress:** finish the additive provenance release and live scoring/readback. The owner's later clarification requires test results to appear in student progress and instructor monitoring from the same persisted rows, with their test label retained.
2. **Substantive real generation and delivery:** finish actual model generation from the approved outlines and readable references, review/correct the produced content, save drafts through owner workspaces, publish reviewed examples, submit authorized labelled tests through normal learner operations and verify instructor monitoring. A rejected or partial draft is not a completed week.
3. **Persistent shared syllabi:** replace sample-only repository behavior with explicitly shared, authorized copies and reference provenance; preserve private workspaces and original files.
4. **Multiple blocks with different delivery:** keep one course and multiple confirmed blocks, with authorized block-specific release/deadline behavior consistently enforced on reads and learner commands.
5. **Reload restoration:** preserve the current route, verified admin support subject, tabs, readers, modal/popover references and loaded view state after a deliberate reload. Revalidate authorization; never replay a business command. Apply this requirement to new features as well.
6. **Assessment publication boundary:** the pre-release audit found that question keys/explanations are stripped, but teacher AI review metadata can still carry marked-answer indexes. The private projection guard is implemented, applied and passed all release checks before seeded quizzes are released. Hosted baseline had zero publications/attempts, and all nine workspace revision digests stayed unchanged.
7. **Generation findings:** real model runs still require content review. Correct wrong correlation procedures/answer keys, unsupported dataset-file claims and HTML formatting before publishing. The historical catalog exclusion guard is being validated.

## Binding clarifications

The owner also requested a replacement References intake: accept **link or file only**, automatically extract available title/authors/year/publisher/identifiers, retain the source and associate it with the syllabus/course. Index readable content for authorized vector/RAG retrieval, with reusable source versions and exact citations in formatted views and exports. Existing private account boundaries remain authoritative; absent metadata is marked missing, never invented. This is an active implementation task, distinct from the already delivered retained-source reader.

- Enroll **BSIT only**. Do not fabricate program-appropriate syllabi for the other registered programs.
- Labelled test submissions on registered accounts are authorized and should count in recorded student progress; distinguish them from independent learner achievement.
- All 14 supplied PDFs were confirmed approved by the owner. Historical signatories do not replace Ginard's Dean role or Myriell's Associate Dean role; Marielle remains an instructor.
- Preserve unrelated Claude work. Push this task's complete, verified increments only, with matching screenshots, manuals, backend documentation and capture evidence in the same commit.
