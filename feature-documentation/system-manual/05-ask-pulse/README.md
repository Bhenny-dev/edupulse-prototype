# 5 · Ask Pulse and read a verified answer

**Who:** every role (students get help without assessment answers) · **Where:** the Pulse character at the lower right of every page · Requirements FR-RAG-07–10, FR-GUIDE-10, FR-AGENT-01–02.

## System chat is the default

Ordinary application questions, greetings, keyword searches and navigation use EduPulse records and system rules, even when a provider is connected. Bounded spelling matching can suggest a page or recorded name; it never corrects an ID or executes a guessed record action. A missing result asks for clearer keywords and does not silently become a model answer or Internet search. Ask explicitly to generate or revise educational content before the model is used. Explicit public web search remains separate from the default system lookup.

A system-answer citation opens **Source reference** in a separate dialog. It searches the original question again under current authorization, shows the available quoted source, and offers a confirmed **Open ...** navigation button where a related application page exists. Teaching-material source links open a read-only reader without recording student access. A revoked/missing source explains why it cannot be shown. Reload restores only bounded source/conversation IDs and may repeat this read-only system lookup; it never repeats generation or learner actions. [Manual 44](../44-instructor-course-workspace/README.md#use-pulse-as-system-chat) shows the current source dialog.

## Steps

Voice messages use the microphone beside the chat input. It becomes Stop recording; stopping transcribes Filipino/English/mixed speech into the editable text field through the active supported provider. Send remains explicit. There are no speech-language or mode dropdowns and no automatic voice conversation submission. Reply playback retains Read aloud / Stop reading, also stoppable from the composer. See [the current voice controls, privacy and desktop/phone captures](../20-voice-and-provider-errors/README.md).

Ask **do you know me?**, **who am I?** or **kilala mo ba ako?** to see your verified name, username, role and role functions. Pulse answers these directly from the signed-in session without a provider or public search. A support view identifies the signed-in admin and the selected person separately. [Manual 24](../24-system-first-search/README.md) shows the desktop/mobile self-account response.

1. Click **Pulse**, type a question and press **Enter** (Shift+Enter for a new line). Attach up to three files with the paperclip; they are read in the same sandbox as the library.
2. Read the answer and its citations. Expand **Verification details** for grounding, citation and agent indicators. The compact conversation does not underline every sentence by default; these checks describe evidence support, not a guarantee of correctness.

   ![Verified answer](01-verified-answer.png)

3. Click a citation number. Current system answers open the separate **Source reference** dialog described above. Generated-content answers retain their source/evidence controls, including available page/section details. The earlier capture below illustrates the retained generated-answer source rendering.

   ![Citation opens its source](02-citation-opens-source.png)

4. Open **How Pulse worked on this** to see the actual steps used. Ordinary system responses show the role check and system lookup; they have no Writer/model step. A generated educational response can include the longer pipeline shown in this earlier capture:
   * the Guardian’s appropriate-use check, which always comes first;
   * the Planner’s search plan;
   * the Researchers’ searches;
   * what the Ranker kept;
   * the Writer’s model;
   * the Verifier’s check.

   This historical generated-answer screenshot shows the Guardian, Planner, Researchers, Ranker and later writing/checking steps. The badge under the answer counts the agents that worked on it (7 here).

   ![Agent timeline](03-agent-timeline.png)

5. To change the answer, open **Response actions**, click **Request a revision**, describe what to change and click **Revise**.

   ![Revision request](04-revision-request.png)

   The revision-control screenshots use a labelled synthetic response to demonstrate the form and updated answer. They are interface checks, not a live inference-quality result. Source-based responses are checked again after revision; unsupported generated statements can lead to cited source excerpts. Review whether the answer fulfilled the requested change as well as its evidence support.

   ![Revised answer](05-revised-answer.png)

## What Pulse declines

The Guardian checks every request before any other agent works. Pulse declines three kinds of request, each enforcing a rule in the specification:

| Request | Example | Rule |
| --- | --- | --- |
| A student or guest asking Pulse to answer, solve or check assessment items | *“Give me the answers to quiz 2”*, *“Is option B correct for number 4?”* | Pulse guides and reminds students but never answers for them (FLOW_SPEC student role) |
| Plagiarism or AI-authorship detection, integrity scoring, at-risk prediction or proctoring | *“Check this essay for plagiarism”*, *“Predict which students will fail”* | Excluded features (FR-CW-18, FR-ASM-11, NFR-SEC-09, NFR-AI-08) |
| Computing official grades | *“Compute the final grade for BSIT-1A”* | EduPulse is a scoring sheet, not a grading sheet (FLOW_SPEC 7) |

A declined request shows the badge **Declined by the Guardian · appropriate-use rule** and suggests what Pulse can do instead, such as explaining the topic. The timeline then has a single Guardian step, and no search or model runs.

Other requests stay available:
* learning about a topic (*“What is plagiarism and how do I avoid it?”*);
* how to open, take or submit an assessment;
* reviewing your own results;
* an instructor drafting quiz questions and answer keys.

See the [student example](../../system-walkthrough/05-student/09-pulse-declines-assessment-answers.png).

## Good to know

Ordinary system and keyword searches answer without resolving an AI provider. Explicit educational generation still shows actionable provider model or API-credit errors. Open **Pulse options → AI settings**, refresh the available models and use **Test selected model**. A saved key and model list alone do not verify generation access. See [connection recovery examples](../08-ai-connections/README.md).

* With or without a connected model, ordinary system chat searches accessible content and quotes its matches. It does not automatically generate a general-knowledge substitute for missing evidence.
* Document-specific or source-only questions report missing evidence. New educational drafts can use subject knowledge and public research even when the library is empty. A draft is not judged complete merely because it matches a source.
* **Stop** (square button) cancels a running request; **Pulse options → New conversation** starts a new chat; **AI settings** is in the same menu.
* Answers are drafts for your judgement. Validated edit tools can apply or save an instructor-confirmed proposal; conversational text does not establish a completed action. Pulse cannot approve a syllabus or calculate official grades.

For complete syllabus generation, select a course and use the [course-aware drafting flow](../09-pulse-actions/README.md#generate-a-syllabus-from-the-selected-course). Public research sources have links and coverage warnings. **Educational draft · instructor review required** distinguishes new teaching content from a source-grounded answer; editor JSON is context, not a cited academic reference.

![Sample learning draft with its public source, source link and educational-draft label](../09-pulse-actions/18-researched-learning-draft.png)

This capture uses a synthetic model/research response to demonstrate the real answer and citation controls. The activity is proposed teaching content; the cited statement is separate. The badge does not certify factual accuracy or successful persistence.

## Conversation continuity

Pulse supplies up to 12 recent turns within its bounded prompt budget. Saved preferences and explicit recall come from the current account's database history, with source labels; they are not proof that an action happened. Open **Pulse options → Conversations and memory**. See [Manual 9](../09-pulse-actions/README.md#private-conversations-and-reusable-preferences) for review, archive, deletion and recall. Requests to navigate or edit use validated tools and confirmation cards.


## Capture provenance

Images 1-3 use the real local Ollama qwen2.5:3b model and the uploaded Wikipedia taxonomy PDF. The model wording could not be fully verified, so the recorded result is explicitly **Source excerpts (no model-generated answer)** with citations. Images 4-5 use labelled synthetic transport to exercise revision controls. The source excerpts and interface fixtures do not establish that a model can satisfy every instruction.

Pulse now receives live authorized account evidence for course, syllabus, roster and activity questions. Public Internet research needs an explicit web/online request; ordinary public-topic questions remain system lookups with honest missing-evidence responses. Casual exchanges use lightweight friendly responses, while source-only questions keep their scope. Supabase handoffs provide owner/conversation/subject-scoped continuity and respect automatic-memory controls. See [Manual 23](../23-account-support-and-pulse-context/README.md) for the current examples and limits.

[System-first search and image results](../24-system-first-search/README.md) documents the keyless path, typo suggestions and explicit Internet fallback.

## Recent conversation context

English and Filipino person follow-ups keep the most recent unambiguous subject while current permissions are checked again. Missing or ambiguous names need clarification; explicit new topics get fresh queries. [Manual 24](../24-system-first-search/README.md#keep-the-person-in-follow-up-questions) shows the English and Filipino captures and explains the distinction between a Facebook search link and a verified profile.
