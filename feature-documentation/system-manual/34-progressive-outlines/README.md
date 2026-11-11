# Generate an outline week by week

Select the course in **Course Information**, open Pulse or target the **Course Outline**, then ask it to complete the outline. The connected provider or on-device model prepares one teaching week per step. Examination slots remain unchanged. Completion requests preserve already complete weeks; explicit regenerate/rewrite requests can replace their proposed educational content.

![Completed weeks while the next one generates](01-weeks-arrive.png)

The preview appears above the outline table as validated weeks arrive, with the count, **Generating the next week…**, and available same-course sequence references and versions/status. Open a week to inspect outcomes, topics, activities, assessments and assessment-format notes. Reference selection uses the current accessible workspace, prioritizing matching course codes and usable approved versions. It sends no roster, student profile or original-file bytes to generation. Up to two source patterns are compared through bounded neighboring-week excerpts. Explicit Internet research can supplement them; file-only/source-only requests do not add other syllabi.

![Completed weeks retained after a later failure](02-stopped-prefix.png)

A later failure retains completed previews. **Use week 2** places that week in the form; **Use completed weeks** places available unchanged target rows. Manually edited weeks are preserved and reported as skipped. These controls do not save or publish. **Dismiss preview** hides the completed/stopped preview. Review and save separately.

![Two generated weeks placed in the form](03-editable-weeks.png)

The detail capture shows the first populated teaching week. The second week and manual-edit protection are checked by the browser scenario. Later blank weeks and examination slots remain in the fixture and are checked separately. Normal inputs, selectors, resources and manual editing remain available. These synthetic render examples are not a claim of real model-generated sample topics.

| Mobile view | Behavior |
| --- | --- |
| ![Mobile progressive outline](04-mobile-progress.png) | Ready-week count, spinner, source pattern and per-week review. |
| ![Mobile stopped prefix](05-mobile-stopped.png) | Completed weeks and placement controls remain after failure. |

The preview currently lives in the mounted builder. Full reload restoration remains in the [completion register](../../versions/2026-11-10-completion-audit/README.md); this release does not claim recovery after a full reload. [Validation](../../versions/2026-11-10-progressive-outlines/validation/results.md) distinguishes handler/validation checks, synthetic UI rendering and physical inference.

The current editable outline uses one Contents field per scoped section, **Teaching-Learning Activities** and **Assessments**. Teaching-material selection is removed. Section IDs and shared week scopes must survive model proposals; existing section edits remain protected by the baseline comparison. See [Manual 28](../28-outline-selectors/README.md).

Whole-week AI previews replace the canonical blank section as well as the aggregate text, so **Use completed weeks** displays the generated content. Multi-section/shared scopes and manual edits remain protected. The outline scroll region is contained on narrow screens, keeping Pulse within the actual phone viewport. The browser checks use normal pointer clicks for the mascot and Send button.
