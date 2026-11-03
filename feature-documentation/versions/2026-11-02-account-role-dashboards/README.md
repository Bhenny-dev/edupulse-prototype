# Account dashboards use the original role components

Release record, 2 November 2026.

The [28 October restoration](../2026-10-28-role-restoration/README.md) gave signed-in Dean, Associate Dean, Instructor and Student accounts a rebuilt panel-and-table dashboard. Only the preview personas kept the original role dashboards, and only the System Admin console matched them. Signed-in accounts now render the same components as the previews:

- **Instructor:** **Getting Started with EduPulse**, icon summary cards, **Quick actions**, **My Block Sections**, **Score Snapshot** with topic averages, **Recent Activity**, the course syllabus stations and **Courseware Review Queue**.
- **Dean and Associate Dean:** summary cards, **Quick actions**, the **Syllabus Stations** and **Delivery Progress** charts, **Faculty Overview**, **Recent Activity** and **Syllabus Status by Course**.
- **Student:** summary cards, **Pulse Reminders**, **My Block**, course cards, **Learning Material Sources**, **My Score Trend** and **Upcoming Activities**.

Account values come from the authorized academic records and, for an instructor, the owner workspace. `dashboardModels.ts` builds them; `dashboardPreview.js` keeps the sample values for the preview personas, so both feed one set of components. The rules of the restoration stay: averages count only learners with marked attempts (pending written responses are left out), a missing value shows a dash or *Not recorded* rather than zero or a sample, and an empty account shows **No authorized academic records yet**. The header keeps **Refresh records**, **Export** (the authorized records) and, for instructors, **Sync my workspace**; the loading skeleton and retryable error are unchanged. A saved syllabus or courseware item completes the first two Getting Started steps.

This completes dashboard items DASH-01 to DASH-14 of the [feature-loss register](../../session-generated/2026-10-27-feature-presence-audit/feature-loss-register.md) with the original components instead of a rebuilt view. The replaced `components/academic/AcademicDashboard.jsx` is removed. Performance, monitoring, records, course loading and the student readers are unchanged. The syllabus lifecycle labels moved from the sample data file to `data/syllabusStatus.js` (still re-exported by `mockData.js`) because the account dashboards use them without loading sample data.

Guides: [restored account pages](../../system-walkthrough/09-restored-role-pages/README.md), [authenticated records](../../system-walkthrough/08-authenticated-records/README.md), [Manual 12](../../system-manual/12-interface-and-loading/README.md), [Manual 13](../../system-manual/13-restored-account-sections/README.md), and the account notes in walkthroughs [03](../../system-walkthrough/03-dean-and-associate-dean/README.md), [04](../../system-walkthrough/04-instructor/README.md) and [05](../../system-walkthrough/05-student/README.md). [Validation](validation/results.md).
