# 5 · Ask Pulse and read a verified answer

**Who:** every role (students get help without assessment answers) · **Where:** the Pulse character at the lower right of every page · Requirements FR-RAG-07–10, FR-GUIDE-10, FR-AGENT-01–02.

## Steps

1. Click **Pulse**, type a question and press **Enter** (Shift+Enter for a new line). Attach up to three files with the paperclip; they are read in the same sandbox as the library.
2. Read the answer. Each sentence is underlined by what the sources support: solid green = supported, double = supported by two or more documents, dotted amber = partly supported or missing a citation, wavy red = not found in your sources. The badges summarize grounding and citation accuracy.

   ![Verified answer](01-verified-answer.png)

3. Click a citation number to open the exact passage, with its page, the document it came from and how it matched.

   ![Citation opens its source](02-citation-opens-source.png)

4. Open **How Pulse worked on this** to see each agent’s step, in order:
   * the Guardian’s appropriate-use check, which always comes first;
   * the Planner’s search plan;
   * the Researchers’ searches;
   * what the Ranker kept;
   * the Writer’s model;
   * the Verifier’s check.

   The screenshot is scrolled to the Researchers. The badge under the answer counts the agents that worked on it (7 here).

   ![Agent timeline](03-agent-timeline.png)

5. To change the answer, click **Request a revision**, describe what to change and click **Revise**.

   ![Revision request](04-revision-request.png)

   The revised answer is checked again before it is shown. In this capture, the small free model’s revision contained statements the Verifier could not match to the sources. So Pulse showed cited source excerpts instead, and said so in the amber note. Pulse never shows unverifiable text as if it were supported.

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

* Without a connected model, Pulse still searches and quotes the best source sentences, labelled **Source excerpts**.
* If nothing in your library or the product guide answers the question, Pulse says the evidence is missing instead of guessing.
* **Stop** (square button) cancels a running request; the trash icon clears the conversation; the gear opens AI settings.
* Answers are drafts for your judgement. Pulse cannot save, approve, publish or grade anything.
