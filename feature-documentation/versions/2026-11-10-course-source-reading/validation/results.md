# Validation

- Three native on-device completion regression cases passed. They exercise the actual completion adapter with controlled worker responses, including the reported missing-schema contract, primitive failure normalization, output limits, cancellation and reset. They do not establish physical WebGPU/model quality.
- Both type checks and lint passed. Existing unrelated lint warnings remain.
- Six browser cases passed across desktop and mobile, covering reference read/cache/generation/citation flow, original downloads, real readable attachments and immutable versions. After the final reader layout adjustment, the formatted-reading/PDF case passed again on both viewports (two cases).
- The application's exported desktop/mobile PDFs were extracted and rendered with Poppler. Both one-page renders were opened and visually checked; the rendered pixels matched. Headings, emphasis, the table, list, source metadata and reading-copy footer are laid out without raw Markdown markers. The separately downloaded Markdown still matched the exact original bytes.
- Six capture cases passed with unchanged source during the run. Fifteen screenshots were opened for review, including all nine images changed or added in the final diff. The initial capture server could not bind Windows port 5357; the final run used the already supported local port 5352. No application behavior or check was relaxed.
- Full `npm run verify` passed: documentation, lint, both type checks, pinned model verification, all 269 native cases, production build and serverless deployment checks. Commit `9c14397ea26aa4e4920def64e668f42c635a960b` reached Ready on production deployment `dpl_7YvKXW2AhM2qKX4k5VNX1tzgDkSp`.

Source-reader captures use controlled account/archive transports. The formatted Markdown attachment traverses actual extraction and is retained byte-for-byte. Browser PDF downloads use the application's real PDF exporter, separately from the unchanged original download.
