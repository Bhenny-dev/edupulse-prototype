# Workspace operations

## Local and hosted modes

Run `npm run dev` in `edupulse-app`. The local workspace shares the configured `AI_DATA_DIR` with vector knowledge. Do not open that same PGlite directory from a second server process. Browser tests use their own `.data/browser-tests` directory and ports 5174/3002.

Hosted signed-in instructor/admin accounts need the existing Supabase URL/publishable key configuration and all committed SQL migrations. Roles are granted through trusted Supabase app metadata, never a client-side selector. Hosted preview personas have no private account access and save only on their device.

## Backup and recovery

- Use **Export backup** to download the current syllabus/content/registration JSON. It may contain private course and roster data; keep it with your usual institutional backups.
- If saving fails, pending edits remain in the device journal. Restore connectivity and use **Retry save**.
- If a newer revision exists, export your pending snapshot. **Load latest after export** then loads the current server copy. Use the exported JSON to reconcile your pending changes manually; automatic backup import/merge is not provided in this release.
- Download retained approved DOCX files from **Version History**. If space is needed, download/export first, then remove the attachment. That action returns the syllabus to draft and requires the approval upload again before activation.
- Browser storage clearing, private browsing, or device loss can remove pending local edits. Server-acknowledged account saves remain in Supabase. The UI labels pending versus saved state.

## File compatibility

Approval uploads accept DOCX up to 500 KB; draft imports accept DOCX up to 2 MB. Use the exported seven-section format with labeled weeks, or a table headed Week, Learning Outcomes, and Contents. Week ranges and unsupported layouts require instructor correction; missing evidence is not fabricated. The file's Course Code must match the selected syllabus. Scanned PDFs and image-only DOCX files need a separate text/OCR workflow and cannot activate a syllabus here.

## Release checks

Run `npm run verify`, `npm run test:browser`, and `npm audit`. The Vercel build command also runs the full verify gate and must show a nonzero test count. Inspect production health/version and public workspace behavior after pushing. GitHub Actions had an account billing lock in v0.1.1; inspect the new run rather than assuming that external issue is resolved.

Run live inference smoke tests separately from browser and database tests on an 8 GB machine. Database test files run serially to limit their memory use. Ollama must have enough free RAM and GPU memory to load a model; a successful health check verifies the installed model and reachable server, not available inference memory. Generation failures preserve existing courseware.
