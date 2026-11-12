# Synced pipeline test progress

The owner authorized labelled test activity on registered BSIT accounts. A pipeline test uses the normal enrolled-student material-open and assessment-start/submit operations. Its score is calculated by the server and the same saved attempt appears in the student's progress and the instructor's monitoring. The label identifies an integration exercise; it does not establish independent student achievement.

| View | What is visible |
| --- | --- |
| ![Instructor assessment progress](01-instructor-scores.png) | **Student Monitoring → selected course/block → Assessment Scores** includes scoped charts and the labelled activity notice. Expand **Topic mastery and follow-up** for individual historical attempts and their **Activity** labels. **Activity records** defaults to **All recorded activity** and can show **Student activity only** or **Pipeline tests only**. The CSV includes the activity label. |
| ![Instructor material opens](02-instructor-opens.png) | **Learning Material Access** shows the same recorded first open for the selected class, a labelled-activity notice, and access/confirmed-reading charts. An open is an access record, not proof of finishing the reading. |
| ![Student saved assessment](03-student-score.png) | The saved score is prefixed **Pipeline test**. Normal question navigation and retained attempt controls remain. |
| ![Student material access](04-student-opens.png) | The publication list identifies **Opened · Pipeline test**. |
| ![Mobile student progress](05-mobile-student.png) | A student's saved result retains the label on a narrow screen. |
| ![Mobile instructor progress](05-mobile-instructor.png) | The instructor notice, record filter, charts and responsive score rows remain reachable. |

These screenshots use synthetic UI transports. They demonstrate presentation and filtering, not hosted persistence. The [validation record](../../versions/2026-11-10-pipeline-progress/validation/results.md) separates SQL authorization/scoring, browser presentation and live seed evidence.

## Learner-facing publication content

Student content and saved scores remain available. Private teacher AI review traces, raw retrieved source excerpts and marked-answer review metadata are excluded from publication payloads. Instructors retain these details in their authoring workspace. This projection does not regrade attempts, change publication versions during backfill, or create learner activity.

## Verified live integration exercise

On 10 November 2026, the researchers released a reviewed IT 103 Week 12 material, activity and four-question assessment through the real instructor workspace. Three registered BSIT accounts used authorized labelled tests through the normal learner APIs. Their persisted scores were 4/4, 3/4 and 2/4, with six recorded material/activity opens. Fresh instructor reads matched the exact saved attempt versions, scores and access rows. These entries appear in ordinary student progress and instructor monitoring with the existing **Pipeline test** provenance. They are integration results, not independent learner achievement or institutional grades. No account password was reset, and the approved syllabus remained unchanged.

## Three distinct scored assessments

**Assessment score radar** requires at least three distinct, active, current-version assessments with graded attempts in the selected course, block, date and activity scope. Three students answering one quiz still supply one axis. Unanswered assessments and pending marking do not supply an axis; a genuine zero score does.

| View | What is visible |
| --- | --- |
| ![Two assessments are insufficient](06-two-assessments.png) | Two scored assessments retain the explanation and count; no polygon is invented. |
| ![Three scored assessments produce a radar](07-three-assessment-radar.png) | Three separate quizzes produce three axes with a 0–100 scale. Full names and values remain in the chart's accessible description and tooltip. Extra plot margin keeps the labels within narrow panels. |
| ![Phone with two assessments](mobile-06-two-assessments.png) | The same minimum applies on a phone. |
| ![Phone radar with three assessments](mobile-07-three-assessment-radar.png) | The triangle uses the same recorded percentages, without adding missing scores. |

These images use synthetic, anonymous presentation data. Separately, on 11 November the researchers extended the live IT 103 Week 12 practice with two reviewed quizzes: **Pearson Coefficient: Calculation and Limits** and **Spearman Ranks: Computation and Interpretation**. Both follow the approved correlation outline. The same three registered BSIT test learners now have nine saved attempts across three distinct assessments. Fresh instructor and learner reads agreed; class averages are **75%**, **92%** and **58%**. Each new attempt retains **Pipeline test** provenance. These are integration exercises rather than independent learner achievement.

To view the seeded radar, open Dave's instructor **Student Monitoring**, select the **IT 103** course/block card, open **Assessment Scores**, and use **All recorded activity** or **Pipeline tests only**. **Student activity only** excludes these tests and may show the minimum-count explanation. A stale loaded view requires a deliberate browser reload; background focus or timers do not replace it. [Validation](../../versions/2026-11-11-assessment-radar/validation/results.md) distinguishes hosted persistence from synthetic captures.

Timed submissions now save the verified student account email alongside the authorization UUID, so scores match their roster rows and block filters. Missing historical labels were repaired from account IDs without regrading, changing answers, publication versions or test provenance.

Reading completion now uses version-bound sequential confirmations in the full student Document reader. Earlier first opens and pipeline-test labels never become completed reading automatically. [Manual 37](../37-instructor-monitoring/README.md) describes the merged instructor workflow.
