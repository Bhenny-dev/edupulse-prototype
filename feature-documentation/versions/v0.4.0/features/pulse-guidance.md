# Pulse guidance: accurate drag-and-drop help and walkthroughs

Requirements: FR-GUIDE-02–30, NFR-ACC-02/04. Screenshots: [System Manual 7](../../../system-manual/07-pulse-guidance/README.md) and the Pulse scenes in [System Walkthrough 2](../../../system-walkthrough/02-shared-interface/README.md).

## Interaction

* **Drag (mouse or touch) or keyboard.** Drag the Pulse character onto any field, card, table, tab or section; or focus a control and press **Alt+P**. A short press still opens the chat.
* **Live target while dragging.** The component under Pulse is outlined and the hint names it with its kind (“Help with Course · dropdown”). Pulse’s eyes look at that component.
* **Accurate component brief.** After the drop, Pulse states what the component is from the page itself: “This field is labeled Course”, its kind, current state (e.g. “Nothing selected yet”, “3 of 8 fields filled”, “12 rows · columns: …”), required/disabled state, constraints (maximum length, accepted file types, ranges) and on-page help text exposed through `aria-describedby`. Values of password, email, phone and payment fields are never read.
* **Perch and placement.** Pulse hops beside the component and follows it while scrolling; on desktop the panel opens on the opposite side so the component stays visible and highlighted. Exiting returns Pulse to its dock.
* **Generated walkthrough.** *Walk me through …* tours the visible labelled controls of the component, or of the section around a single field. A step on a required, empty field waits until the user fills it.
* **Authored task walkthroughs.** Zone agents (syllabus, courseware, records, course loading, performance, monitor) keep their role-scoped intents. If a step’s control is not on the page yet, Pulse says so instead of highlighting nothing. Agent copy now states plainly where a screen uses sample data.
* **Visible rejection.** Dropping outside page content, on a role-restricted area or on a password field shakes Pulse, shows the reason in a bubble and returns it to the dock.
* **Accessibility.** Reduced-motion users get no hop, shake or eye animation; screen-reader announcements use a real visually-hidden class (previously undefined, so announcements were rendered as visible text). `FormGroup` now exposes required state and notes to assistive technology.

## Why it is accurate

The brief, tour and readiness checks read the live DOM (labels, ARIA, state, constraints) instead of authored text, so they match what the user sees. Browser tests drop Pulse on real controls with mouse and touch, verify the brief, the perch position, the waiting tour step, keyboard walkthrough completion and the rejection path.
