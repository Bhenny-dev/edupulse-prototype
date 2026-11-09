# 12 · Navigation, dialogs and loading feedback

These captures show the current interface. Academic loading/records scenes use synthetic UI transport; they do not establish hosted authentication, database permissions or persistence. The file-scan scene uses an actual synthetic scanned PDF and on-device OCR.

| State | Capture | What to expect |
| --- | --- | --- |
| Page navigation | ![Single page tabs](01-page-tabs.png) | Syllabus views are selected using the page tabs. My Syllabus now also provides approved-file intake above saved records ([Manual 30](../30-approved-syllabus-intake/README.md)). The duplicate left sidebar is gone; primary areas remain in the top bar. |
| Monitor navigation on mobile | ![Monitor page navigation](09-mobile-monitor-tabs.png) | Preview Monitor keeps its four subviews in a horizontally scrollable page navigation row. |
| Pulse launcher | ![Avatar-only Pulse](02-avatar-launcher.png) | The character is the entire launcher. Its accessible name remains **Open Pulse assistant**, and it supports keyboard focus and dragging. |
| Dialog with Pulse | ![Dialog beside Pulse](03-dialog-and-pulse.png) | The syllabus dialog and assistant have distinct desktop columns. Both scroll independently and their controls stay inside their own surface. **Download PDF** exports the displayed syllabus; **Close** and the PDF action remain outside the scrolling document. **Escape** dismisses the top dialog while Pulse stays open. |
| Loading records | ![Academic record skeleton](04-records-loading.png) | The account dashboard shows its title and welcome line at once; skeleton cards and rows reserve the expected layout while the record request is pending. Automatic record reads show **Updating records…** with a spinner; **Export** waits for the records. Duplicate refresh requests share one in-flight read. No record counts are guessed. |
| Reading a file | ![Syllabus scan progress](05-file-scan-progress.png) | A spinner and indeterminate progress bar accompany the current parsing/OCR message. There is no invented completion percentage. A model download uses its actual download progress instead. |
| Mobile tabs | ![Mobile page tabs](06-mobile-page-tabs.png) | Page tabs remain reachable without another navigation strip above them. |
| Mobile dialog and Pulse | ![Stacked dialog and Pulse](07-mobile-dialog-and-pulse.png) | The dialog scrolls above the assistant. The document and message controls occupy separate vertical areas. |
| Mobile record loading | ![Mobile loading skeleton](08-mobile-records-loading.png) | The header buttons stack full width; skeleton cards use two columns and rows remain inside the viewport. |

A failed academic request replaces loading with the actual error and a **Retry connection** control and automatic retry status. It does not claim that an unreachable account has zero records. Workspace loading/saving and provider connection checks also show compact spinners. Reduced-motion preferences disable spinning, shimmer and moving bars while retaining readable status text.

The [feature-presence audit](../../session-generated/2026-10-27-feature-presence-audit/README.md) separates retained features, authenticated-view gaps and intentional removals from earlier versions.

A dialog keeps the component context of its source page. Pulse can focus a table or control inside it. Dropping onto the header or backdrop is refused; it cannot select content hidden behind that surface. Syllabus actions occupy a separate footer, so scrolling content cannot show through or cover them.

If you open **workspace buddies** while a document dialog is open, the office owns the keyboard. **Escape** closes the office and returns to the document; it does not dismiss the document underneath.

## Restored account sections

Loading/error feedback remains shared while role-specific account sections now include charts, matrices, readers and management tabs. [Manual 13](../13-restored-account-sections/README.md) documents those tasks and account-scoped notice/read behavior.

## Expanded loading audit, 7 November 2026

[Manual 19](../19-loading-and-saved-connections/README.md) extends these captures to provider restore/testing, Pulse dots, notification popovers, student-directory results, approved-file modals and System Admin counts. It records the reviewed surfaces and preserves existing OCR/model/generation progress rather than inventing percentages.

The current mobile Monitor navigation has one **Syllabus & Delivery** destination instead of two duplicate top-level tabs. Its sample status and delivery sections remain available together. [Manual 29](../29-combined-oversight/README.md) distinguishes preview examples from signed-in oversight.
