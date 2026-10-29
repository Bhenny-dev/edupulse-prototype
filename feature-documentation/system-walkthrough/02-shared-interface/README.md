# 02 · Shared interface

Controls every signed-in role has. Shown here as the Instructor; the Dean and Student see the same tools with their own navigation tabs and notifications.

## Top bar and global tools

### 1. Top bar

![Top bar](01-top-bar.png)

Left to right: logo (returns to the dashboard), the role's main tabs, **Search**, **Dark mode**, **Language**, **Notifications**, the role badge and the account menu. The owner admin can switch views. The breadcrumb remains below the bar. **Help & Support** and **Keyboard Shortcuts** are Settings tabs. Workspace backup is in **Settings → Data & Privacy**; recovery controls appear only for an error or conflict.

*Changed in v0.4.0:* icon-only buttons now have spoken names for screen readers (“Notifications, 2 unread”, “Account menu”, “Open menu / Close menu”), and the breadcrumb is a labelled navigation landmark.

**Skip to main content**, the first Tab stop on every page (it stays hidden until focused), moves focus to the page content. *Changed on 29 October 2026:* it used to open the Not Found page instead, and its white text now sits on a darker blue that reaches the 4.5:1 contrast minimum.

### 2. Search overlay (Ctrl+K)

![Search overlay](02-search-overlay.png)

Opens over the page with suggestions (syllabi, courses, courseware items, monitoring pages, class lists). Type to filter; **Esc** or **×** closes it.

### 3. Keyboard Shortcuts in Settings (?)

![Keyboard Shortcuts Settings tab](03-settings-keyboard-shortcuts.png)

**Settings → Keyboard Shortcuts** lists search, Pulse focus, opening this tab, Escape and Tab navigation. **Planned shortcuts** separates the unconnected navigation chords and export/save/undo bindings. Press **?** outside a form control to open this tab.

### 4. Language menu

![Language menu](04-language-menu.png)

Switches interface text between **English** and **Filipino**.

### 5. Notifications dropdown

![Notifications dropdown](05-notifications-dropdown.png)

The three most recent notices for the role (warnings in amber, information in blue; read items are dimmed). **View All** opens the Notifications page.

*Changed in v0.4.0:* the dropdown, the badge and the Notifications page read one shared list, so the badge always equals the page's *Unread* count, and **Mark All Read** clears the badge (it previously showed a fixed “3”).

### 6. Account menu

![Account menu](06-account-menu.png)

Name, email and role, then **Settings** and **Sign Out**. The admin account's email address is not displayed.

### 7. Role badge and admin view switching

Every account sees its role as a badge in the top bar (see image 1, *Instructor*). Roles are assigned by the administrator, and only the owner admin account can change what it sees:
* After signing in with Google, the owner admin account sees a button labelled *Admin · <current view>* where other accounts see the badge.
* The button opens the **Switch View** popover, which offers **System Admin**, **Dean**, **Associate Dean**, **Instructor** and **Student**. On a phone, where the top-bar button is hidden, the account menu has a **Switch view** entry that opens the same popover.
* The popover explains: “You remain signed in as the admin. Your AI key and saved data stay with this account.”

No other account can switch. This screen has no screenshot because it needs the owner's Google session, which the automated capture cannot use.

*Changed after v0.4.0:* the preview role switcher was removed. It used to let any preview session jump between Dean, Associate Dean, Instructor and Student.

## Pages every role has

### 8. Notifications page

![Notifications page](08-notifications-page.png)

Filter tabs (**All**, **Unread (n)** and one tab per category such as *Courseware*, *Unopened Material*, *Missing Assessment*, *Syllabus Status*). Unread notices have a blue background and dot; click one to mark it read, or use **Mark All Read**.

### 9. Help & Support in Settings

![Help and support](09-help-and-support.png)

**Getting Started** explains the five-step business flow (Load Courses → Build & Approve the Syllabus → Generate Courseware → Students Open & Answer → Monitor Students). **Contact Support** lists the IT Help Desk, office hours and quick links. The frequently asked questions follow below the visible area. **How do I connect AI?** says that each signed-in account connects its own OpenAI API key in Settings → AI & Knowledge, and that a ChatGPT subscription is separate from OpenAI API billing.

