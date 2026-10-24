# ADR-001: academic role and offline approval boundaries

Date: 24 October 2026. Status: accepted. The owner explicitly confirmed **Use the written requirements** during the completion pass.

The earlier Flow Spec described identical Dean/Associate Dean permissions. FR-AUTH-10/11 and FR-PERF-13 explicitly separate approval authority and score visibility. Baseline navigation reserved Performance for instructors/students, while the unguarded route and Pulse previously admitted academic management roles. The API also admitted Dean/Associate Dean courseware generation despite the instructor workflow.

Enforce the explicit exclusions: Associate Dean cannot enter Performance, read score rows or generate courseware. Dean receives read-only results for the college's academic records in this single-institution project. Instructors read their own classes; students read their own attempts and enrolled publications. Shared navigation is distinct from data authority. These predicates are enforced by the API and additive academic projection's RLS, including direct Data API calls.

Courseware generation accepts the verified instructor identity, the verified owner admin (including instructor view), and the existing personal-provider guest preview-draft path. Dean/Associate Dean/student forged requests return 403 before model invocation. Client-supplied role, user ID or view role cannot change the verified identity. The owner retains its own workspace and provider credentials when switching views.

FR-SYL-08/09 now describe the already confirmed offline sequence: Drafted → Checked → Out for Approval (Dean review → CAO approval → EVP noting outside EduPulse) → Approved — Uploaded → Active. The instructor attests to approval and confirms the extracted outline. No model or electronic button grants approval.

Sample Performance remains available only for unauthenticated preview personas and is labelled on screen. Signed-in academic views query the projection and show truthful empty/error states. Owner workspace snapshots and private knowledge documents retain their existing isolation. Enrollment matches the verified account email to the instructor-confirmed class list. Published assessment answer keys remain private and objective attempts are scored by a bounded server/database command.

Validation: `AUTH-001`, `AUTH-002`, `DATA-001` in `tests/access.test.ts` and `tests/browser/access.spec.ts`; the Associate Dean denial capture and instructor/student Performance captures. The four additive migrations enforce the shared data boundaries. Synthetic authenticated account-pair/RLS canaries passed against hosted Supabase; immutable deployment checks are recorded separately in the release validation.

The selected migration is additive: existing snapshot writes project future updates, and existing instructors can explicitly synchronize their own workspace. No mass backfill, identity reassignment, electronic approval or non-instructor authoring exception was introduced. New tenants/colleges, direct EduSuite synchronization and broader administrative automation require separate requirements; they are not unfinished conditions of this bounded pilot.
