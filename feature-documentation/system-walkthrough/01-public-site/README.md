# 01 · Public site

These are the pages a visitor sees before signing in:
* `/`: the home page, a walk through a 3D school with one section on each surface;
* `/features`, `/how-it-works`, `/roles`, `/pulse`, `/impact`, `/colleges`, `/play` and `/faq`: the eight pages in the top bar, each one themed classroom in 3D that fills the screen and does not scroll: tap something in the room to zoom in on it and read its card;
* `/privacy` and `/terms`: the legal pages;
* `/500`: the server error page.

The site focuses on the College of Information Technology (CIT) of King's College of the Philippines (KCP). The KCP crest and the five college emblems were supplied by the project owner. The photographs come from [kcp.edu.ph](https://kcp.edu.ph/): the CIT page, each college's card image on the KCP home page and the KCP building. They were downloaded on 28 October 2026 and are served from the app itself, so the site does not depend on the KCP site being available. The pages credit them as **Photos: King's College of the Philippines (kcp.edu.ph)** and **Photos and emblems © King's College of the Philippines**. The product screens are the EduPulse prototype with sample data.

The site is a school: cream paper, oak frames, cork boards and green chalkboards, with headings in rounded bold Fredoka, text in Nunito and handwritten notes in Patrick Hand.

**What the screenshots show.** Images 1 to 18 were captured with *reduce motion* turned on: the home page is then complete and still, in the same classroom style drawn without 3D. Images 19 to 44 were captured with motion allowed, on a large screen: the walk through the school (19 to 29, with 24b to 24d and 26b), the eight pages (30 to 41, with 30b and 41b) and night (42 to 44). The phone views are in [the mobile walkthrough](../06-mobile/README.md). With motion allowed, the site also moves; none of this appears in the images:
* **Opening.** The home page always starts with the opening: whenever it loads at the top, a reload included, the EduPulse logo and name appear while geometric planes and 3D facets assemble around them, with **Scroll to explore** below. Scrolling about one screen opens the planes outward like an aperture and reveals the hero; scrolling back up closes it again. A keyboard user who presses Tab into the hero plays the opening forward to its end. Back and Forward, links to a section (for example `#/?section=faq`), later returns within the same visit and reduced motion start without it.
* **3D hero.** As the opening clears, the emblem becomes 3D: the blue Pulse ring tips back like a halo, and the KCP crest and the CIT seal are porcelain medallions that turn in from edge-on, float and tilt with a mouse pointer, while white and blue planes drift around them.
* **The walk.** On a large screen the page then walks through the school. The camera flies from room to room as you scroll, and each section rests square on its surface when it arrives: the hero on the campus lawn, *Why EduPulse* on the corridor bulletin board, *Features* on the classroom blackboard, *How it works* on the class seats, Roles with the classmates, Pulse at the teacher's end of the classroom, *Why it matters* in frames along the gallery wall, Colleges on the front stage, the photographs on lines above the KCP building, the FAQ in an open notebook and sign-in on the door of the study. A room's items pop into place as the walk arrives, and keyboard focus brings a room to the screen. The agents section and the agent workspace hold the screen on their own between Pulse and *Why it matters*.
* **Phones.** On a phone or a portrait screen the school stays behind the page and the sections scroll as ordinary content in front of it.
* **Speed dial.** On the home page, once the hero is reached, a round button with an arrow appears at the lower right, its ring filling as you go down the page; it opens **Back to top** and the rooms of the school. On each of the eight pages the button is a compass, always there, and opens the things in that room (image 41); choosing one zooms to it and opens its card. On every page **Pause room motion** stops the 3D rooms and **Play room motion** starts them again.
* **Agents.** Scrolling on from the teacher's end, the camera comes to rest square on the wall clock and the agents section holds the screen without a fade to white (images 24b to 24d). The clock grows until its rim is the thick blue ring of a scope, its two hands come apart into letters and small round shapes that swirl out and settle on nine concentric rings of chalk capitals, one per agent, neighbouring rings turning in opposite directions. A round window opens in the middle onto the agent workspace, which waits behind the scope. Scrolling then travels inward ring by ring: a pinned index card names each agent in turn (**01 / 09** to **09 / 09**) with its keywords, that agent's ring lights up and the window shows the workspace's own 3D robot for that agent, the camera turning to it, waving with its own gesture. After the ninth, the window opens out to the whole screen while the nine robots hop into a row, wave and hop back to their desks.
* **Agent workspace.** The studio is the room the scope opened onto, so there is no change of scene: it fills the screen on its own and settles. The agents work at their stations, mugs steam and a cat sleeps on the rug. A tapped agent, or its button along the bottom, stands up, turns to the camera and waves while its line types out in a bubble above it. **Pause motion** stops all of it.
* **Pages.** In each page's room the view sways a little with the mouse pointer. Tapping a label (or its stop on the speed dial) flies the camera in on that prop and opens its card beside it; **Back to the room** or **Escape** flies back out. A drag looks around, the wheel or a pinch zooms, and the robots work. The cats can be played with: a tap pets one (it purrs and little hearts float up), a drag picks it up and carries it until you let go (it lands on the floor), and three quick taps make it cross: it arches its back with a small red mark over its head, bolts away and follows the pointer along the floor while the pointer is near, then calms down a few seconds after losing interest (image 41b).
* **Photographs.** The two rows of community photographs drift slowly in opposite directions. **Pause photo movement** stops them until **Play photo movement** is pressed. Hovering, keyboard focus or a tap also stops them.
* **Day and night.** The sun and moon switch beside **Sign In** turns the whole site to night and back (images 42 to 44). It is the same setting as **Settings → Appearance → Dark Mode**, so the choice is kept.

