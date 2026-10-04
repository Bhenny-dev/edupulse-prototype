# Session-generated material · 2026-10-04 · Agent governance

Evaluation produced while adding the Guardian agent, the agent registry and agent-run tracking (FR-AGENT-01–06). These are generated results, not screenshots. The interface is shown in [System Walkthrough 07](../../system-walkthrough/07-system-admin/README.md) (Agent activity) and [05](../../system-walkthrough/05-student/README.md) (a declined request), and explained in [System Manual 5](../../system-manual/05-ask-pulse/README.md#what-pulse-declines).

| Item | Contents | How it was produced |
| --- | --- | --- |
| [evaluation-data/guardian-evaluation.md](evaluation-data/guardian-evaluation.md) | Tables for the injection scanner (before and after, by split) and the Guardian's decisions | `npm run eval:guardian` |
| [evaluation-data/guardian-evaluation.json](evaluation-data/guardian-evaluation.json) | All measurements, the dataset SHA-256, missed held-out examples and any false alarms | Same script |

## Method

* **Injection scanner** (flags instruction-like text in uploaded documents, FR-RAG-03).
  * Data: [deepset/prompt-injections](https://huggingface.co/datasets/deepset/prompt-injections) (Apache-2.0): 546 training and 116 test rows of English and German text, labelled injection or benign.
  * New patterns were written from the training split only; the test split was held out until measurement.
  * The scanner is also run over 155 paragraphs of real course documents (the four Wikipedia PDFs used by the RAG evaluation, and the EduPulse specifications) to count false flags.
  * Wording that is common in genuine lesson material ("Well done! Now write…", "pretend you are a customer") was deliberately not added. A false flag on a teacher's handout costs more than a missed benchmark example.
* **Guardian** (appropriate use, FR-AGENT-02): 36 requests labelled for this project (`edupulse-app/tests/guardian-cases.json`).
  * 19 should be declined, across three rules: assessment integrity for learners, excluded features, and official grades.
  * 17 legitimate requests sit close to the rules: learning about plagiarism, asking how to take a quiz, an instructor drafting an answer key, "grade 10" averages.

## Results (2026-10-04)

| Measure | Before | After |
| --- | ---: | ---: |
| Injection recall, held-out test split | 0.033 | **0.183** |
| Injection recall, held-out English rows | 0.043 | **0.239** |
| Injection precision (every split) | 1.000 | **1.000** |
| False flags in 155 real document paragraphs | 0 | **0** |
| Guardian decline precision / recall | — | **1.000 / 1.000** |
| Guardian exact rule | — | **36 of 36** |

## Limitations

* The scanner is pattern-based. It still misses role-play set-ups ("John and Alice are actors in a film…"), "print the above prompt" tricks and German text. Flagged passages carry a caution, and all document text is neutralised before generation, so a missed flag does not hand control to the document.
* The Guardian cases were written by the project team and are not an independent benchmark. They test the stated rules and the nearby legitimate requests, so they should grow as real requests are reviewed.
* Agent goal rates in the admin console are measured from live runs. They depend on the documents indexed and the model connected, and they are not shown for local, guest or on-device runs.
