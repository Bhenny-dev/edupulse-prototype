# Automatic records and instructor course rosters

7 November 2026. The owner requested automatic refresh/sync, three Syllabus tabs, the **Course** navigation label, and instructor CRUD for course students in Student Monitoring.

Authorized academic reads now revalidate with request coalescing, invalidation, offline handling and bounded retries. Clean legacy instructor workspaces reconcile automatically; normal revision-checked saves retain their existing transactional projection. Business commands and AI generation are never replayed by this scheduler.

Roster selection/import lives in **Student Monitoring → Students**, alongside the retained score and material-access views. Confirmed registration, block changes and removal persist in the owner workspace. Private database triggers enforce saved membership decisions across both workspace and shared-import paths, prevent silent re-enrollment, preserve attempts/accounts and enforce block capacity. The migration introduces no public function grants or direct table-write privileges.

**Syllabus** retains **My Syllabus**, **Shared Repository**, **Syllabus Builder** and the offline approval lifecycle. **Course** retains the combined courseware workspace. Old authoring, course/week, roster and Scoring Sheet links remain usable.

[Manual 21](../../system-manual/21-automatic-records-and-course-rosters/README.md) documents current controls. [Validation](validation/results.md) records evidence and limitations.
