# 01 · Public site

These are the pages a visitor sees before signing in:
* `/`: the landing page, which scrolls through all its sections;
* `/privacy` and `/terms`: the legal pages;
* `/500`: the server error page.

The landing page focuses on the College of Information Technology (CIT) of King's College of the Philippines (KCP). The KCP crest and the five college emblems were supplied by the project owner. The photographs come from [kcp.edu.ph](https://kcp.edu.ph/): the CIT page and each college's card image on the KCP home page. They were downloaded on 28 October 2026 and are served from the app itself, so the page does not depend on the KCP site being available. The page credits them as **Photos: King's College of the Philippines (kcp.edu.ph)** and **Photos and emblems © King's College of the Philippines**. The product screens in the Features section are the EduPulse prototype with sample data.

The page is white and light blue, with headings in Sora and text in DM Sans.

**What the screenshots show.** The landing images were captured with *reduce motion* turned on, so every section is complete and still. With motion allowed, the page also moves; none of this appears in the images:
* **Opening.** The landing page always starts with the opening: whenever it loads at the top, a reload included, the EduPulse logo and name appear on a white and light-blue field while blue geometric planes and 3D facets assemble around them, with **Scroll to explore** below. There is no control to skip it. Scrolling about one screen opens the planes outward like an aperture and reveals the hero; scrolling back up closes it again. A keyboard user who presses Tab into the hero plays the opening forward to its end, so focus never sits under the planes; that focus stays put when the page re-measures itself (after a resize, or as the fonts and photographs arrive). Back and Forward, links to a section (for example `#/?section=faq`), later returns to the landing page within the same visit and reduced motion start without it.
* **3D hero.** As the opening clears, the emblem in image 1 becomes 3D: the blue Pulse ring tips back like a halo, and the KCP crest and the CIT seal are porcelain medallions with blue rims that turn in from edge-on, float, catch a slowly travelling light and tilt with a mouse pointer, while white and pale-blue planes and one blue accent drift around them. Every movement is long and damped. Without WebGL the flat emblem stays.
* **Section arrivals.** Each section's content eases in as it comes up the screen, in both directions: a block comes in over about a second however fast you scroll, and scrolling back past it plays the entrance again. A card (a panel with its own surface) slides in from a side of the screen as it fades up, then its icon, heading and text rise in one after another. Cards in a row follow one another: those on the left come from the left, those on the right from the right and those in the middle from the edge they are arriving at; the phase and college cards come from the right and the role tabs and panels from above and below. Headings, labels and lists without a card rise into place line by line. Nothing covers the page or blocks a click.
* **Section entrances.** Section headings rise line by line, the five *Why EduPulse* cards are built showing **Today** and then turn over one by one to **With EduPulse**, the phase timeline draws its line as you scroll, the Pulse example opens in a circle and its messages appear one at a time, the arcs around the CIT seal draw in, the 31% meter fills to its share and the sign-in photograph opens from a rectangle. Each plays once.
* **Agents.** The agents section holds the screen while scrolling travels inward ring by ring, with neighbouring rings turning in opposite directions. A card names each agent in turn (**01 / 09** to **09 / 09**), that agent's ring turns blue, and its portrait pops into a round lens at the centre, waving with its own gesture (the Guardian raises its shield, the Writer scribbles, the Verifier stamps its check). After the ninth, the blue core opens while all nine wave together, the screen turns white, and the white clears into the agent workspace (section 8c), which was waiting behind it.
* **Agent workspace.** When the white clears, the studio fills the screen on its own and assembles: the floor settles, the walls rise, the furniture drops in and the nine agents hop to their places while the camera settles from above. The page holds it for a moment before moving on. The agents work at their stations (typing, drawing on the whiteboard, reading, comparing two papers, watching the door), mugs steam, dust drifts in the window light, the string lights glow and a cat sleeps on the rug. A tapped agent, or its button along the bottom, stands up, turns to the camera and waves while the camera glides in and its line types out in a bubble above it, the question above the answer. With a mouse, dragging turns the room a little. **Pause motion** stops all of it.
* **Features on a desktop.** The section holds still while its four parts change beside one framed prototype screen. The step number, heading, screen, caption and the step buttons **01** to **04** always change together, scrolling up or down; a step button scrolls to its part.
* **Photographs.** The two rows of community photographs drift slowly in opposite directions. **Pause photo movement**, under the rows, stops them until **Play photo movement** is pressed. Hovering, keyboard focus or a tap also stops them (a second tap starts them again), and they stop off screen and in a hidden tab.
* **Links.** Section links glide to their section and stop just under the top bar; scrolling yourself stops the glide. **Privacy** opens with a rectangular reveal and **Terms** with a diagonal one.

