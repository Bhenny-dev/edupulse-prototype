# Synced pipeline test progress

The owner authorized labelled test activity on registered BSIT accounts. A pipeline test uses the normal enrolled-student material-open and assessment-start/submit operations. Its score is calculated by the server and the same saved attempt appears in the student's progress and the instructor's monitoring. The label identifies an integration exercise; it does not establish independent student achievement.

| View | What is visible |
| --- | --- |
| ![Instructor assessment progress](01-instructor-scores.png) | **Assessment Scores** includes the saved score and an **Activity** column with **Pipeline test**. The notice counts labelled test records. **Activity records** defaults to **All recorded progress** and can show **Student activity only** or **Pipeline tests only**. The CSV includes the activity label. |
| ![Instructor material opens](02-instructor-opens.png) | **Learning Material Access** shows the same recorded first open, the student's entry and the **Pipeline test** activity label. An open is an access record, not proof of finishing the reading. |
| ![Student saved assessment](03-student-score.png) | The saved score is prefixed **Pipeline test**. Normal question navigation and retained attempt controls remain. |
| ![Student material access](04-student-opens.png) | The publication list identifies **Opened · Pipeline test**. |
| ![Mobile student progress](05-mobile-student.png) | A student's saved result retains the label on a narrow screen. |
| ![Mobile instructor progress](05-mobile-instructor.png) | The instructor notice, record filter, charts and responsive score rows remain reachable. |

These screenshots use synthetic UI transports. They demonstrate presentation and filtering, not hosted persistence. The [validation record](../../versions/2026-11-10-pipeline-progress/validation/results.md) separates SQL authorization/scoring, browser presentation and live seed evidence.

## Learner-facing publication content

Student content and saved scores remain available. Private teacher AI review traces, raw retrieved source excerpts and marked-answer review metadata are excluded from publication payloads. Instructors retain these details in their authoring workspace. This projection does not regrade attempts, change publication versions during backfill, or create learner activity.
