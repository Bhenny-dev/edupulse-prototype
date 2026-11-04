# Courseware formatting and review order — 4 November 2026

Saved materials and activities now display Markdown as formatted content. Bold markers at the beginning of a line are no longer mistaken for bullet markers. Headings, emphasis, ordered and unordered lists, tables, quotations and code use semantic document elements. Presentations preserve bold markers during key-point extraction and display their emphasis. Assessment instructions and read-only question text also use the formatter.

**AI draft review** follows all document sections, including references, and appears after the final assessment question and add-question control. Its checks and instructor-only visibility remain intact. Editors retain original Markdown; saving and reopening displays the formatting again. Existing drafts benefit without regeneration or a data migration.

The React renderer uses pinned `react-markdown` and `remark-gfm` dependencies. Raw HTML stays inert, unsafe links become plain labels, and generated image descriptions do not fetch remote images. Existing PDF rendering and publication permissions remain in place.

The [manual](../../system-manual/03-courseware-generation-and-review/README.md) and [student reader walkthrough](../../system-walkthrough/09-restored-role-pages/README.md) contain refreshed screenshots. These formatting/evaluation examples are synthetic saved content, distinct from the manual's existing real local-generation captures.

See [validation](validation/results.md) for checks and deployment status.