### 10–14. Settings

| Tab | Screenshot | What it holds |
| --- | --- | --- |
| Account | ![Settings · Account](10-settings-account.png) | Full name, email (not shown for the admin account), department, role (read-only) and password (disabled in preview mode); **Save Changes** |
| Appearance | ![Settings · Appearance](11-settings-appearance.png) | **Dark Mode** switch and **Font Size** (Small, Medium, Large) |
| Notifications | ![Settings · Notifications](12-settings-notifications.png) | Device-only preferences for email, weekly digest and syllabus, courseware and performance alerts (the banner states that email delivery is not connected) |
| AI & Knowledge | ![Settings · AI & Knowledge](13-settings-ai-and-knowledge.png) | **New in v0.4.0** — see below |
| Data & Privacy | ![Settings · Data & Privacy](14-settings-data-and-privacy.png) | **Export My Data**, **Export workspace backup** and the account-deletion policy |
| Help & Support | Image 9 above | Getting started, contacts and frequently asked questions |
| Keyboard Shortcuts | Image 3 above | Working shortcuts and a separate planned list |

**AI & Knowledge (New in v0.4.0)** has three cards:

The connection card offers **Connect OpenAI API**, **Connect Claude API** and **Connect with OpenRouter**, with an explanation of the available sign-in methods. A saved connection shows a masked **Saved provider credential**. The pipeline distinguishes **Model listed · not tested** from **Generation verified** after a successful **Test selected model** request. Connection status and the selected local model are shown separately from bundled embeddings and reranking. [Manual 8](../../system-manual/08-ai-connections/README.md) documents authorization, model tests, credential replacement and the hosted ChatGPT approval requirement.

1. **Pulse AI connection:** choose the provider — Ollama in the local app, a model running in this browser (WebGPU, no key), free tiers (Gemini, Groq, OpenRouter free models, Hugging Face) or OpenAI/Anthropic with your own key. Then use **Connect and load models**, pick an **Available model** and **Check active connection**. Each account connects its own key, and the hosted site has no shared key. Details: [System Manual 8](../../system-manual/08-ai-connections/README.md).
2. **Agentic RAG pipeline:** live status of the five parts Pulse depends on — *Generation* (connected model), *Embeddings* (all-MiniLM-L6-v2, 384-d, free, in-process), *Reranker* (ms-marco-MiniLM-L-6-v2 cross-encoder), *Vector database* (PGlite + pgvector locally, Supabase pgvector when hosted; hybrid vector + keyword search with reciprocal rank fusion) and *Document sandbox* (worker thread, 256 MB heap, 30 s, empty environment). The coloured chips name the nine agents: Guardian, Planner, Researcher, Ranker, Comparator, Writer, Verifier, Corrector, Librarian. Hover over a chip to see the task that agent works on.
3. **Knowledge library:** drop zone and the indexed-documents table with type, passages, quality, **Ask Pulse** and delete, plus **Compare in Pulse** when two documents are ticked. Step-by-step use is in [System Manual 4](../../system-manual/04-knowledge-library/README.md).

### 15. Dark mode

![Dark mode](15-dark-mode.png)

The whole interface switches to a dark palette (top-bar moon button or Settings → Appearance). A *Theme updated* toast confirms the change.

*Changed in v0.4.0:* the dashboard's *Getting Started* card now has a dark background in dark mode; before, its heading was white text on a white card.

## Pulse, the AI assistant (New in v0.4.0)

### 16. Pulse dock

![Pulse dock](16-pulse-dock.png)

The mascot sits bottom-right on every page. Its eyes follow the pointer. **Click** to open the panel; **drag** it onto any field, card, table or section for help with exactly that component (see [System Manual 7](../../system-manual/07-pulse-guidance/README.md)).

### 17. Pulse panel

![Pulse panel](17-pulse-panel.png)

