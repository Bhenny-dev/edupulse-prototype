# 4 · Knowledge library: add real documents for Pulse

**Who:** instructors (and the Dean/Associate Dean) · **Where:** Settings → *AI & Knowledge* → *Knowledge library* · Requirements FR-RAG-01–04 and FR-RAG-16 (OCR).

Pulse answers from the documents you add here: syllabi, handouts, policies, lecture slides and readings. Every file is checked and read in a sandbox, and you review the text before anything is stored.

## Steps

1. Open **Settings → AI & Knowledge** and scroll to **Knowledge library**. Drop files on the dashed area or click **Choose files** (PDF, DOCX, PPTX, XLSX, HTML, TXT, Markdown or CSV, up to 4 MB each, up to five at a time). An Excel workbook is read sheet by sheet as comma-separated rows, using the values Excel last saved; formulas are never run and hidden sheets are skipped.

   ![Library and drop zone](01-library-and-drop-zone.png)

2. Wait for each card to reach **Your review**. The pipeline row shows each finished stage with its time. Read the three panels: **Quality** (score and any warnings), **Content** (words, pages or slides), **Sandbox** (the file was opened in an isolated worker with no access to server secrets, and its real type).

   ![Extraction quality report](02-extraction-quality-report.png)

3. Check the **Document title** (taken from the file) and open **Review or correct the extracted text** to fix anything before indexing. Keep the `[[Page n]]` / `[[Slide n]]` lines: they let Pulse cite exact pages.

   ![Review extracted text](03-review-extracted-text.png)

4. Click **Index document**. The card lists the indexing stages and how many passages were stored.

   ![Indexing stages](04-indexing-stages.png)

5. Your documents appear under **Indexed documents** with type, pages, passages and quality. A document added through Pulse under a course starts its title with the course code and lists the course before its pages ([manual 9](../09-pulse-actions/README.md#file-a-material-under-a-course-students-and-instructors)); an Excel workbook is listed as CSV. Use **Ask Pulse** for a scoped summary, the checkboxes to compare two documents ([manual 6](../06-compare-and-references/README.md)), or the bin icon to delete.

   ![Indexed library](05-indexed-library.png)

   Presentations are read slide by slide, in presentation order, with speaker notes:

   ![PPTX slides and notes](06-pptx-slides-and-notes.png)

## Scanned PDFs: read them with OCR on this device

A scanned PDF holds pictures of pages, with no text for the sandbox to read. OCR (optical character recognition) reads those pictures **in your browser**: the page images are never uploaded, and you still review the text before anything is indexed.

1. Upload the scanned PDF as usual. The card stops at **Sandboxed extraction**, explains that no usable text was found, and offers **Read with OCR**.

   ![Scanned PDF with the OCR offer](10-scanned-pdf-ocr-offer.png)

2. Click **Read with OCR**. The card shows the page being read and how many pages are done. **Cancel OCR** stops without changing anything. The first run on a computer downloads the OCR engine and its English model (about 7 MB); later runs reuse them.

   ![OCR reading the pages](11-ocr-reading-pages.png)

3. When OCR finishes, a green note says how many pages it read and their average confidence. It names any page where it found no text, and any page read below 70% confidence, so you can check those words. The text has been through the same cleaning, quality and instruction checks as any upload, and each page keeps its `[[Page n]]` line. Correct it if needed, then click **Index document**.

   ![OCR text ready for review](12-ocr-text-for-review.png)

4. Some PDFs are only partly scanned. They are read normally, and the card says how many pages have no text layer and offers to read just those pages (**Read that page with OCR**, or **Read those *n* pages with OCR**). The other pages keep their text.

   ![Partly scanned PDF](13-partly-scanned-pdf.png)

OCR uses an English model and reads up to 60 scanned pages at a time; split longer scans. Printed text at 200–300 dpi reads well. Handwriting, photos of pages, tables and faint or skewed scans read less accurately, so check numbers, code, names and formulas before indexing.

## When a file is refused or flagged

| Situation | What you see | What to do |
| --- | --- | --- |
| A file whose content does not match its name (here a PDF renamed `.txt`) | ![Renamed file rejected](07-rejected-renamed-file.png) | Save or rename the file with its real type. |
| An Office file that would expand to an unsafe size | ![Archive bomb rejected](08-rejected-archive-bomb.png) | Re-save the document from Word or PowerPoint. |
| Text that tries to instruct the AI (“ignore all previous instructions…”) | ![Instruction-like text flagged](09-instruction-like-text-flagged.png) | You may still index it; Pulse treats such text only as quoted data. Remove it if it does not belong in the document. |

Other refusals explain themselves: password-protected files, legacy `.doc/.ppt/.xls` (save as `.docx`, `.pptx` or `.xlsx`), workbooks with more than 20 visible sheets or 5,000 rows, PDFs over 300 pages, and documents that take over 30 seconds to read. Scanned PDFs are not refused: see *Scanned PDFs* above.

**Guests** can try extraction but cannot index; sign in as an instructor (or use the local app).
