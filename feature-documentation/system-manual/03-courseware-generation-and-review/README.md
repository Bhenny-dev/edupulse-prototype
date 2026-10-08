# 3 · Generate and review courseware

**Who:** instructor. **Where:** Courseware → My Courseware and Courseware Builder. The generated material, activity, and assessment stay in Draft until an instructor checks them. The alignment report is an aid to review, not approval.

1. Complete and activate a syllabus outline first. In **My Courseware**, find the instructor's own course and choose **Start Generating**. The sample courses are listed separately; the IT 102 row without “Sample” comes from the completed [syllabus workflow](../02-syllabus-lifecycle/README.md).

   ![Course list with instructor-owned IT 102](01-courseware-with-active-syllabus.png)

2. In **Courseware Builder**, find a teaching week with a topic and outcome. The IT 102 outline here has “Variables and assignment” in week 1. Choose that week's **Generate** button. Examination weeks have no Generate button.

   ![Week 1 outline and Generate button](02-weekly-outline-ready-to-generate.png)

3. Wait while the local model drafts the week. **Stop generation** cancels this request. The app keeps any existing courseware if generation fails.

   ![Week 1 generating state](03-generating-with-pulse-thinking.png)

4. On success, the week expands to three separate **Draft** items: a learning material, an activity, and an assessment. Use **Open** to inspect an item. **Check** and **Check All Drafts** are instructor actions; generation itself does not mark the items checked.

   ![Three generated draft items](04-generated-drafts-for-review.png)

5. In the material view, read the draft and the **AI draft review** panel before checking it. The panel checks every outline topic and outcome, the planned activity and assessment when listed, and agreement between question explanations and marked answers. It shows which statements were supported by the outline or references and leaves other statements for instructor verification. Open **Generation details and references** to inspect the source trace. **References** lists the syllabus resources and retrieved passages used; model-authored reference lists are removed.

   ![Material document and review panel](05-draft-document-view.png)

   ![Outline alignment and statement check](06-outline-alignment-check.png)

6. Edit any inaccurate explanation or answer key, then use **Check** only after reviewing the material, activity, and assessment. Drafts are not published or graded automatically.

The six images come from the production build using the local `qwen2.5:3b` model and a real generated week 1 draft. The [v0.4.0 release record](../../versions/v0.4.0/README.md) maps them to NFR-AI-06 (goal 6).
