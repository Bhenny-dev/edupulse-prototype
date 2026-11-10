# Learner publication metadata boundary

Learner-facing publications now exclude teacher AI review payloads, including private retrieved excerpts, traces and answer-key review indexes. Original authoring workspaces retain these details. A private trigger enforces the projection for new inserts/updates and an idempotent backfill cleans existing rows without changing publication versions, private scoring keys or attempt history.

The guard is applied to the hosted project. Baseline/readback digests confirmed nine workspace revisions unchanged; there were no existing publications or attempts before the seed release. Native SQL tests separately create and score publications to verify backfill, future writes, teacher access, role boundaries and unchanged scored history.

[Validation](validation/results.md), [progress views](../../system-manual/33-pipeline-progress/README.md).
