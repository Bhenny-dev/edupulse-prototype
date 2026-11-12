# 2 · Build a syllabus and take it from draft to active

**Who:** instructors · **Where:** Syllabus → *Syllabus Builder* and *My Syllabus* · Requirements FR-SYL (lifecycle), FR-CW-01 (outline drives courseware).

Already have an approved copy? Use **Course → Upload syllabi**, then scan, review and select it in **My Syllabus** ([Manual 30](../30-approved-syllabus-intake/README.md)). This direct path needs no existing draft or course registration. The five-station indicator is removed from My Syllabus.

For a syllabus you are preparing in the builder, the optional draft route still uses five saved stations: **Drafted → Checked → Out for Approval → Approved — Uploaded → Active**. Signatures (Dean review → CAO approval → EVP noting) happen offline on the downloaded file; EduPulse never marks a syllabus approved by itself. Only an **Active** syllabus, whose Course Outline you have reviewed, drives courseware generation.

The local capture screenshots follow one syllabus (IT 102 — Computer Programming 1) through every station.

`SYL-LIFE-001` maps the lifecycle to `tests/snapshots/manual.spec.ts` and `tests/browser/workflows.spec.ts`. The October 24 DOCX/PDF import recapture uses generated sample documents and real browser extraction; both acceptance and retry are asserted. The capture run records local input evidence separately from authenticated production behavior.

## Build the draft

The dashboard's **Active Syllabi** card opens **My Syllabus** with the active-only filter. **Show all syllabi** restores the full list; changing a Syllabus tab also clears it. See [Manual 22](../22-dashboard-summary-navigation/README.md) for the current destination.

To import an existing draft, click the upload area or drop a **.docx** or **.pdf** file of up to **2 MB** into it. Review **Extracted Sections Preview**, then click **Use This Syllabus** to fill the form. Importing does not save the draft. The sample below contains course information and one outline week; review missing sections before saving.

![DOCX import preview with sample content](12-import-preview.png)

**Choose Different File** clears the preview. Unsupported or oversized files display an error; damaged DOCX or PDF files display a reading error. Click **Try Again**, then select a corrected file. You can select the same filename again.

![Unsupported file error and Try Again](13-import-error.png)

PDF text is read into the same seven-section preview. Scanned pages are read with OCR on your device (up to 60 pages); check the results against the original, especially numbers and weekly table rows. Unrecognized layouts and week ranges need manual editing.

PDF is the primary institutional intake format; Word `.docx` is also supported. The builder introduction and accepted-format hint list PDF first. Activation and retained-attachment validation accept both formats. Download for Approval exports PDF for the offline approval route.

![PDF import preview with sample course and outline](14-pdf-import-preview.png)

1. Open **Syllabus → Syllabus Builder** and choose the **Course**. Course title, period offered and academic year fill in from the curriculum and are locked; so is the course description in Section 2.

   ![Section 1 auto-filled](01-select-course-autofills-section-1.png)

