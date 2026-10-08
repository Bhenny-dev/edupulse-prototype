# Courseware and OCR validation

This folder preserves the October 5 local-model experiments and the subsequent OCR evaluation. It contains evaluation data, not interface screenshots. Interface captures belong to the System Manual and System Walkthrough.

## Courseware baseline

| Local `qwen2.5:1.5b` run | Completed weeks | Planned activity followed (completed weeks) | Planned assessment followed (completed weeks) | Consistent answer keys |
| --- | --- | --- | --- | --- |
| [Before](evaluation-data/courseware-before.json) | 3 of 6 | 66.7% | 33.3% | 5 of 9 |
| [After](evaluation-data/courseware-after.json) | 1 of 6 | 100% | 100% | 3 of 3 |

These figures do **not** establish an overall accuracy or reliability improvement: most attempts did not complete, and the groups of completed weeks differ. Failures include rejected draft structure and local model-runner memory or connection failures. Coverage scores apply only to completed drafts. The after run checked planned activities, assessments and answer keys, but its one completed week had no listed resources, so resource carry-over was not measured by that run.

The implemented checks retain the best valid draft across a revision, check all outline topics, include the planned activity and assessment, flag disagreements between an answer key and its explanation, and replace model-authored reference lists with the listed syllabus resources and retrieved passages. Automated coverage and key consistency are review aids; instructors must check correctness before publishing.

Run `npm run eval:courseware` in `edupulse-app` for another measured local-model run. Run browser OCR evaluations with `OCR_EVAL_OUT` set to this folder's `evaluation-data` directory. OCR uses printed sample text rendered to scanned PDFs, including lower-resolution and degraded variants; it does not measure handwriting or general document-layout recovery.

## October 8 OCR evaluation

The [measured OCR results](evaluation-data/ocr-accuracy.json) cover eleven sample pages: clear scans at 150, 200 and 300 dpi, degraded scans at 150 and 300 dpi, and a degraded scanned page in a mixed PDF. Nine pages had no word errors; two had a word error rate of about 1.52%. This small printed-text sample does not establish accuracy for arbitrary syllabi, handwritten notes or complex tables. The mixed-PDF test also confirmed that the existing text-layer page was preserved exactly.