**Skip to main content**, the first stop when you press Tab, moves focus past the navigation and the hero.

## 1. Home page: hero

![Home page hero](01-landing-hero.png)

- **Top bar:** the KCP crest and the EduPulse logo, which lead to the home page, then **Home** (filled in blue here, because this is the home page), **Features**, **How It Works**, **Roles**, **Pulse**, **Impact**, **Colleges**, **Play** and **FAQ**, which open the eight pages (images 30 to 37). On the right, the sun and moon switch (here the sun: day) and the blue **Sign In** button, which goes to the sign-in panel. At the top of the page the bar has no background of its own.
- **Institution line:** *King's College of the Philippines* above *College of Information Technology*.
- **Headline:** “One shared home for syllabi, courseware & scores”, in heavy dark rounded type.
- **Actions:** **Get started** goes to sign-in; **See how it works** goes to the six phases (section 5).
- **Emblem, on the right:** the blue Pulse ring as a halo around the KCP crest and the CIT seal, each on a white disc, the CIT seal a little in front and lower.
- **KCP building:** a photograph of the KCP building runs along the bottom edge.

## 2. Top bar after scrolling

![Top bar after scrolling](02-landing-navigation.png)

Once the page scrolls, the bar turns solid cream with a thin rule beneath it, and a blue line along its bottom edge shows how far down the page you are. The link of the page you are on is filled in blue with a small marker beneath it that slides along to the next page's link when you move: **Home** on the home page (as here), and the page's own name on each of the eight pages (images 30 to 37). On a phone the links sit in the menu button's list, **Home** first.

## 3. Why EduPulse

![Why EduPulse](03-landing-why-edupulse.png)

A cork bulletin board in an oak frame. The heading **Why EduPulse** and one line, “Every lesson should follow the approved syllabus. Today, the pieces drift apart.”, sit on a paper note held by tape. Below it, a switch (**Today** | **With EduPulse**) and five sticky notes, yellow, green and pink, each held by a red or blue pin, with a blue icon, an area, one phrase and a handwritten *With EduPulse*. As captured, **With EduPulse** is selected; **Today** turns each note over to how it is done today:
* **Syllabus:** recycled from earlier versions → official seven-section KCP format.
* **Materials:** rushed, or pasted from AI chats → grounded in the syllabus and your files.
* **Delivery:** split between Moodle and paper → one place for every block.
* **Oversight:** unseen after course loading → every course’s status at a glance.
* **Performance:** checked by hand → scores by syllabus topic.

A white pill with a shield icon closes the board: “AI drafts. Instructors review and approve every item.” Screen readers hear both states of each note.

## 4. Features

![Features](04-landing-features.png)

A green chalkboard in an oak frame. **Features** · “From the syllabus to every class”: “Four parts, one approved syllabus. Prototype screens with sample data.” As captured (reduced motion), the four parts follow one another, each with its number and roles handwritten in yellow chalk, a heading, one line, two short points and its prototype screen in a white frame with a caption naming the screen:
* **01 · Dean · Associate Dean: Records and course loading** (*Records page*). “EduSuite stays the system of record. Upload its exports, check them, confirm.” *Loads by rule: master's degree, then specialization. Pulse suggests instructors; people decide.*
* **02 · Instructor: The Syllabus Builder** (*Syllabus Builder*). “Build the seven-section KCP syllabus, upload one, or co-write it with Pulse.” *AI drafts wait for your check. Signed outside EduPulse; its outline maps the rest.*
* **03 · Instructor: Courseware from the course outline** (*My Courseware list*). “Each outline week becomes materials and assessments, drawn from your sources first.” *By week, by term or the whole outline. Only published items reach students.*
* **04 · Students · Instructors · Dean: Performance by syllabus topic** (*My Performance page*). “Mastery by topic for students, missed work for instructors, delivery for the Dean.” *Reminders for unopened and missed work. Scores shown; grades stay official.*

## 5. How it works

![How it works](05-landing-how-it-works.png)

