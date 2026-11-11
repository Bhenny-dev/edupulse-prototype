# 1 · Getting started

**Who:** everyone · **Where:** the landing page, the top bar and Settings.

This section points to the walkthrough screenshots rather than repeating them.

Refreshing a signed-in page keeps its route and tab. When the System Admin is viewing another account, the same person is restored after fresh verification, before academic records load. Failed verification offers an explicit retry without moving to Dashboard. The [account restoration guide](../23-account-support-and-pulse-context/README.md#reload-the-selected-account-without-returning-to-dashboard) shows the pending, restored and recovery screens.

## Sign in

1. Open EduPulse. The home page always starts with an opening that shows the EduPulse name; scroll to reach the hero. Click **Sign In** in the top bar or **Get started** in the hero; both scroll to the sign-in panel. **Sign In** on any other public page brings you to the same panel on the home page. With the keyboard, the first Tab stop is **Skip to main content**, which moves past the navigation and the hero. See the [public site walkthrough](../../system-walkthrough/01-public-site/README.md).
2. Enter the email and password of the account your system admin created, then click **Sign In**. The system admin uses **Sign in with Google**. Your assigned role (Dean, Associate Dean, instructor or student) decides which pages you see. An account without a role cannot sign in.
3. In the local development app only, **Quick preview access** opens the system as **System Admin**, **Dean**, **Assoc. Dean**, **Instructor** or **Student** with sample data. Preview work is kept on this device only. The hosted site does not offer preview access.

See: [sign-in panel](../../system-walkthrough/01-public-site/13-sign-in-panel.png) and [preview personas](../../system-walkthrough/01-public-site/14-preview-personas.png).

### Password visibility and Google icon

The password is hidden initially. Choose the eye button, **Show password**, to reveal the typed value; **Hide password** masks the same value again. The button supports Tab and Space/Enter, has a visible focus ring and does not submit the form. The email envelope, password lock and Google **G** mark remain visible. The Google mark identifies the existing **Sign in with Google** action; it does not add a separate Gmail login.

![Sign-in fields with visible eye and Google mark](01-sign-in-icons.png)

![Keyboard-focused Hide password control with illustrative text](02-password-revealed.png)

During **Signing in…**, the Google action is disabled while its mark remains visible, and the eye button is still available to hide or reveal the field. The existing authentication and assigned-role rules are unchanged.

![Visible icons while the sign-in request is pending](03-sign-in-busy.png)

These component captures use invented example input and a held synthetic authentication response. No real account password is shown or submitted. The public top bar and capture-only preview controls are hidden only for the component crop. [Mobile captures](../../system-walkthrough/06-mobile/README.md#sign-in-icons) show the same controls at the phone breakpoint.

## Explore the public pages

Before signing in, the top bar lists **Home** and eight pages: **Features**, **How It Works**, **Roles**, **Pulse**, **Impact**, **Colleges**, **Play** and **FAQ**. The link of the page you are on is filled in blue. Each page is one themed classroom in 3D that fills the screen and does not scroll: everything the page has to say is in the room, behind something you can tap. On a phone the pages are under the ☰ menu.

| To… | Do this | Screenshot |
| --- | --- | --- |
| Open a page | Click its name in the top bar; **Home** and the EduPulse name return to the home page | [Features page](../../system-walkthrough/01-public-site/30-page-features.png) |
| Look around the room | Drag it to turn the view, scroll or pinch to zoom; the hint at the bottom of the room says so | [Roles page](../../system-walkthrough/01-public-site/32-page-roles.png) |
| Zoom in on something | Click its label (on a phone, its chip under the room) or the prop itself. The camera flies in on it and its card opens beside it with a few words; **Back to the room** or **Escape** flies back out | [Features, the Courseware flask](../../system-walkthrough/01-public-site/30b-page-features-zoom.png) |
| Read a grid or a chat that used to be further down | They are things in the room: on **Roles** pick **The board** for who opens what, on **Pulse** type in the chat | [The board](../../system-walkthrough/01-public-site/38-page-roles-board.png) |
| Pick from a list | Click the round compass button in the bottom right corner, then a thing; it zooms to it and opens its card. On the home page the same button lists the rooms of the school | [Speed dial on a page](../../system-walkthrough/01-public-site/41-page-dial.png) |
| Stop the rooms moving | Open the round button and choose **Pause room motion**; **Play room motion** resumes it | [Speed dial on a page](../../system-walkthrough/01-public-site/41-page-dial.png) |
| Talk to the agents | Open **Pulse**, tap an agent or pick one under **Talk to**, and type. With no one picked, the agent whose job it is answers; a picked agent answers anything. Replies are written on the page (no AI) and each agent shows how it feels | [Pulse chat](../../system-walkthrough/01-public-site/39-page-pulse-chat.png) |
| Play a game | Open **Play**, tap **Guardian Gate**, **Agent Match** or **Quick Quiz**, then click **Play** on its card. A robot walks to the cabinet and the game runs on its screen: answer on the screen and use **Previous**, **Next** and **Exit** under it. Each game keeps a score and offers **Play again** at the end | [At the cabinet](../../system-walkthrough/01-public-site/40-page-play-cabinet.png) |
| Play with a cat | Tap it to pet it, drag it to carry it, or tap three times quickly to make it cross; it then follows the pointer along the floor for a while | [The cat](../../system-walkthrough/01-public-site/41b-page-cat.png) |
| Switch day and night | Click the sun and moon switch beside **Sign In**. It is the same setting as **Settings → Appearance → Dark Mode**, so the choice stays after signing in | [Night](../../system-walkthrough/01-public-site/42-night-page-features.png) |

## Find your way around

| To… | Do this | Screenshot |
| --- | --- | --- |
| Go to a main area | Click a tab in the top bar; on a phone, open the ☰ menu | [Top bar](../../system-walkthrough/02-shared-interface/01-top-bar.png), [mobile menu](../../system-walkthrough/06-mobile/03-navigation-menu.png) |
| Switch between a page's views | Use the tabs at the top of the page; the address keeps the view (`?tab=…`), so it can be bookmarked | [Syllabus tabs](../../system-walkthrough/04-instructor/03-syllabus-my-syllabus.png) |
| Search everything | Press **Ctrl+K** or click the magnifier | [Search](../../system-walkthrough/02-shared-interface/02-search-overlay.png) |
| See keyboard shortcuts | Open **Settings → Keyboard Shortcuts**, or press **?** outside a form control | [Shortcuts](../../system-walkthrough/02-shared-interface/03-settings-keyboard-shortcuts.png) |
| Read notifications | Click the bell; **View All** opens the full list, where clicking a notice marks it read | [Dropdown](../../system-walkthrough/02-shared-interface/05-notifications-dropdown.png), [page](../../system-walkthrough/02-shared-interface/08-notifications-page.png) |
| Get help | Open **Settings → Help & Support** or ask Pulse | [Help](../../system-walkthrough/02-shared-interface/09-help-and-support.png) |
| Keep a copy of your work | **Settings → Data & Privacy → Export workspace backup** downloads your workspace as JSON | [Backup settings](../14-pulse-and-outline-workspace/10-backup-settings.png) |

## Set your preferences

Open the account menu → **Settings**:

* **Account:** your name and department (**Save Changes**).
* **Appearance:** **Dark Mode** and **Font Size**.
* **Notifications:** which alerts you want (stored on this device).
* **AI & Knowledge:** where Pulse runs and which documents it may use — see [manual 8](../08-ai-connections/README.md) and [manual 4](../04-knowledge-library/README.md).
* **Data & Privacy:** **Export My Data**, **Export workspace backup** and the deletion policy. If a workspace save fails, this tab shows **Retry save** or backup-gated conflict recovery. See [save recovery](../14-pulse-and-outline-workspace/README.md#save-recovery-without-a-page-wide-banner). The page-wide save banner is removed.
* **Help & Support:** getting started, support contacts and frequently asked questions.
* **Keyboard Shortcuts:** working shortcuts, with unconnected shortcuts listed separately under **Planned shortcuts**.

See: [Settings tabs](../../system-walkthrough/02-shared-interface/README.md#1014-settings).

## Meet Pulse

Pulse, the character at the lower right, is the AI assistant on every page. Click it to ask, draft, compare or find references ([manual 5](../05-ask-pulse/README.md), [6](../06-compare-and-references/README.md)); drag it onto any part of a page for help with exactly that part ([manual 7](../07-pulse-guidance/README.md)).

Unique page destinations stay in the main navigation: **Records** for Dean/Associate Dean and **Assessments** for students. Mobile users find the same links under **Open menu**. Page tabs provide subviews without duplicate left navigation.

The verified System Admin can now select an actual account after choosing a role. This does not replace the admin Google session or provide the selected person's credentials. See [account support](../23-account-support-and-pulse-context/README.md) for search, filters, support restrictions and returning to the admin console.