The header contains **Pulse**, **Pulse options** and **Close Pulse**. The empty conversation asks **What would you like help with?**. Open **Pulse options** for new conversation, history/memory, page or selected-component guidance, workspace buddies and AI settings. Draft or edit actions appear after a relevant prompt and require review and confirmation. Dragging the avatar, the hover help badge and **Alt+P** still select a component.


### 18. “Ask Pulse about this” hover badge

![Dwell help badge](18-pulse-dwell-help.png)

Resting the pointer on a form control (here *Course* in the Syllabus Builder) shows a small **Ask Pulse about this** badge; clicking it opens Pulse focused on that control.

## Pulse tools and private context ? 25 October 2026

**Pulse options → Conversations and memory** opens archive and preference controls. Natural-language redirects open role-authorized pages; precise edits produce selected-field previews. See [Manual 9](../../system-manual/09-pulse-actions/README.md) for source import, confirmed edits, archive controls, preferences and installed tools. The new [field and outline guide](../../system-manual/14-pulse-and-outline-workspace/README.md) includes native file drops and whole-section targeting.


## Workspace buddies

Open **Pulse options → Workspace buddies**. The optional 3D office has six named desks, domain-specific conversations, real request/review states, a pause control and reduced-motion support. Mobile users scroll from the office to the buddy chat. See [the illustrated office guide](../../system-manual/11-workspace-buddies/README.md).

## Focused conversation layout and source context

At wide desktop widths, opening Pulse reserves a separate column beside the workspace; the mascot returns when it closes. Focused help highlights the selected section without dimming the editor. The selected-component chip names the target without technical descriptions. Saving failures remain visible when a conversation has unsaved messages. Attachments remain usable for follow-up questions and can be removed. Generated replies offer **Response actions → Download response as PDF**. Verification indicators are under **Verification details**. Connected buddy conversations use the selected persona and recent exchange; an unavailable model is labelled as an offline role guide.

## Dialog spacing, page tabs and loading feedback

Page-specific views use the tabs inside the page, with no duplicate left sidebar. Pulse opens from its avatar without a name pill. Dialogs share screen space with Pulse on desktop and stack above it on narrow displays; nested dialogs show one active surface at a time. Pending academic records display skeleton cards and table rows; short requests use spinners and file scanning uses an indeterminate bar. Reduced-motion preferences stop these animations. See [the illustrated interface guide](../../system-manual/12-interface-and-loading/README.md).

## Page, view and dialog transitions, 28 October 2026

Moving between top-bar sections fades the new page in as it rises slightly into place. Moving within a section (another page tab or editor item) keeps the page's state. When a page tab swaps its view, the new view fades in the same way. Dialogs rise in while the backdrop fades in its tint and blur; on phones, full-screen dialogs slide up like a sheet. The top-bar dropdowns (**Language**, **Notifications**, account menu) open from their button, and the search overlay opens from the top centre. These are entrance effects only: every screenshot in this walkthrough shows the settled screen, which is unchanged. With *reduce motion* turned on in the operating system they are switched off (NFR-ACC-04).

## Account notices and solid dark surfaces, 28 October 2026

Authenticated notifications now derive from authorized records instead of an empty placeholder feed. Read state is scoped to the account/role on this device. Appearance uses solid dark body/cards/primary controls with readable semantic and muted text. Laptop navigation compacts to preserve route access. See the [current account notices, charts and mobile captures](../09-restored-role-pages/README.md). The existing preview notifications remain labelled demonstration data.

## Account notices and current theme

The [current account screenshots](../09-restored-role-pages/README.md) supplement the preview scenes above. Academic publication, marking, appeal, correction and instructor reminder notices and read receipts persist to the recipient account; future releases remain hidden. Current-record reminders additionally keep device read state. In-app delivery is implemented; email/push delivery is not. Mark-read failures remain visible. Feedback uses unique toast IDs, including when multiple saves complete together.

Signed-in charts, dialogs and page surfaces use the existing solid dark palette. Page tabs and desktop/mobile route access remain without duplicate left navigation.
