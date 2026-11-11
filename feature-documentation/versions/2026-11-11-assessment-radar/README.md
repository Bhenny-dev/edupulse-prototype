# Three scored assessments for the radar

The researchers extended Dave's live IT 103 Week 12 example to three distinct, reviewed quizzes with nine labelled saved attempts from the same three registered BSIT test learners. Class averages are 75%, 92% and 58%. Student and instructor readback matches. These records exercise the actual scoring and delivery pipeline; they are not independent learner achievement.

The radar minimum remains three distinct scored current assessments. Narrow-screen spacing retains the labels. Timed-attempt email metadata is now derived from verified student IDs so instructor roster/block matching works; old blank labels are repaired without changing marks.

See [Manual 33](../../system-manual/33-pipeline-progress/README.md#three-distinct-scored-assessments) and [validation](validation/results.md).

Application commit `e741fc570aa94d88558f776e235b675f684bc9a0` is live on [production](https://edupulse-prototype.vercel.app/). Post-deployment checks on 11 November 2026 at 7:39 PM Philippine time confirmed the three-axis chart and reload retention using actual instructor authentication at desktop and phone widths. See the [production receipt](validation/production-receipt.json). GitHub Actions could not start because of the existing account billing lock; local release checks passed and Vercel independently reached Ready.