On a phone the sections stack and nothing is held in place while scrolling. **Skip to main content**, the first stop when you press Tab, moves focus past the navigation and the hero to *Why EduPulse*.

## 1. Landing page: hero

![Landing hero](01-landing-hero.png)

- **Top bar:** the KCP crest and the EduPulse logo, then **Why EduPulse**, **Features**, **How It Works**, **Roles**, **Impact**, **Colleges** and **FAQ**, which jump to their sections, and the blue **Sign In** button, which jumps to the sign-in panel. At the top of the page the bar has no background of its own.
- **Institution line:** *King's College of the Philippines* above *College of Information Technology*.
- **Headline:** “One shared home for syllabi, courseware & scores”, in heavy dark type.
- **Actions:** **Get started** scrolls to sign-in; **See how it works** scrolls to the six phases (section 5).
- **Emblem, on the right:** the blue Pulse ring as a halo around the KCP crest and the CIT seal, each on a white disc with a blue rim, the CIT seal a little in front and lower. The hero shows no product screen or photograph: those belong to the sections below. On a phone the emblem sits under the actions.

## 2. Landing navigation after scrolling

![Landing navigation](02-landing-navigation.png)

Once the page scrolls, the bar turns solid white with a thin rule beneath it. The link for the section in view is underlined in blue (here **Features**), and a blue line along the bottom edge shows how far down the page you are. After the first screen, a square **Back to top** button with rounded corners also appears at the lower right (it is left out of the section crops below).

## 3. Why EduPulse

![Why EduPulse](03-landing-why-edupulse.png)

The heading **Why EduPulse** and one line: “Every lesson should follow the approved syllabus. Today, the pieces drift apart.” Below it, a switch (**Today** | **With EduPulse**) and five cards, each with an icon, an area and one phrase. As captured, **With EduPulse** is selected and the cards show it, with blue icons; **Today** turns them over to grey cards with dashed edges and struck-through phrases:
* **Syllabus:** recycled from earlier versions → official seven-section KCP format.
* **Materials:** rushed, or pasted from AI chats → grounded in the syllabus and your files.
* **Delivery:** split between Moodle and paper → one place for every block.
* **Oversight:** unseen after course loading → every course’s status at a glance.
* **Performance:** checked by hand → scores by syllabus topic.

A line with a shield icon closes the section: “AI drafts. Instructors review and approve every item.” Screen readers hear both states of each card.

## 4. Features

![Features](04-landing-features.png)

**Features** · “From the syllabus to every class”: “Four parts, one approved syllabus. Prototype screens with sample data.” As captured (reduced motion), the four parts follow one another, each with one line, two short points and its prototype screen with a caption naming the screen:
* **01 · Dean · Associate Dean: Records and course loading** (*Records page*). “EduSuite stays the system of record. Upload its exports, check them, confirm.” *Loads by rule: master's degree, then specialization. Pulse suggests instructors; people decide.*
* **02 · Instructor: The Syllabus Builder** (*Syllabus Builder*). “Build the seven-section KCP syllabus, upload one, or co-write it with Pulse.” *AI drafts wait for your check. Signed outside EduPulse; its outline maps the rest.*
* **03 · Instructor: Courseware from the course outline** (*My Courseware list*). “Each outline week becomes materials and assessments, drawn from your sources first.” *By week, by term or the whole outline. Only published items reach students.*
* **04 · Students · Instructors · Dean: Performance by syllabus topic** (*My Performance page*). “Mastery by topic for students, missed work for instructors, delivery for the Dean.” *Reminders for unopened and missed work. Scores shown; grades stay official.*

