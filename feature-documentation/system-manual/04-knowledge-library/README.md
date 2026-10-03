# 4 · Knowledge library: add real documents for Pulse

**Who:** instructors (and the Dean/Associate Dean) · **Where:** Settings → *AI & Knowledge* → *Knowledge library* · Requirements FR-RAG-01–04.

Pulse answers from the documents you add here: syllabi, handouts, policies, lecture slides and readings. Every file is checked and read in a sandbox, and you review the text before anything is stored.

## Steps

1. Open **Settings → AI & Knowledge** and scroll to **Knowledge library**. Drop files on the dashed area or click **Choose files** (PDF, DOCX, PPTX, HTML, TXT, Markdown or CSV, up to 4 MB each, up to five at a time).

   ![Library and drop zone](01-library-and-drop-zone.png)

2. Wait for each card to reach **Your review**. The pipeline row shows each finished stage with its time. Read the three panels: **Quality** (score and any warnings), **Content** (words, pages or slides), **Sandbox** (the file was opened in an isolated worker with no access to server secrets, and its real type).

   ![Extraction quality report](02-extraction-quality-report.png)

3. Check the **Document title** (taken from the file) and open **Review or correct the extracted text** to fix anything before indexing. Keep the `[[Page n]]` / `[[Slide n]]` lines: they let Pulse cite exact pages.

   ![Review extracted text](03-review-extracted-text.png)

4. Click **Index document**. The card lists the indexing stages and how many passages were stored.

   ![Indexing stages](04-indexing-stages.png)

5. Your documents appear under **Indexed documents** with type, pages, passages and quality. Use **Ask Pulse** for a scoped summary, the checkboxes to compare two documents ([manual 6](../06-compare-and-references/README.md)), or the bin icon to delete.

   ![Indexed library](05-indexed-library.png)

   Presentations are read slide by slide, in presentation order, with speaker notes:

   ![PPTX slides and notes](06-pptx-slides-and-notes.png)

## When a file is refused or flagged

| Situation | What you see | What to do |
| --- | --- | --- |
| A file whose content does not match its name (here a PDF renamed `.txt`) | ![Renamed file rejected](07-rejected-renamed-file.png) | Save or rename the file with its real type. |
| An Office file that would expand to an unsafe size | ![Archive bomb rejected](08-rejected-archive-bomb.png) | Re-save the document from Word or PowerPoint. |
| Text that tries to instruct the AI (“ignore all previous instructions…”) | ![Instruction-like text flagged](09-instruction-like-text-flagged.png) | You may still index it; Pulse treats such text only as quoted data. Remove it if it does not belong in the document. |

Other refusals explain themselves: password-protected files, legacy `.doc/.ppt/.xls`, spreadsheets (export CSV), PDFs over 300 pages, scanned PDFs without text (run OCR first) and documents that take over 30 seconds to read.

**Guests** can try extraction but cannot index; sign in as an instructor (or use the local app).
