# Outline and editor fields validation

## Browser checks

`tests/browser/courseware-ai-readiness.spec.ts` (desktop and mobile) seeds a workspace syllabus, opens its course in the Courseware Builder with no AI connection and checks **Pulse AI is not set up yet**; a generation that fails stays on screen for at least six seconds as **Generation did not finish** until **Dismiss**; **Set up Pulse AI** opens **Settings → AI & Knowledge**; an unknown `?tab=` value opens **Account**.

The outline layout was measured in the browser before capture: at 1,536 px the section is 1,488 px wide with no horizontal overflow, at 1,280 px it needs no scroll, at 1,920 px it stops at 1,760 px, with Pulse open it ends before the panel, the column headings stick at 64 px and both term groups are in one table; a phone keeps the table's own scroll region. Auto-growing fields grew while typing (202 to 334 px) and showed no inner scroll after resizes.

## Captures

| Run | Suites | Result |
| --- | --- | --- |
| `2026-11-02T10-38-13-932Z-52dcc5aa` | Walkthrough outline scene, component actions (desktop and mobile), interface feedback, role restoration and baseline workflows | 36 passed |
| `2026-11-02T10-40-25-637Z-afd5d476` | Manual syllabus lifecycle (local `qwen2.5:3b`) | 1 passed |

Kept: the walkthrough and Manual 2 Course Outline sections, the Manual 14 wide, filtered, dark and mobile outlines, and the delivery-settings capture that shows **Pulse AI is not set up yet**. The outline captures pin the sticky headings in place so a section taller than the window shows them once, at the top. All other rewritten images differed only by anti-aliasing, a model badge or timestamps and were restored. Each kept image was opened and reviewed and has a visual-review attestation for its current hash.


The [3 November completion](../../2026-11-03-claude-completion/validation/results.md) records the final combined release gates, screenshot refresh and publication.
