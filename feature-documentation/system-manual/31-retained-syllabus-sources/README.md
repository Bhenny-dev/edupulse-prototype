# 31 - Read and retain syllabus references

**Who:** instructor or System Admin. **Where:** open a course, then **Syllabus sources**. This panel appears when Section 7 or weekly resources contain references. Books and links are presented together, including older nested syllabus records.

1. Expand **Syllabus sources**. A link starts as **Link listed · Not read yet**; a book without readable text starts as **Book metadata only**. These entries are planning references, not factual evidence.

   ![Sample book, accessible guide and inaccessible link](01-syllabus-sources.png)

2. Choose **Read linked sources**, or generate a week to prepare its references automatically. Pending reads show **Reading and retaining sources...**. Reading and reviewing do not require a connected AI model. Existing copies are reused without another network download.

   ![Pending source read](02-reading-sources.png)

3. Check each result. The sample guide is retained; the protected example reports **Could not read linked source**. A failure does not become a successful citation or discard a previously saved copy. Catalog listings and sign-in pages are not retained as book text.

   ![Retained guide and explicitly unread references](03-retained-and-unread.png)

4. Generate and open the learning material. Numbered citations refer to read passages. **References** distinguishes used passages from **Listed in the syllabus; readable text was not used for this draft**. An unread book title cannot substantiate a statement. Outline-topic coverage remains a separate alignment check.

   ![Sample passage citations within a lesson](04-passage-citations.png)

5. At the end, expand **Generation details and references**. Retained sources show their saved date, checksum and **Review retained source**. The source review formats extracted headings, emphasis, lists, tables and code, retaining page markers where present. Open **Source details** for the full bibliographic entry, saved date, page count and checksum. Unpaginated HTML is not assigned invented book pages. Checks measure passage support, not correctness certification.

   ![Source provenance after the draft](05-reference-provenance.png)

   ![Actual sample guide extraction with checksum and download](06-retained-source-review.png)

6. For a book, open its three-dot menu and choose **Attach readable copy**. Supply a readable PDF, DOCX, HTML, TXT or Markdown file up to 2 MB. Check that the supplied book/chapter and edition match the reference. Scanned PDFs without usable text need OCR first. The system does not bypass restricted access or obtain a full book from a catalog entry.

   ![Book actions including readable attachment](07-book-source-actions.png)

   ![Retained two-page sample book extraction](08-retained-book-copy.png)

7. **Download PDF** exports a formatted reading copy of the retained searchable text, including source details. It is labelled as a reading copy and may be partial when the searchable extract was truncated. **Download retained copy** still returns the unchanged original bytes and verifies SHA-256 in the browser. The dialog keeps its close and download actions visible while its content scrolls. **Read a new version** checks the link again; changed bytes create a new immutable snapshot. The latest copy supplies later generation. Changing bibliographic metadata creates a separate citation association. **Remove retained version** requires confirmation; existing drafts keep their citation text and checksum, but a deleted copy cannot be reviewed later.

   ![Guide with two saved versions](09-source-versions.png)

![Retained source menu with download and version actions](10-retained-source-actions.png)

![Explicit confirmation before removing a retained version](11-remove-confirmation.png)

The source list retains its expanded state when returning from a document. Copies are private to the signed-in account, including during admin account support views; shared syllabi do not share private book files automatically. Up to 200 versions are retained per account. Only the first 150,000 extracted characters per copy are searchable, with truncation disclosed; original bytes remain downloadable. A source failure leaves original educational drafting available with warnings and listed references clearly separate from read evidence. Generation does not check or publish a draft.

The same controls stack on phones and use the existing dark surfaces.

![Source list on a phone](mobile-01-syllabus-sources.png)

![Phone retained and unavailable states](mobile-03-retained-and-unread.png)

![Source list in dark mode](dark-01-syllabus-sources.png)

![Dark retained and unavailable states](dark-03-retained-and-unread.png)

The attached sample Markdown renders its headings, bold text, list and table in the reader. The PDF action exports that formatting; the original Markdown remains separately downloadable.

![Formatted sample reading and PDF action](12-formatted-source-review.png)

Scroll within the reading area to continue through the table and list. The title and download actions remain available.

![Formatted comparison table and list](13-source-table-and-list.png)

![Formatted reading in dark mode](dark-12-formatted-source-review.png)

![Formatted reading on a phone](mobile-12-formatted-source-review.png)

![Phone table and list after scrolling](mobile-13-source-table-and-list.png)

## Evidence boundaries

These captures use controlled account, source and provider transports with original sample teaching text. The book attachment uses actual generated PDF bytes and extraction. They prove interaction and presentation, not a real institution's book contents or paid inference quality. Native tests separately exercise real PDF extraction, private persistence, generation citations and HTTP delivery. A live RFC download proves public fetching and cache reuse; a rolled-back hosted SQL canary proves ownership, immutable copies and denied access. See [release validation](../../versions/2026-11-09-retained-syllabus-sources/validation/results.md).

New references can be added directly in **Syllabus Builder → References** using a link or readable file, with automatic metadata extraction and retryable private indexing. See [Manual 35](../35-reference-intake/README.md). Removing a retained version also removes its associated indexed search passages; removing only the syllabus reference keeps the private copy for reuse.

Previously saved catalog/search HTML is now identified as metadata-only and excluded from teaching evidence and indexing. Its original remains inspectable. See the [older retained listing example](../35-reference-intake/README.md#older-retained-listings). Readable files attached separately remain eligible.