On the left, a paper card: **How it works** · “Six phases. People decide each one.” and “From EduSuite files to student results. The AI assists; it never finalizes.” On the right, a timeline: blue numbered squares **00** to **05** joined by a blue line, each beside a card. A card shows the phase's icon on a blue disc, its name, who works in it as small chips, one line on what happens, and the hand-over: a light-blue **AI** box (the draft) with an arrow to a yellow **People** box (the decision):
* **Records intake** (Dean, Associate Dean). Upload the EduSuite exports. AI: reads and previews them → People: confirm before saving.
* **Course loading** (Dean, Associate Dean). Load each course to an instructor. AI: ranks by master's degree, then specialization → People: confirm every assignment.
* **Syllabus building** (Instructor). Build or upload the seven-section syllabus. AI: co-writes each section → People: check, then sign outside EduPulse.
* **Courseware generation** (Instructor). Turn each outline week into courseware. AI: drafts from the approved syllabus → People: review, edit and publish.
* **Student access** (Students). Open materials, answer assessments. AI: reminders and missed work only → People: Pulse never answers assessment items.
* **Monitoring** (Everyone). Scores, delivery progress and notices. AI: summarizes the charts → People: no grades: the KCP sheet stays official.

## 6-7. Roles

![Roles: Instructor](06-landing-roles.png)

![Roles: Student](07-landing-roles-student.png)

