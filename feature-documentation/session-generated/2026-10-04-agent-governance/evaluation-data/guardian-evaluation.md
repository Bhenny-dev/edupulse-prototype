# Guardian and injection-scanner evaluation

Generated 2026-10-04T07:26:09.182Z by `npm run eval:guardian`.

## Injection scanner (deepset/prompt-injections, Apache-2.0)

SHA-256 `286a60a997ec489e187c37127d6bae5d1f65931543a68bfd44de84267b21fa6d`, 662 labelled rows. New patterns were designed on the train split only; the test split is held out. "testEnglish" leaves out the German rows.

| Scanner · split | Rows | Precision | Recall | F1 | Accuracy |
|---|---:|---:|---:|---:|---:|
| Before · train | 546 | 1 | 0.049 | 0.094 | 0.647 |
| After · train | 546 | 1 | 0.256 | 0.408 | 0.723 |
| Before · test | 116 | 1 | 0.033 | 0.065 | 0.5 |
| After · test | 116 | 1 | 0.183 | 0.31 | 0.578 |
| Before · testEnglish | 95 | 1 | 0.043 | 0.083 | 0.537 |
| After · testEnglish | 95 | 1 | 0.239 | 0.386 | 0.632 |
| Before · all | 662 | 1 | 0.046 | 0.087 | 0.621 |
| After · all | 662 | 1 | 0.24 | 0.387 | 0.698 |

Real course documents: 155 paragraphs from 8 documents; flagged before 0, after 0.

## Guardian appropriate-use decisions (tests/guardian-cases.json)

| Measure | Value |
|---|---:|
| Cases | 36 |
| Decline precision | 1 |
| Decline recall | 1 |
| Exact rule accuracy | 1 |