## 5. How it works

![How it works](05-landing-how-it-works.png)

A light-blue section. On the left, **How it works** · “Six phases. People decide each one.” and “From EduSuite files to student results. The AI assists; it never finalizes.” On the right, a timeline: blue numbered squares **00** to **05** joined by a blue line, each beside a white card. A card shows the phase's icon on a light-blue tile, its name, who works in it as small chips with icons, one line on what happens, and the hand-over: a dashed **AI** box (the draft) with an arrow to a solid blue **People** box (the decision):
* **Records intake** (Dean, Associate Dean). Upload the EduSuite exports. AI: reads and previews them → People: confirm before saving.
* **Course loading** (Dean, Associate Dean). Load each course to an instructor. AI: ranks by master's degree, then specialization → People: confirm every assignment.
* **Syllabus building** (Instructor). Build or upload the seven-section syllabus. AI: co-writes each section → People: check, then sign outside EduPulse.
* **Courseware generation** (Instructor). Turn each outline week into courseware. AI: drafts from the approved syllabus → People: review, edit and publish.
* **Student access** (Students). Open materials, answer assessments. AI: reminders and missed work only → People: Pulse never answers assessment items.
* **Monitoring** (Everyone). Scores, delivery progress and notices. AI: summarizes the charts → People: no grades: the KCP sheet stays official.

On a desktop the heading stays beside the timeline while it scrolls past. The screenshot shows the timeline finished.

## 6–7. Roles

![Roles: Instructor](06-landing-roles.png)

![Roles: Student](07-landing-roles-student.png)