**Roles** · “Five roles, one platform”: “One role per account. Each sees only its own pages.” The tabs on the left (**Instructor**, **Student**, **Dean**, **Associate Dean** and **System Admin**) switch the panel on the right; the selected tab is blue with white text. The arrow keys, **Home** and **End** move between tabs. Each panel opens with the role's icon on a blue disc beside a handwritten label and a heading, then a one-line summary, the role's four tasks as tiles with icons, its **Top bar** drawn in miniature (the role's pages, **Dashboard** underlined) and one benefit:
* **Instructor** (image 6), *Prepare and deliver*: “Teach from one organized place”: build the syllabus, generate courseware, publish it, follow every student. Tasks: loaded courses and syllabus status; build or upload the syllabus; review, edit and publish drafts; scores and access per student. Top bar: **Dashboard**, **Syllabus**, **Courseware**, **Student Monitoring** and **Performance**. Benefit: less repetitive preparation; you keep control (SDG 4.c).
* **Student** (image 7), *Learn*: “Everything for your courses, in one place”: materials, assessments and your own progress, together. Tasks: **My Materials**, ready to open; **My Assessments** and results; mastery by topic; reminders for missed work. A yellow line with a shield icon reads “Pulse will not answer or hint at assessment items.” Top bar: **Dashboard**, **My Courses**, **Assessments** and **Performance**. Benefit: syllabus-aligned courseware (SDG 4.3 and 4.4).

The Dean, Associate Dean and System Admin tabs use the same layout (not shown).

## 8. Pulse, the AI assistant

![Pulse](08-landing-pulse.png)

**Pulse, the AI assistant** · “Grounded in your documents. Decided by you.”: “On every page. It drafts from your approved sources and stops at the college’s limits.” Six principles follow as sticky notes, each with a blue icon and one short line: **Grounded first** (drafts start from the approved syllabus and your files), **Sources you can check** (every answer names the passages it used), **Nothing publishes itself** (drafts wait until an instructor publishes them), **Guide, never answer** (students get reminders, never assessment answers), **Asks before acting** (records change only after you confirm) and **Scores, not grades** (official grades stay in the KCP grading sheet).

On the right, a chat card in keywords and icons, headed by Pulse's face and *Student view*:
* the request, in a blue bubble: “Quiz 2 answers, please.”;
* what Pulse checked, joined by a thin line: **Guardian** with the red tag *Assessment rule*, and **Week 4 reading** with the amber tag *Unopened*;
* the reply, “I can't give answers. Start with Week 4?”, with two next steps, **Open Week 4** and **Remind me**;
* the outcome, in a red pill: **Declined · appropriate use**.

The caption reads *Illustration · a student asks Pulse for quiz answers*.

## 8b. The agents behind Pulse

![The agents behind Pulse](08b-landing-agents.png)

**Inside Pulse** · “The agents behind every answer”: “Pulse is nine named agents sharing one workflow. A request passes only the agents it needs, and the Guardian always checks it first.” Below it, a round green chalkboard in a wooden frame: nine rings of chalk capitals around a pale core, one ring per agent, each naming the agent and its job (the outer ring reads *GUARDIAN · CHECKS APPROPRIATE USE*). Then the nine agents, numbered in the order a request meets them, each with a small portrait: a white robot with a dark face screen, its ears, antenna and chest panel in the agent's own colour, holding up its prop:
* **01 Guardian:** checks every request against the college’s appropriate-use rules first, and declines what breaks them, such as asking for assessment answers.
* **02 Planner:** works out what the request needs and plans the searches that will answer it.
* **03 Researcher:** runs several searches at once over the approved syllabus and your files, and public web sources when a request needs them.
* **04 Librarian:** finds readings and references in open catalogs when you ask for them.
* **05 Ranker:** weighs what the searches found, keeps the most relevant passages and stops when nothing relevant turns up.
* **06 Comparator:** lines up passages from different documents when a request compares them.
* **07 Writer:** writes the answer or draft from the ranked passages, quoting them directly when it has to.
* **08 Verifier:** checks each claim in a written answer against its sources before you see it.
* **09 Corrector:** fixes the citations the Verifier flags, or replaces an answer it cannot verify.

As captured (reduced motion), the rings stand still and the list is shown. With motion, the list is read out to screen readers but replaced on screen by the scope that grows from the wall clock: the turning rings, a pinned index card with the current agent's keywords and the workspace's 3D robot for that agent, waving, in the window at the centre (images 24b to 24d).

## 8c. The agent workspace

![The agent workspace](08c-landing-workspace.png)

**Agent workspace** · “Tap an agent. It answers.”: “A scripted example, not live AI.” The section is a 3D studio on its own, filling the screen, where the agents, the robots from the section above, work. In this capture the camera has moved in on the Comparator: around it are a honey-oak floor, a rug, a sofa with a blanket and a cushion, a coffee table with a book, a blue pouf and plants. Behind, the Librarian reads in an armchair by a full bookshelf, and the Researcher and the Ranker sit at desks with glowing monitors; in front, the Verifier and the Corrector sit at their desks. A numbered name tag floats above each agent in view, and **Show all** and **Pause motion** sit in the top corner (on a phone, just above the agent buttons).

The same studio is the room in Pulse’s own **Workspace buddies** window (see [the illustrated office guide](../../system-manual/11-workspace-buddies/README.md)), where the six buddies take the places.

One button per agent (**Guardian** to **Corrector**) runs along the bottom of the screen, each with its icon on a disc in the agent's colour; on a narrow screen the row scrolls sideways. As captured, **Comparator** has been pressed (by its button; tapping the robot does the same): the Comparator stands by the sofa on a pink ring and a bubble above it shows **Comparator**, the label *Scripted example*, the question “Compare my syllabus with last year’s.” and the answer “I’ll line them up: what is shared, what is related and what only one of them has.” **Show all** returns the camera to the whole studio.

The same studio is the window of the agents scope above (image 24d): its nine agents are the ones that line up, wave and return to their desks as the scope opens. Every answer is scripted from what the agents do in Pulse, one per agent. For example, the **Guardian** answers “Can you give me the quiz answers?” with “No. That breaks the assessment rule, so I stop the request here and no other agent runs.” The same answer is also read out by screen readers. Without WebGL, a grid of the agents' icons stands in for the studio and the buttons still work.

## 9. Why it matters

![Why it matters](09-landing-why-it-matters.png)

A paper card: **Why it matters** · “Preparation takes time. The research agrees.”: “Cited in the EduPulse study. They describe the problem, not EduPulse results.” Three findings in thick oak frames, each with an icon (a clock, a falling trend line, a timer), the figure, what it measures and its source:
* **7.4 h** a week preparing lessons, the OECD teacher average (OECD, *Results from TALIS 2024*, 2025);
* **31%** less lesson-planning time with generative AI, quality unchanged (Education Endowment Foundation, 2024), with an oak-coloured meter filled to 31% of its track;
* **5.9 h** recovered weekly by educators who use AI regularly (Gallup & Walton Family Foundation, 2025).

The findings come from different studies, so each stands in its own frame and they are not compared. Below them, a pale yellow card lists the Sustainable Development Goals the study supports, each with an icon on a blue disc: **SDG 4.3** (equitable access to quality tertiary education), **SDG 4.4** (technical skills for employment), **SDG 4.c** (well-supported teachers) and **SDG 9** (industry, innovation and infrastructure).

## 10. Colleges

![Colleges](10-landing-colleges.png)

**Colleges** · “Built for the CIT first”: “The study covers the CIT. Other KCP colleges are planned; each joins once its instructors and records are in.”

The CIT card shows its seal inside blue arcs, a green **Now serving** badge, the two BSIT tracks listed on kcp.edu.ph (*Web and Mobile Application Development* and *Business Analytics and Big Data*) and the CIT lab photograph. Below, four KCP colleges, each with a kcp.edu.ph photograph, its emblem and a dashed **Planned** tag:
* **College of Accountancy and Business Management** (CABM);
* **College of Criminal Justice Education** (CCJE · since 2006);
* **College of Theology** (COT · since 2010 · *Instructi ad Transformandum*);
* **College of Teacher Education and Liberal Arts** (CTELA · *Equipped to Transform*).

Years and mottos come from the emblems.

## 11. Community photographs

![Community photographs](11-landing-community.png)

A paper card: **Our community** · “Made for the people of the CIT”: the instructors and BSIT students EduPulse is built around. Two rows of CIT event photographs from kcp.edu.ph, printed with white borders and set a little askew. As captured (reduced motion), the rows stand still and scroll sideways; the last photograph in each row is cut at the edge. The credit reads **Photos: King's College of the Philippines (kcp.edu.ph)**. With motion, the rows drift, and **Pause photo movement** appears beside the credit (image 27).

## 12. Frequently asked questions

![FAQ](12-landing-faq.png)

A ruled notebook page with a blue edge. On the left, **FAQ** · “Questions people ask”: how EduPulse fits the college's process, and what the AI may and may not do. On the right, eight questions; one answer is open at a time, and its plus sign turns into a minus. The first, **Who can sign in to EduPulse?**, is open in the screenshot: “Anyone with an account the system administrator created: the Dean, the Associate Dean, and the instructors and students of the College of Information Technology. Each account has one role, and that role decides which pages you see.” The others ask whether EduPulse replaces the LMS or the official grading sheet, how the AI stays accurate, whether the AI publishes materials on its own, whether Pulse answers assessments for students, whether the syllabus is approved inside EduPulse, where courses, loads and class lists come from, and about the other KCP colleges.

## 13. Sign-in panel (hosted site)

![Sign-in panel](13-sign-in-panel.png)

One card. On the left, a CIT group photograph with the KCP crest, **Welcome to EduPulse**, “Sign in with the account your system administrator created. Your role decides what you see.” and the five role names. On the right, **Get started** · **Sign in to EduPulse**, “Use your EduPulse account to continue.” and the panel:
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

A green chalkboard footer under an oak rail. On the left, the KCP crest and EduPulse logo, “An AI-powered syllabus and course builder with performance monitoring, made for the College of Information Technology.” and the KCP vision, quoted from kcp.edu.ph, in a plain card labelled *KCP vision*. Then three columns: **Explore** (the eight pages: **Features**, **How It Works**, **Roles**, **Pulse**, **Impact**, **Colleges**, **Play** and **FAQ**), **Legal** (**Privacy** and **Terms**) and **King's College of the Philippines** (Km5 Pico Rd, La Trinidad, 2601 Benguet, and **kcp.edu.ph**, which opens the official site in a new tab). A large faint *EduPulse* wordmark runs across the footer. The bottom line reads *A BSIT capstone project · College of Information Technology · Prototype v4.0* and *Photos and emblems © King's College of the Philippines*.

## 16. Privacy policy

![Privacy policy](16-privacy.png)

`/privacy` opens from the footer. **Back to Home** returns to the home page, and the effective date sits under the title. The numbered sections cover the introduction (operated by King's College of the Philippines – Benguet under the Data Privacy Act of 2012), the information collected, how it is used, retention, your rights and the Data Protection Officer contact. The screenshot shows the top of the page.

## 17. Terms of use

![Terms of use](17-terms.png)

`/terms` opens from the footer and has the same layout: **Back to Home**, the effective date, then numbered sections. These cover acceptance, eligibility (authorised KCP deans, instructors and students only), account responsibilities and acceptable use.

## 18. Server error page

![Server error](18-server-error.png)

`/500` appears when the app cannot complete a request. It shows **500 · Server Error** and a short apology, with **Go to Dashboard** and **Retry**.

## 19-29. The walk through the school

Images 19 to 29 show the home page with motion allowed on a large screen, each room at rest once the walk has arrived. The bar stays on top and the round speed dial button sits at the lower right.

![The hero on the campus lawn](19-walk-campus.png)

**19. Campus.** The hero stands in the sky above the campus lawn, the 3D emblem with blue and white planes floating around it. Below, the KCP building, with a blue entrance, a flag, lamp posts, rounded trees, a hedge and a plank fence closing the left end of the building picture. Small robots walk the path.

![Why EduPulse on the bulletin board](20-walk-bulletin-board.png)

**20. Corridor.** *Why EduPulse* (section 3) is the cork bulletin board on the corridor wall, under a string of lights.

![Features on the blackboard](21-walk-blackboard.png)

**21. Classroom blackboard.** *Features* is written on the blackboard under a row of paper pennants, beside a wall clock. On the walk the board shows one part at a time: the step tabs **01** to **04** (here **01 Records and course loading**), the part's roles, heading and points, and on the right its prototype screen in a browser window labelled *edupulse-prototype.vercel.app*. Scrolling changes the part; the teacher robot's head shows at the bottom.

![How it works on the class seats](22-walk-class-seats.png)

**22. Class seats.** Seen from above, *How it works* is laid out on six desks, one phase card per desk with its number, and a robot student in each seat. The heading runs across the top on a long paper strip.

![Roles with the classmates](23-walk-classmates.png)

**23. Classmates.** Five robot classmates, one per role, stand at their tier behind the five role tabs under the sign *Five roles, one platform*, with windows and pennants behind them. The selected role's panel (here **Instructor**) opens in a blue frame below.

![Pulse at the teacher's end](24-walk-teachers-desk.png)

**24. Teacher's end.** Pulse's section at the front of the classroom: the six principles on the left, the Pulse robot standing in front, a wall clock, the chat card on a dark board on the right and a vase of flowers in the corner.

![The wall clock becoming the scope](24b-walk-clock-letters.png)

**24b. The clock becomes the scope.** Scrolling on from the teacher's end, the camera rests square on the wall clock and the scope is drawn over it: the clock's rim is the scope's thick blue outer ring. The clock's two hands have come apart into letters and small round shapes that are swirling out to the rings. In this frame the outer ring is nearly spelled out (*GUARDIAN · CHECKS APPROPRIATE USE*) while the rings inside it still hold scattered letters in flight. Nothing fades to white; the room behind the scope is still the school's.

![The scope with the Guardian in its window](24c-walk-scope-agent.png)

**24c. The scope names an agent.** The nine rings of chalk capitals turn in opposite directions under the blue rim, with a round window at the centre onto the agent workspace. The window shows the workspace's own 3D robot for the agent being named, here the **Guardian** (white, with a blue chest panel) in front of the studio's floor and furniture. The pinned index card at the lower left reads *01 / 09* · **Guardian** with the keywords *Checks first*, *Appropriate use* and *Stops what breaks rules* above nine marks, the first filled; the section's heading card is at the upper left. Each of the nine agents has its turn.

![The agents line up as the window opens](24d-walk-agents-line-up.png)

**24d. The window opens onto the workspace.** After the ninth agent the window grows until it is the whole screen. In this frame it is nearly there: the studio's honey-oak floor, desks and back wall fill the round opening, the robots stand in a row with their numbered tags (**02 Planner** to **08 Verifier** in view), the workspace's heading (*Tap an agent. It answers.*) is half hidden behind the window's edge and the nine agent buttons run along the bottom. The room behind the scope is the same studio throughout, so the next screen (section 8c) is this room with the agents back at their desks.

![Why it matters in the gallery](25-walk-gallery.png)

**25. Gallery.** The three findings hang in oak frames along the gallery wall, the SDG card on a shelf below them and potted plants at both ends.

![Colleges on the front stage](26-walk-front-stage.png)

**26. Front stage.** Colleges is on the stage, under a gold valance between blue curtains: the heading on a sign, the CIT card in an oak frame and the four college cards hanging on wires.

![Through the hall window onto the yard](26b-walk-yard-window.png)

**26b. The yard.** Leaving the front stage, the camera passes the hall's window (its oak sill and the blue chairs and desks below it) and looks out over the lawn in front of the KCP building, where students are out: two sit on a red checked picnic blanket with a basket and a third stands beside them, two walk the path towards the building and two more sit on a bench at the right eating ice creams. Out of this frame, two others toss a ball and one runs circles round a tree. The students are robots in the school's colours, moving the whole time; the eaters lift their food to their mouths.

![The photographs above the KCP building](27-walk-courtyard.png)

**27. Courtyard.** The community photographs hang like prints on two lines in the sky above the KCP building, among clouds, with the credit and **Pause photo movement** below them.

![The FAQ in an open notebook](28-walk-notebook.png)

**28. Notebook.** The FAQ is an open notebook on a wooden desk, with a pencil, an apple, a mug and a stack of books around it: the heading and a large question mark on the left page, the questions on the right.

![Sign-in on the door of the study](29-walk-door.png)

**29. Door.** The sign-in panel is the door of the study, with an oak frame, hinges and a knob, and a plant on each side. In this capture build the panel also shows **Quick preview access (testing only)** (section 14).

## 30-41. The pages

Each page in the bar is one themed classroom in 3D, seen from a corner, that fills the screen under the bar and never scrolls. A paper card at the top left names the room, gives the page's heading and says what to do; a hint at the bottom reads *Drag to look around · tap anything*; the round compass button at the lower right opens the room's speed dial (image 41); and the bar fills the current page's link in blue. A label floats over each prop that stands for something.

**Tap a thing.** Clicking a label (or the prop under it, or its stop on the speed dial) flies the camera in on that prop and opens its card at the left, under a **Back to the room** button; **Back to the room** or **Escape** flies back out and returns keyboard focus to the label. A card holds a few words and icons: a small kicker, the name, short chips and, for the product's screens, a picture of the screen. What each page once showed further down (rules, timelines, grids, a sample chat) is now another thing in the room with its own label and card, so nothing sits below the room. On a phone the labels become a row of chips under the room and the card rises from the bottom ([mobile walkthrough](../06-mobile/README.md)).

![Features: the science lab](30-page-features.png)

**30. Features: Science lab.** “Five stations, one syllabus.” · *Tap a station, the formula, the rules or the microscope.* Eight labels: **Records** (a filing cabinet), **Syllabus**, **Courseware** (a flask), **Scores** (bars), **Pulse** (a robot at the bench), **The formula** (a periodic table), **Lab rules** (a poster) and **Microscope**, around lab benches, with an orange cat and a grey cat on the floor.

![Features: the Courseware flask zoomed in](30b-page-features-zoom.png)

**30b. Features: zoomed in.** Picking **Courseware** has flown the camera in on the flask, a stack of coloured books beside it; the card at the left reads *Instructor* · **Courseware from the course outline** with the chips *Week by week*, *From your sources* and *Publish when ready*, and a picture of the Courseware page.

![How It Works: the physics room](31-page-how-it-works.png)

**31. How It Works: Physics room.** “Six stations, one run.” · *Follow the marble, then tap a station, the cradle or the board.* Six pedestals labelled **0 · Records**, **1 · Loading**, **2 · Syllabus**, **3 · Courseware**, **4 · Students** and **5 · Monitor**, joined by a rail a marble runs along, with a Newton's cradle on a table (**Newton's cradle**), a board of formulas (**The forces**), a wall clock, two robots and a black cat.

![Roles: the math room](32-page-roles.png)

**32. Roles: Math room.** “Five roles, five shapes.” · *Tap a shape, the board or the abacus.* Each role is a shape on a plinth: **Instructor** a blue cube, **Student** an orange sphere, **Dean** a green pyramid, **Associate Dean** a pink cylinder and **System Admin** a purple ring. **The board** is a chalkboard of formulas (*a² + b² = c²*, *π ≈ 3.14*, *Σn = n(n+1)/2*) and a curve; **The abacus** stands on a desk, with a protractor on the wall, building blocks, a robot and two cats.

![Pulse: the agents studio](33-page-pulse.png)

**33. Pulse: Agent room.** “Nine agents. Ask them anything.” · *Tap an agent to talk to it, or just type.* The agents' studio from the home page fills the left of the screen, each agent labelled with its number (**01 Guardian** to **09 Corrector**), and the chat sits on the right. The chat's **Talk to** row starts with **Everyone** and continues with the nine agents (it scrolls sideways). The first lines read *Everyone. A message goes to the agent whose job it is; the Guardian checks first.* over the nine agents' icons joined by arrows, then the Guardian's greeting with its mood, *Happy*: “Hi! We're the nine agents behind Pulse. Tap one of us to talk to it, or just type; whoever's job it is will answer, and we answer everything else too.” Below are a field (*Say hi, ask about EduPulse, or ask for…*), **Send**, and the note *Scripted replies written on this page: no AI, nothing is sent or stored.* The compass button at the lower right opens a list of the nine agents (**Talk to an agent**) with **Pause room motion**.

![Impact: the history room](34-page-impact.png)

**34. Impact: History room.** “Then, now, and why.” · *Tap an exhibit, the globe or the timeline. Findings from cited studies, not EduPulse results.* Five labels: **7.4 h**, **31%**, **SDGs** (a globe on a rug) and **5.9 h** (a clock), each on a plinth, and **The timeline** on the wall, between two columns, with a robot and a cat.

![Colleges: the gallery](35-page-colleges.png)

**35. Colleges: Gallery.** “Five colleges, CIT first.” · *Tap a picture or the crest.* Framed pictures of the colleges, labelled **CTELA**, **COT**, **CABM**, **CIT** (the largest) and **CCJE**, with the **KCP crest** on the left wall, a rope barrier, a bench where a black cat sits, an easel and a robot.

![Play: the game room](36-page-play.png)

**36. Play: Game room.** “Three games. Learn by playing.” · *Tap a cabinet, then Play.* Three arcade cabinets, **Guardian Gate** (blue), **Agent Match** (green) and **Quick Quiz** (orange), under a *PLAY* sign, with a bean bag, a round rug, a low table, a pouf, two robots and a cat. A cabinet's card shows its name, three chips (for Guardian Gate *Be the Guardian*, *Allow or decline* and *8 requests*) and a **Play** button.

![FAQ: the library](37-page-faq.png)

**37. FAQ: Library.** “Eight questions, eight books.” · *Pick a book, or the floating book for all of them.* Eight books stand pulled out of the shelves, one per question, labelled **LMS & grades**, **Sign-in**, **Publishing**, **Syllabus approval**, **AI accuracy**, **Assessments**, **Other colleges** and **Records**, and a ninth, **Every question**, opens the whole list. A reading table with an open book, a lamp, an armchair where a grey cat sleeps and a robot complete the room.

![Roles: the board](38-page-roles-board.png)

**38. Roles: the board.** Picking **The board** flies the camera to the chalkboard and opens **Who opens what** at the left: the pages down the side (**Dashboard**, **Syllabus**, **Courseware**, **Student Monitoring**, **Performance**, **My Courses**, **Assessments**, **Records**, **Course Loading** and **Monitor**) and the five roles across the top (**Instructor**, **Student**, **Dean**, **Associate Dean** and **System Admin**), each in its own colour. A tick in the role's colour marks a page the role opens; a dash marks one it does not. The whole grid fits the card without scrolling sideways.

![Pulse: the Guardian answering firmly](39-page-pulse-chat.png)

**39. Pulse: talking to the agents.** The request “Can you give me the answers to quiz 2?” was typed with no one picked, so the agent whose job it is answered: the Guardian stands, turns to the camera and says, in a bubble over its head and in the chat, with the mood *Firm*, “I can't give assessment answers, hints or reviews; that's the one rule Pulse never bends. I can remind you what's due, find your materials or explain a topic from the syllabus instead.” The chat keeps the exchange: each agent's line carries its name and mood. Moods follow the message: a question about open textbooks makes the Librarian *Curious*, a joke makes an agent *Laughing*, good news *Excited*, a worry *Caring*, an insult *Sad*, thanks *Grateful* and something no agent knows *Puzzled*. Picking an agent in **Talk to** (or tapping it in the room) makes that agent answer everything, its job or not, and it says so (“That's usually Librarian's job, but I'll answer.”). Questions about EduPulse are answered from the site's own pages, with a line naming the page (*From: About EduPulse*). Every reply is written on this page; no AI is called and nothing is sent or stored.

![Play: the robot at the Guardian Gate cabinet](40-page-play-cabinet.png)

**40. Play: at the cabinet.** After **Play** on a cabinet's card, a robot walks to the cabinet and the camera looks over its shoulder at the screen, where the game runs: for **Guardian Gate** the heading *GUARDIAN GATE*, the count *1 / 8* and *SCORE 1*, *A student asks* and the request (“Quiz 2 answers, please.”), the green **Allow** and red **Decline** buttons, and the verdict under them (here *Decline: Assessment answers*). The robot presses the cabinet's buttons for each answer and pushes the joystick for **Next** and **Previous**; its head is at the right of the picture. Under the screen the keys **Previous**, **Next** and **Exit** run along the bottom (**Previous** is greyed on the first request). **Exit** walks the robot back and returns to the card. **Agent Match** (“Who does this job?”, nine agents, three choices) and **Quick Quiz** (six true-or-false questions) run the same way; each keeps a score and offers **Play again** at the end.

![The speed dial on a page](41-page-dial.png)

**41. Speed dial.** The round button at the lower right, opened on the Play page: **Pause room motion**, then the room's things (**Guardian Gate**, **Agent Match** and **Quick Quiz**), each beside a round icon; the button itself has turned into a close button marked X. Choosing a thing zooms to it and opens its card, as clicking its label does.

![The cat after three quick taps](41b-page-cat.png)

**41b. The cat.** On the Colleges page the black cat sat on the bench. A tap pets it (it purrs and hearts float up), a drag carries it, and three quick taps made it cross: here it has left the bench for the floor beside the robot, with a small red mark over its head, and follows the pointer while the pointer is near.

## 42-44. Night

The sun and moon switch beside **Sign In** turns the site to night; the switch then shows the moon and the bar turns dark.

![The Features page at night](42-night-page-features.png)

**42. A page at night.** The science lab after dark: a starry navy sky behind the walls, stars and the moon in the windows, the title card and the labels as dark chips with light text, and the sun and moon switch showing the moon.

![The campus at night](43-night-walk-campus.png)

**43. The campus at night.** The hero over the campus under a navy night sky, the moon behind the emblem, the medallions dimmed and the lamp posts glowing in front of the KCP building.

![Pulse's wall at night](44-night-walk-teachers-desk.png)

**44. The teacher's end at night.** The classroom in lamplight, with the principles and the chat card as dark cards.

*Changed on 8 November 2026:* the eight pages became interactive rooms that do not scroll: tapping a thing zooms in on it and opens its card, the things that were sections below the room are things in it (images 30 to 41 were recaptured, 30b and 41b added, and the old images 38 to 40 replaced by the board, the chat and the cabinet), the cats can be petted, carried and annoyed, **Play** runs the games on the cabinets with a robot at the keys, and **Pulse** is the agents' studio with a chat. The bar gained **Home** and fills the current link (images 1 to 29, 43 and 44 show it). The wall clock now becomes the agents scope and then the workspace without a fade to white (24b to 24d added, 8b and 8c text updated), students are out on the lawn (26b added), and the left-edge stripes were removed from cards, including the footer's quote.

*Changed on 7 November 2026:* the public site became a school you walk through. Images 1 to 15 were recaptured in the classroom style; images 19 to 44 were added (the walk, the eight pages, the speed dial and night); images 16 to 18 are unchanged. The bar now opens pages instead of jumping to sections, the round speed dial replaces the **Back to top** button, Pulse's chat is in keywords and icons, and the agents' rings are a round chalkboard with pinned index cards.

*Changed on 6 November 2026:* the agent workspace is the 3D studio alone on the screen, without the **Try a request** panel, its three requests and the conversation; each agent answers in a bubble in the room. Section cards now ease in from a side instead of being built from 3D pieces. Image 8c was recaptured.

*Changed on 2 November 2026:* *How it works*, Roles and *Why it matters* show their content as pictures rather than lines of text (phase cards with a hand-over from the AI to people, role avatars with task tiles and a miniature top bar, finding tiles with icons and a meter). Images 5, 6, 7 and 9 were recaptured.

*Changed on 30 October 2026:* the landing page was redesigned with a once-per-tab opening, a 3D ring and geometric section motion. Images 1 to 15 were recaptured and images 16 to 18 are unchanged. The agents section and its image (8b) were added on the same day.

Official-list student accounts use the existing email/password sign-in panel. The administrator distributes credentials privately. After sign-in, the imported student identity fields appear in [Settings Account](../../system-manual/16-student-directory/README.md#4-student-profile). Directory membership alone does not grant access to course materials.
