# 26 - Generate from the actual course outline

**Who:** instructor. **Where:** **Course**, then a teaching week. Existing review, edit, document, presentation, PDF and delivery actions remain available.

1. Review the week's syllabus topics, outcomes, teaching activities and assessment format before **Generate** or **Regenerate week**. Generation always produces one complete learning document. It adds a discussion, laboratory, essay, report or project guide when the plan calls for that work, and an interactive assessment only when a quiz/test response format is planned. "Learning" alone does not request a quiz. This original sample week has five loop topics and a discussion: the result has **2 items generated**, both **Draft**, with no readiness quiz.

   ![Five loop topics with two planned draft items](01-planned-items.png)

2. Choose **View** on the learning material. Read its explanations and worked examples rather than relying on an overview. The writer receives the supported topics (up to 40), outcomes and supplied institutional/course context. Lesson parts contain at most three topics per generation call and are assembled into one document before saving. The sample starts with **State, conditions and loop counters** and **Worked example and boundary cases**.

   ![Lesson context and the first worked example](02-lesson-context.png)

3. Continue through the complete document. This sample includes a nested-loop trace, boundary cases, independent practice and review criteria. Generated text must pass schema, minimum-body-length and topic-completeness checks. These checks can reject a thin response but cannot certify teaching quality or factual accuracy. A connected model can still fail or require better supplied references.

   ![Nested loop worked trace and bounded-loop practice](03-worked-example.png)

4. Read **References** and then **AI draft review** at the end. Material coverage combines its bounded parts; activity and assessment reviews concern their own outcomes and format. In this controlled example, **100% coverage** means all measured topics were detected, while **0 supported, 47 for your verification** explicitly leaves factual verification to the instructor. There is no answer-key line for a document with no objective questions. Missing references remain visible and must be resolved before publication.

   ![References followed by the final material review](04-final-review.png)

5. Open the discussion's **View** action. Its **Purpose and preparation**, **Discussion tasks**, and **Expected output and review** follow the planned activity. A laboratory or written deliverable similarly stays a guide rather than becoming a multiple-choice quiz. Planned interactive assessments retain the platform's current 3-5-question limit, mapped topics and supported multiple-choice, True/False or instructor-marked written response types. No institutional grading weight, deadline or duration is invented.

   ![Planned discussion guide with preparation, tasks and review](05-discussion-guide.png)

**Generate missing content** skips saved types. Explicit regeneration preserves checked/published types before inference, retains manually authored work and removes obsolete unreviewed AI types only after a complete successful replacement. A changed syllabus or edited draft cancels the save. Failure in any required part leaves the saved week intact; success is reported only after the revision-checked workspace response. Generation never checks or publishes material or records student completion. Existing thin drafts are not silently rewritten: review the outline and explicitly regenerate the unreviewed week.

## Evidence boundaries

These five captures use original sample loop teaching text through the actual courseware graph with controlled account, provider and workspace transports. The connection badge is a simulated ready state. They demonstrate rendering, planned outputs, final evaluation and save/reload interaction; they do not establish hosted sign-in, paid-provider quality or student activity. A separate native HTTP test uses the real API and isolated database to prove a failed later part leaves the revision unchanged and a complete week persists. A separate installed `qwen2.5:1.5b` smoke generated 393 body words for one topic from supplied sample teaching text in 45.107 seconds using one 2,400-token writer call. That source-constrained smoke does not establish independent curriculum accuracy, general free-model reliability or successful paid-provider inference. See the [release validation](../../versions/2026-11-09-outline-driven-courseware/validation/results.md).

## Read references before regenerating

Section 7 books/links now accompany weekly resources in every generation input. The bounded writer receives selected actual passages and citation numbers. Outline coverage is distinct from factual support: the outline states what to teach and is not counted as proof for a generated explanation. Read passages appear as numbered references; unscanned book metadata and planned teaching resources remain separately labelled. Saved copies and source review are described in [Manual 31](../31-retained-syllabus-sources/README.md).