2. In **Section 5 · Course Outline**, write each section's **intended learning outcome**, multiline **Contents**, **Teaching-Learning Activities** and **Assessments**. Add sections within a week or share one across a teaching-week range. Weeks 9 and 18 are the midterm and final examinations. This outline is what courseware is generated from, so write measurable outcomes.

   For a new draft, ask Pulse to generate the editable fields for the selected course. Review its field-by-field proposal, research sources and pending institutional rules before applying or saving it. See [Generate a syllabus from the selected course](../09-pulse-actions/README.md#generate-a-syllabus-from-the-selected-course). The builder header has no curriculum-outline loading button. After accepting an imported file, **Upload Different** remains available.

   ![Writing the course outline](02-write-course-outline.png)

3. Complete Sections 6 (requirements, grading, policies) and 7 (references), then click **Save as Drafted** at the bottom. (**Mark as Checked** saves and checks in one step.)

   ![Save as Drafted](03-save-as-drafted-button.png)

## Move it through the stations

4. The syllabus appears in **My Syllabus** with status **Drafted**. Version and Outline columns, Version History and Copy for next term are removed. The **Next step** column always shows the one action that moves it forward.

   ![Drafted in My Syllabus](04-my-syllabus-drafted.png)

5. After re-reading it, click **Mark as Checked**. The status becomes **Checked** and the next step becomes **Download for Approval**.

   ![Marked as checked](05-marked-as-checked.png)

6. Click **Download for Approval** to save the PDF for the offline signatory route. The status becomes **Out for Approval** and the next step is **Upload Approved File**.

   ![Out for approval](06-downloaded-for-approval.png)

7. When the signed file returns, click **Upload Approved File**. Tick the confirmation that the offline approvals are complete (EduPulse does not verify signatures) and choose the **Approved DOCX or PDF** (up to 750 KB). The file must contain the matching course code and a usable weekly outline. The original file is kept with its checksum. Split PDF rows retain their printed week labels; an unnumbered row stays flagged for comparison with the original.

   ![Upload approved syllabus dialog](07-upload-approved-file-attestation.png)

8. The status becomes **Approved — Uploaded** and the next step is **Extract Outline**.

   ![Approved file uploaded](08-approved-file-uploaded.png)

## Activate it

9. Click **Extract Outline**. EduPulse reads Section 5 of the approved file and shows each row (week, outcomes, contents, assessments; exam weeks are marked *Milestone*). Each teaching row becomes one courseware generation unit. Check it against the signed document, then click **Confirm Extraction — Activate Syllabus**.

   ![Review the extracted outline](09-review-extracted-outline.png)

10. The syllabus is **Active**, and the next-step column reads **Drives courseware**. It now appears in Courseware ([manual 3](../03-courseware-generation-and-review/README.md)).

    ![Active, drives courseware](10-active-drives-courseware.png)

## Good to know

* Edits are saved to the workspace automatically. Use **Settings → Data & Privacy → Export workspace backup** for a JSON copy. Recovery controls remain visible if a save fails or conflicts.
* Pulse can walk you through any section: drag it onto the section or click **Guide this page** ([manual 7](../07-pulse-guidance/README.md)). Pulse drafts; it cannot check, approve or activate a syllabus.

## Import sections through the conversation

The Pulse attachment reader also recognizes PDF and Word syllabi. Ask for the intended editable section, review its extracted text and choose replacement or addition before applying it to the open builder or saving a draft. Course identity and description stay fixed to the curriculum; this path never grants approval or activates a syllabus. See [Manual 9](../09-pulse-actions/README.md#import-selected-syllabus-sections-from-a-pdf-or-word-file).

## Check wrapped PDF tables and download the draft

The text-layer PDF reader uses ruled table cells to retain wrapped outcomes, topics and rows continued onto later pages. Explicit ranges share the source content across the listed weeks; duplicate entries for one week are combined. The expanded preview shows the extracted fields, including the complete mapped outline. Unmapped or OCR text needs comparison with the original; importing does not certify its accuracy.

![Synthetic two-page PDF with wrapped cells and a continued outline row](15-wrapped-pdf-preview.png)

After **Use This Syllabus**, the source remains available to Pulse while this builder is open. Focus a field and press **Alt+P**, or drag Pulse onto a section, then ask for a correction against that file. Check the preview and confirm before it changes the form. Leaving/reloading the builder ends that temporary source context; attach the file again or use an explicitly indexed library document.

**Download PDF draft** downloads the current form as a paginated PDF without marking it checked or saving it. **Download for Approval** downloads the checked syllabus as PDF and advances the existing offline approval workflow. PDF export does not reproduce signatures or certify approval.

![Draft PDF download beside the existing save and check controls](16-download-pdf-draft.png)

Institutional text mapped from the accepted PDF overrides the corresponding fields only in this syllabus. Missing fields preserve the existing values. New drafts use the Information Technology wording from the provided IT-202 syllabus (AY 2025-2026); saved syllabi keep their snapshot. Review this wording against current institutional requirements.

On mobile, the draft actions wrap into separate rows.

![Mobile draft download, save and check controls](17-mobile-draft-actions.png)

## Revise or restore an active syllabus

In **My Syllabus**, use **Edit syllabus** for a non-sample record, including an active syllabus. Saving the revision retains the earlier editable snapshot and returns the syllabus to Drafted; approval and extraction must be completed again. Previously published courseware is withdrawn. Changed outline weeks additionally return their items to draft with an alignment warning; review or regenerate them against the new approved outline before publishing again.

Saved snapshots remain internal; the history and next-term copy controls are removed. Use **View Syllabus** to download the current retained approved file. Suspension precedes deletion; see [Manual 36](../36-instructor-syllabi/README.md).

Confirmed shared course loads are shown above the builder when available. The identity/description fields remain locked under the later correction. The syllabus author still owns the draft and confirms every change.


## Course Outline editing space

The [Course Outline workspace](../14-pulse-and-outline-workspace/README.md#manage-the-course-outline) is one table for both terms with term/week filters, an expanded view, sticky headings and full-width fields that grow with their text. Teaching content moves between fixed calendar slots with the grip or move buttons; weeks 9 and 18 remain examinations. Materials, assessment types and resources stay with their teaching content.

The approved-file modal now displays **Reading approved file…** and a spinner during checksum and parsing. Initial workspace and student-directory reads use skeletons. [Manual 19](../19-loading-and-saved-connections/README.md) shows these pending states; the offline approval and outline validation requirements remain.

## Searchable outline choices

Each section has one assessment-type selector with the seven supported choices and a system-selected default. The teaching-material selector is removed. Activity and assessment-detail text keep their own fields. See [Manual 28](../28-outline-selectors/README.md).

## Progressive Course Outline drafts

[Manual 34](../34-progressive-outlines/README.md) shows weekly previews as generation continues, retained completed weeks after a later failure, same-course reference patterns and safe placement into the form. These controls do not automatically save, check or publish a syllabus.

Section 7 now accepts a **Source link** or **Upload reference file**, including drag and drop. Review the automatically extracted citation and missing fields, then save the syllabus explicitly. See [Manual 35](../35-reference-intake/README.md). The draft PDF includes these citation details and URLs.

When selecting registered students for a course block, the directory is limited to **College of Information Technology**. Year and program filters remain available. The [student directory guide](../16-student-directory/README.md) shows the current controls.

The outline editor now uses **Teaching-Learning Activities** and **Assessments**, with one multiline **Contents** field per section. Add multiple sections within a week or share a section over teaching weeks. Printed shared weeks/row sections are retained on import, and exports keep the section labels. The old teaching-material dropdown is removed; the assessment selector offers only the seven supported types. See [Manual 28](../28-outline-selectors/README.md).

When re-importing an EduPulse PDF, the approval/page footer is excluded from the outline fields. Blank printed weeks remain blank; a page number does not become a teaching scope or assessment. Multiline educational fields and shared section labels remain intact.

## Sharing and deletion

**Share syllabus** selects a registered instructor from a dropdown. Received copies can be adopted as a draft, or explicitly acknowledged for approved use when the sender retains a matching approved file. **Suspend syllabus** must be saved before **Delete syllabus** is available. Resume keeps courseware unpublished until explicitly released again. See [Manual 36](../36-instructor-syllabi/README.md).

The Syllabus page no longer displays the **Confirmed course loads** summary. Its tabs and upload/builder controls remain; assigned course loads and roster matching are unchanged.

![Syllabus without the removed course-load summary](40-without-course-load-summary.png)
