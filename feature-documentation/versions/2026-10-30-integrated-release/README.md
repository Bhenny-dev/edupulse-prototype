# Content harness and approved landing integration

This release combines the completed content-harness work with the separately approved landing-page changes, including the scripted Agent workspace. The owner confirmed that all current product changes should be included. The integration does not redesign signed-in pages, remove role features, change academic permissions, or change the database schema.

Pulse can assemble a complete selected-course syllabus through bounded generation stages and present one validated proposal for confirmation. Courseware receives the original request, uses the permitted sources, and saves real generated drafts through the existing revision-checked workspace. Live local-model runs demonstrate generation, confirmation, save and reload; their recorded content errors remain explicit limitations. See the [backend implementation and evidence](../2026-10-29-backend-harness/validation/results.md).

The [landing release](../2026-10-30-landing-v3/README.md) adds the white/light-blue public design, geometric motion, agent rings with agent portraits and an interactive scripted workspace. The workspace demonstrates authored examples; it does not call the model or save academic content. Its new screenshot and guide are in the [public-site walkthrough](../../system-walkthrough/01-public-site/README.md#8c-the-agent-workspace). Pulse's own office (**Workspace buddies**) now shows the same studio, with the six buddies moving according to real task events; see the [office guide](../../system-manual/11-workspace-buddies/README.md).

The [request intake release](../2026-10-30-request-lifecycle/README.md) bounds how long an incomplete API request can hold the server: a stalled body receives `408`, an unsupported method `405` with `Allow`, an unknown action `404`, and a client that disconnects cancels the downstream work.

The final combined checks, capture evidence and release status are recorded in [validation results](validation/results.md). Local session state, browser traces and temporary databases are excluded from the product commit. The existing role, chart, approval, assessment and persistence tests remain part of validation.

Remaining services include direct EduSuite synchronization, email/push delivery, automatic indexing of every lifecycle upload and calendar-driven late-routing alerts. This release does not claim those services complete. Model-generated teaching content still requires instructor review; structural validation and similarity scores do not establish factual accuracy.
