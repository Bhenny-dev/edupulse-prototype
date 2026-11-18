# Session state (auto-saved — last known reality)

_Updated: 2026-11-18 20:29:51_  ·  branch: `main`

## Uncommitted changes
```
 M .anchor/session-state.md
 M edupulse-app/src/components/academic/TeachingLoadImport.jsx
 M feature-documentation/backend-system/README.md
 M feature-documentation/capture-runs/image-review.json
 M feature-documentation/capture-runs/latest.json
 M feature-documentation/system-manual/47-teaching-load-documents/01-extracted-load.png
 M feature-documentation/system-manual/47-teaching-load-documents/02-reviewed-mapping.png
 M feature-documentation/system-manual/47-teaching-load-documents/03-past-term.png
 M feature-documentation/system-manual/47-teaching-load-documents/05-desktop-editable-details.png
 M feature-documentation/system-manual/47-teaching-load-documents/05-mobile-editable-details.png
 M feature-documentation/system-manual/47-teaching-load-documents/README.md
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/README.md
 M feature-documentation/versions/2026-11-18-editable-load-details/validation/results.md
?? feature-documentation/capture-runs/2026-11-18T08-30-24-788Z-6e5d8b6a.json
?? feature-documentation/capture-runs/2026-11-18T08-39-53-891Z-7330aa57.json
?? feature-documentation/capture-runs/2026-11-18T08-40-49-718Z-8a26c8f5.json
?? feature-documentation/capture-runs/2026-11-18T08-41-35-030Z-06aa1162.json
```

Diff stat:
```
 .anchor/session-state.md                           |  37 ++++++++++-----------
 .../src/components/academic/TeachingLoadImport.jsx |   3 +-
 feature-documentation/backend-system/README.md     |   4 ---
 .../capture-runs/image-review.json                 |  20 +++++------
 feature-documentation/capture-runs/latest.json     |   4 +--
 .../01-extracted-load.png                          | Bin 182057 -> 185694 bytes
 .../02-reviewed-mapping.png                        | Bin 131291 -> 127984 bytes
 .../47-teaching-load-documents/03-past-term.png    | Bin 255528 -> 259365 bytes
 .../05-desktop-editable-details.png                | Bin 38031 -> 33849 bytes
 .../05-mobile-editable-details.png                 | Bin 137960 -> 124378 bytes
 .../47-teaching-load-documents/README.md           |   3 --
 .../03-dean-and-associate-dean/README.md           |   1 -
 .../validation/results.md                          |   6 ----
 13 files changed, 31 insertions(+), 47 deletions(-)
```

## Recent commits
```
97405adc feat: load block sections from subject codes and let the Dean add class lists
47ef0a0e chore: normalize load editing test line endings
7fc21050 fix: recover load schedule columns and allow reviewed field corrections
d10f44d2 feat: collect and persist instructor teaching-load details
18ff88c0 fix: remove footer from all authenticated role pages
afe1b05b fix: align academic term with management page titles
417e4f1b docs: record historical load import and production verification
6d39152f feat: retain approved historical teaching loads and term-specific qualifications
```

## Resume
Read `memory/HANDOFF.md` for intent/next-step, then reconcile against the diff above. If HANDOFF.md is older than this checkpoint, trust the diff.
