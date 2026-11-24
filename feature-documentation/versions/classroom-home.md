# Classroom Home master plan

EduPulse uses Home as the class directory. Opening an authorized class opens a page-sized dialog over Home. Announcements, Teaching Materials & Assessments, Class List, Scores and the published outline stay inside the class. Syllabus authoring, instructor monitoring, personal practice, personal performance and institutional course management have separate purposes and remain available.

The Google Classroom guidance informs entry from class cards, a chronological announcement stream, topic filters, work states, accessible attachment and submission flows, and personal results. EduPulse keeps its course and block rules, its own interface, existing assessment policies and protected comments. The page dialog is an EduPulse design in response to the owner's request. [Student navigation](https://support.google.com/edu/classroom/answer/9582544), [Find your Classwork](https://support.google.com/edu/classroom/answer/6020284), [Topic filters](https://support.google.com/edu/classroom/answer/9093681), [Turn in an assignment](https://support.google.com/edu/classroom/answer/6020285), [Announcements](https://support.google.com/edu/classroom/answer/6020270), [Feedback](https://support.google.com/edu/classroom/answer/16643267).

The dialog must have a clear close action, keep keyboard focus visible, return focus after dismissal and reflow on small screens. Direct links must reopen the authorized class and item without replaying a write. [WAI dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [WAI tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

| Iteration | Outcome | Acceptance check |
| --- | --- | --- |
| 1 | Open student classes in a page dialog over Home | Class and child reader restore on reload. Closing reveals the original cards. |
| 2 | Remove the duplicate student Course station and route older links into Home | Old class links keep the course, term, tab and item. Plain Course opens Home without reopening a class. |
| 3 | Make close, Back and Forward predictable through parent and child views | Keyboard focus returns to the opener. Restoring a reader records no attempt or material open. |
| 4 | Make class sections clear and keyboard reachable in the page dialog | Compact class identity, a persistent section selector, usable keyboard controls and narrow-screen layout. |
| 5 | Make the Home class directory searchable | Match code, title, instructor or block. Include pending classes and provide a reset and empty state. |
| 6 | Give students a due-work view with real deadlines | Upcoming, open work and missed states use actual release, window and personal results. Each row opens its class item. |
| 7 | Give announcements a useful overview inside the class | Newest notices first, related week shortcuts and upcoming work inside the class. |
| 8 | Improve week and topic navigation | Filter weeks and resource types and expand or collapse relevant groups without losing nested assessments. |
| 9 | Clarify class results and protect submissions and feedback in context | Personal scores, manual review, deadlines, submitted work and private comments use the existing authorization and receipts. |
| 10 | Check Instructor and Student entry points and release | Exercise modal hierarchy, notifications, legacy routes, keyboard, mobile reflow, role access and publication permissions. |

Instructor changes started in parallel before this work. Integrate the Instructor Home approach through the shared route and verify both roles on the final main branch. Push each tested iteration to main before starting the next. The audit and release log is updated with evidence as each iteration finishes.

## Iteration log

1. Student Home opens the selected class in a page dialog. The existing reader and source preview are child dialogs. Eight desktop and mobile cases confirmed class entry, selection restoration, pending assigned classes and both join outcomes. The production build and typecheck passed.

Student Home now owns the course directory and progress cards. Legacy course bookmarks open the authorized class on Home. Build, typecheck, and 14 targeted desktop and mobile Playwright checks passed.

3. One history entry per student class or resource reader keeps Back and Forward predictable. Restoring focus accounts for buttons temporarily disabled by a request. Build and six desktop and mobile checks passed for history, joins and older links.

4. The class section selector stays reachable while scrolling, wraps on a 320-pixel viewport, and supports keyboard navigation. Native topic controls are in the modal focus order. Build and desktop and mobile checks passed.