**Roles** · “Five roles, one platform”: “One role per account. Each sees only its own pages.” The tabs on the left (**Instructor**, **Student**, **Dean**, **Associate Dean** and **System Admin**) switch the panel on the right; the selected tab is white with blue text. The arrow keys, **Home** and **End** move between tabs, and every panel keeps the same height. Each panel opens with the role's icon on a blue tile beside a short label and a heading, then a one-line summary, the role's four tasks as tiles with icons, its **Top bar** drawn in miniature (the role's pages as tabs, **Dashboard** underlined) and, for most roles, one benefit:
* **Instructor** (image 6), *Prepare and deliver*: “Teach from one organized place”: build the syllabus, generate courseware, publish it, follow every student. Tasks: loaded courses and syllabus status; build or upload the syllabus; review, edit and publish drafts; scores and access per student. Top bar: **Dashboard**, **Syllabus**, **Courseware**, **Student Monitoring** and **Performance**. Benefit: less repetitive preparation; you keep control (SDG 4.c).
* **Student** (image 7), *Learn*: “Everything for your courses, in one place”: materials, assessments and your own progress, together. Tasks: **My Materials**, ready to open; **My Assessments** and results; mastery by topic; reminders for missed work. A shaded line with a shield icon reads “Pulse will not answer or hint at assessment items.” Top bar: **Dashboard**, **My Courses**, **Assessments** and **Performance**. Benefit: syllabus-aligned courseware (SDG 4.3 and 4.4).

The Dean, Associate Dean and System Admin tabs use the same layout (not shown).

## 8. Pulse, the AI assistant

![Pulse](08-landing-pulse.png)

A light-blue band. **Pulse, the AI assistant** · “Grounded in your documents. Decided by you.”: “On every page. It drafts from your approved sources and stops at the college’s limits.” Six principles follow, each with an icon and one short line: **Grounded first**, **Sources you can check**, **Nothing publishes itself**, **Guide, never answer**, **Asks before acting** and **Scores, not grades**.

On the right, an illustrated chat labelled *Student view · sample conversation*. The student asks “Give me the answers to quiz 2.”; two chips show what Pulse checked (*Appropriate-use rule · assessments* and *Week 4 reading · conditional statements, unopened*); Pulse replies “I can't help with assessment answers. Your Week 4 reading on conditional statements is still unopened. Want to start there?” The tag reads **Declined · appropriate-use rule**, and the caption labels the chat *Illustration*.

## 8b. The agents behind Pulse

![The agents behind Pulse](08b-landing-agents.png)

**Inside Pulse** · “The agents behind every answer”: “Pulse is nine named agents sharing one workflow. A request passes only the agents it needs, and the Guardian always checks it first.” Below it, nine concentric rings of capital letters around a blue core, one ring per agent, each naming the agent and its job (the outer ring reads *GUARDIAN · CHECKS APPROPRIATE USE*). Then the nine agents, numbered in the order a request meets them, each with a small portrait: a white robot with a dark face screen and glowing eyes, its ears, antenna and chest panel in the agent's own colour, holding up its prop (a shield, a map pin, a magnifying glass, a book, ranked bars, two pages, a pencil, a check badge or a wrench):
* **01 Guardian:** checks every request against the college’s appropriate-use rules first, and declines what breaks them, such as asking for assessment answers.
* **02 Planner:** works out what the request needs and plans the searches that will answer it.
* **03 Researcher:** runs several searches at once over the approved syllabus and your files, and public web sources when a request needs them.
* **04 Librarian:** finds readings and references in open catalogs when you ask for them.
* **05 Ranker:** weighs what the searches found, keeps the most relevant passages and stops when nothing relevant turns up.
* **06 Comparator:** lines up passages from different documents when a request compares them.
* **07 Writer:** writes the answer or draft from the ranked passages, quoting them directly when it has to.
* **08 Verifier:** checks each claim in a written answer against its sources before you see it.
* **09 Corrector:** fixes the citations the Verifier flags, or replaces an answer it cannot verify.

As captured (reduced motion), the rings stand still and the list is shown. With motion, the list is read out to screen readers but replaced on screen by the moving rings, a card for the current agent and its waving portrait at the centre (see the top of this page).

## 8c. The agent workspace

![The agent workspace](08c-landing-workspace.png)

**Agent workspace** · “Tap an agent. It answers.”: “A scripted example, not live AI.” The section is a 3D studio on its own, filling the screen, where the agents, the robots from the scope, work. In this capture the camera has moved in on the Comparator: around it are a honey-oak floor, a blue rug, a sofa with a blanket and a cushion, a coffee table with a book, a blue pouf and plants. Behind, the Librarian reads in an armchair by a full bookshelf, and the Researcher and the Ranker sit at desks with glowing monitors; in front, the Verifier and the Corrector sit at their desks. A numbered name tag floats above each agent in view, and **Show all** and **Pause motion** sit in the top corner.

The same studio is the room in Pulse’s own **Workspace buddies** window (see [the illustrated office guide](../../system-manual/11-workspace-buddies/README.md)), where the six buddies take the places.

One button per agent (**Guardian** to **Corrector**) runs along the bottom of the screen, each with its icon on a disc in the agent's colour; on a narrow screen the row scrolls sideways. There is no request panel and no conversation list: each answer is shown in the room itself.

As captured, **Comparator** has been pressed (by its button; tapping the robot does the same): the Comparator stands by the sofa on a pink ring and a bubble above it shows **Comparator**, the label *Scripted example*, the question “Compare my syllabus with last year’s.” and the answer “I’ll line them up: what is shared, what is related and what only one of them has.” The section’s heading is hidden while the camera is in close. **Show all** returns the camera to the whole studio.

Every answer is scripted from what the agents do in Pulse, one per agent. For example, the **Guardian** answers “Can you give me the quiz answers?” with “No. That breaks the assessment rule, so I stop the request here and no other agent runs.” The same answer is also read out by screen readers.

Without WebGL, a grid of the agents' icons stands in for the studio and the buttons still work: the answer then appears as a panel above the buttons. With reduced motion, the studio is shown as it is at rest and an answer appears at once.

## 9. Why it matters

![Why it matters](09-landing-why-it-matters.png)

**Why it matters** · “Preparation takes time. The research agrees.”: “Cited in the EduPulse study. They describe the problem, not EduPulse results.” Three light-blue tiles, one finding each, with an icon (a clock, a falling trend line, a timer), the figure, what it measures and its source:
* **7.4 h** a week preparing lessons, the OECD teacher average (OECD, *Results from TALIS 2024*, 2025);
* **31%** less lesson-planning time with generative AI, quality unchanged (Education Endowment Foundation, 2024), with a blue meter filled to 31% of its track;
* **5.9 h** recovered weekly by educators who use AI regularly (Gallup & Walton Family Foundation, 2025).

The findings come from different studies, so each stands on its own tile and they are not compared. Below them, a light-blue panel lists the Sustainable Development Goals the study supports, each with an icon on a blue tile: **SDG 4.3** (equitable access to quality tertiary education), **SDG 4.4** (technical skills for employment), **SDG 4.c** (well-supported teachers) and **SDG 9** (industry, innovation and infrastructure).

## 10. Colleges

![Colleges](10-landing-colleges.png)

**Colleges** · “Built for the CIT first”: “The study covers the CIT. Other KCP colleges are planned; each joins once its instructors and records are in.”

The CIT card shows its seal inside blue arcs, a green **Now serving** badge, the two BSIT tracks listed on kcp.edu.ph (*Web and Mobile Application Development* and *Business Analytics and Big Data*) and the CIT lab photograph. Below, four KCP colleges, each with a kcp.edu.ph photograph, its emblem and **Planned**:
* **College of Accountancy and Business Management** (CABM);
* **College of Criminal Justice Education** (CCJE · since 2006);
* **College of Theology** (COT · since 2010 · *Instructi ad Transformandum*);
* **College of Teacher Education and Liberal Arts** (CTELA · *Equipped to Transform*).

Years and mottos come from the emblems.

## 11. Community photographs

![Community photographs](11-landing-community.png)

**Our community** · “Made for the people of the CIT”: the instructors and BSIT students EduPulse is built around. Two rows of CIT event photographs from kcp.edu.ph. As captured (reduced motion), the rows stand still and scroll sideways; the last photograph in each row is cut at the edge. The credit reads **Photos: King's College of the Philippines (kcp.edu.ph)**. With motion, the rows drift, and the **Pause photo movement** button appears beside the credit (see the top of this page).

## 12. Frequently asked questions

![FAQ](12-landing-faq.png)

**FAQ** · “Questions people ask”: how EduPulse fits the college's process, and what the AI may and may not do. The heading sits on a slanted light-blue plane. Eight questions; one answer is open at a time, and its plus sign turns into a minus. The first, **Who can sign in to EduPulse?**, is open in the screenshot. The others ask whether EduPulse replaces the LMS or the official grading sheet, how the AI stays accurate, whether the AI publishes materials on its own, whether Pulse answers assessments for students, whether the syllabus is approved inside EduPulse, where courses, loads and class lists come from, and about the other KCP colleges.

## 13. Sign-in panel (hosted site)

![Sign-in panel](13-sign-in-panel.png)

One card. On the left, a CIT group photograph with the CIT seal, **Welcome to EduPulse**, “Sign in with the account your system administrator created. Your role decides what you see.” and the five role names. On the right, **Get started** · **Sign in to EduPulse**, “Use your EduPulse account to continue.” and the panel:
- **Email** and **Password**, then the blue **Sign In** button, for an account the administrator has created. The hint below reads “Use the email and password assigned to your EduPulse account.”
- **Sign in with Google**, with the note “System admin: choose your Google account. Other roles use email and password.” The button works only when Google sign-in is enabled for the project; otherwise the panel says Google sign-in is temporarily unavailable.
- Each account has one assigned role: system admin, Dean, Associate Dean, instructor or student. An account without a role is signed out with the message “This account has no EduPulse role. Contact the administrator.”

## 14. Preview personas (local development and documentation capture only)

![Preview personas](14-preview-personas.png)

**Quick preview access (testing only)** appears below the sign-in panel in two builds only:
* the local development app;
* the documentation capture build (`npm run build:capture`).

The hosted production build does not include it, and the deployment check enforces that. **System Admin**, **Dean**, **Assoc. Dean**, **Instructor** and **Student** open the app as that role, with sample data and no account. The rest of this walkthrough was captured with these personas.

## 15. Footer

![Footer](15-landing-footer.png)

A light-blue footer. On the left, the KCP crest and EduPulse logo, “An AI-powered syllabus and course builder with performance monitoring, made for the College of Information Technology.” and the KCP vision, quoted from kcp.edu.ph, in a card with a blue rule and the label *KCP vision*. Then three columns: **Explore** (the seven section links), **Legal** (**Privacy** and **Terms**) and **King's College of the Philippines** (Km5 Pico Rd, La Trinidad, 2601 Benguet, and **kcp.edu.ph**, which opens the official site in a new tab). A large pale *EduPulse* wordmark runs across the footer. The bottom line reads *A BSIT capstone project · College of Information Technology · Prototype v4.0* and *Photos and emblems © King's College of the Philippines*.

## 16. Privacy policy

![Privacy policy](16-privacy.png)

`/privacy` opens from the landing page footer. **Back to Home** returns to the landing page, and the effective date sits under the title. The numbered sections cover the introduction (operated by King's College of the Philippines – Benguet under the Data Privacy Act of 2012), the information collected, how it is used, retention, your rights and the Data Protection Officer contact. The screenshot shows the top of the page.

## 17. Terms of use

![Terms of use](17-terms.png)

`/terms` opens from the landing page footer and has the same layout: **Back to Home**, the effective date, then numbered sections. These cover acceptance, eligibility (authorised KCP deans, instructors and students only), account responsibilities and acceptable use.

## 18. Server error page

![Server error](18-server-error.png)

`/500` appears when the app cannot complete a request. It shows **500 · Server Error** and a short apology, with **Go to Dashboard** and **Retry**.

*Changed on 6 November 2026:* the agent workspace is the 3D studio alone on the screen, without the **Try a request** panel, its three requests and the conversation; each agent answers in a bubble in the room. Section cards now ease in from a side instead of being built from 3D pieces. Image 8c was recaptured; the other images are unchanged in content.

*Changed on 2 November 2026:* *How it works*, Roles and *Why it matters* show their content as pictures rather than lines of text (phase cards with a hand-over from the AI to people, role avatars with task tiles and a miniature top bar, finding tiles with icons and a meter), and each section's cards are now built in place as the section arrives instead of a seam passing over it. Images 5, 6, 7 and 9 were recaptured; the others are unchanged.

*Changed on 30 October 2026:* the landing page was redesigned in white and light blue, with Sora headings, DM Sans text, a once-per-tab opening, a 3D ring and geometric section motion. Images 1 to 15 were recaptured and images 16 to 18 are unchanged. The agents section and its image (8b) were added on the same day.

Official-list student accounts use the existing email/password sign-in panel. The administrator distributes credentials privately. After sign-in, the imported student identity fields appear in [Settings Account](../../system-manual/16-student-directory/README.md#4-student-profile). Directory membership alone does not grant access to course materials.
