# 01 · Public site

These are the pages a visitor sees before signing in:
* `/`: the landing page, which scrolls through all its sections;
* `/privacy` and `/terms`: the legal pages;
* `/500`: the server error page.

The landing page focuses on the College of Information Technology (CIT) of King's College of the Philippines (KCP). The KCP crest and the five college emblems were supplied by the project owner. The photographs come from [kcp.edu.ph](https://kcp.edu.ph/): the CIT page and each college's card image on the KCP home page. They were downloaded on 28 October 2026 and are served from the app itself, so the page does not depend on the KCP site being available. The page credits them as **Photos: King's College of the Philippines (kcp.edu.ph)** and **Photos and emblems © King's College of the Philippines**. The product screens in the Features section are the EduPulse prototype with sample data.

**What the screenshots show.** The landing images were captured with *reduce motion* turned on, so every section is complete and still. With motion allowed, the page also moves; none of this appears in the images:
* On the first visit of a browser session, a navy curtain shows the KCP crest and the EduPulse name for about a second, then lifts.
* Headings rise line by line, paragraphs and cards rise a short distance as they come into view, and the large statement in *Why EduPulse* brightens word by word as you read it.
* On a desktop, scrolling the hero opens the arch-shaped photograph to the full screen and ends on the statement “Every lesson begins with the *syllabus*.”
* On a desktop, the Features section holds its place while its four parts change one at a time beside a framed prototype screen.
* In *How it works*, a gold line draws down the timeline and each phase number lights up when the line reaches it. The page keeps scrolling normally.
* The numbers in *Why it matters* count up once.
* The community photographs drift slowly in two rows, in opposite directions. Hovering over them, focusing them with the keyboard or tapping them stops the movement; a second tap starts it again. They also stop while they are off screen or the browser tab is hidden.

On a phone the sections stack, and the hero and Features section do not move with scrolling. **Skip to main content**, the first stop when you press Tab, moves focus past the navigation and the hero to *Why EduPulse*.

## 1. Landing page: hero

![Landing hero](01-landing-hero.png)

- **Top bar:** the KCP crest and the EduPulse logo, then **Why EduPulse**, **Features**, **How It Works**, **Roles**, **Impact**, **Colleges** and **FAQ**, which jump to their sections, and **Sign In**, which jumps to the sign-in panel. Over the navy hero the bar is transparent.
- **Institution line:** the KCP crest and the CIT seal with *King's College of the Philippines · College of Information Technology*.
- **Headline:** “One shared home for *syllabi*, *courseware* & *scores*”, with the three nouns in gold italics, then: “EduPulse turns the official KCP syllabus into the learning materials, assessments and progress views that follow from it. The AI drafts; the instructor reviews and decides.”
- **Get started** scrolls to sign-in; **See how it works** scrolls to the six phases (section 5).
- Three notes: **Syllabus-centred**, **Grounded in approved documents** and **Instructor-approved**.
- **Photograph** (right): the CIT photograph from kcp.edu.ph, a student at a multi-monitor coding desk, in an arch-shaped frame.
- **Scroll** at the lower left jumps to the next section; the caption *College of Information Technology · La Trinidad, Benguet* sits under the photograph.

## 2. Landing navigation after scrolling

![Landing navigation](02-landing-navigation.png)

Once the page scrolls, the bar turns paper-toned and **Sign In** becomes a dark button. The link for the section in view is underlined (here **Features**), and a thin gold line along the bottom edge shows how far down the page you are. After the first screen, a round **Back to top** button also appears at the lower right (it is left out of the section crops below).

## 3. Why EduPulse

![Why EduPulse](03-landing-why-edupulse.png)

A large statement: “At the CIT, every lesson is meant to follow the approved syllabus. In practice, syllabi are recycled, materials are rushed or pasted from AI chat tools, delivery is split between Moodle and paper, and the Dean's office cannot see what reaches the class.”

Below it, a table compares **Today** (struck through) with **With EduPulse** in five areas:
* **Syllabus:** edited from earlier versions, or recycled → built in the official seven-section KCP format, or uploaded and checked.
* **Materials:** rushed, often pasted from AI chat tools and polished by hand → generated from the approved course outline and grounded in the syllabus and your files.
* **Delivery:** split between Moodle and paper handouts → published to each block from one place; paper copies remain possible.
* **Oversight:** after course loading, the Dean's office cannot see what is delivered → syllabus status and delivery for every loaded course, at a glance.
* **Performance:** checked by hand, on paper or in the grading sheet → scores collated by syllabus topic for students and instructors.

A note with a shield icon closes the section: EduPulse assists but never replaces the instructor's judgment; every material and assessment is reviewed and approved before it is used in class.

## 4. Features

![Features](04-landing-features.png)

“From the syllabus to every class”: four parts of one workflow, each starting from the approved KCP syllabus and shown beside a prototype screen:
* **01 · Dean · Associate Dean: Records and course loading** (the **Records** page). EduSuite stays the system of record; its exports are uploaded, checked and confirmed, and courses are loaded to instructors by the college's rule, master's degree first, then specialization. *Nothing is saved until the Dean's office confirms. Pulse can suggest instructors; people decide.*
* **02 · Instructor: The Syllabus Builder** (the **Syllabus Builder** tab). Build the seven-section syllabus, upload one, or let Pulse co-write it section by section; AI drafts stay Drafted until checked. *Signed outside EduPulse: Dean review, CAO approval, EVP noting. The approved Section 5 course outline becomes the map for everything else.*
* **03 · Instructor: Courseware from the course outline** (the **My Courseware** list). Each outline week becomes learning materials and assessments, retrieved from the approved syllabus and your own files first. *Generate by week, by term or for the whole outline. Review, edit and publish; only published items reach students.*
* **04 · Students · Instructors · Dean: Performance by syllabus topic** (the **My Performance** page). Students see which topics they have mastered, instructors see completed and missed work and unopened materials, and the Dean's office follows delivery. *Reminders for unopened materials and missing activities. Scores are visualized; official grades stay outside EduPulse.*

## 5. How it works

![How it works](05-landing-how-it-works.png)

A navy section. On the left, “Six phases. People decide each one.” and “From the EduSuite files to student results. The AI assists inside every phase and never finalizes one.” On the right, a timeline: gold numbers **00** to **05** joined by a gold line. Each phase names who does it and what happens, then **AI** (what Pulse may do) and **People** (who decides):
* **Phase 0 · Dean · Associate Dean: Records intake.** Upload the EduSuite exports (course records, course loads and block rosters). The AI reads the files and shows what it understood; the Dean or Associate Dean confirms before anything is saved.
* **Phase 1 · Dean · Associate Dean: Course loading.** Each released course is loaded to an instructor. The AI suggests or proposes instructors (master's degree first, then specialization); every assignment is confirmed before it takes effect.
* **Phase 2 · Instructor: Syllabus building.** The AI co-writes section by section or drafts the whole syllabus as Drafted. It is checked, then signed outside EduPulse (Dean review, CAO approval, EVP noting); the approved file is uploaded and its course outline extracted.
* **Phase 3 · Instructor: Courseware generation.** The AI drafts by week, by term or for the whole outline, grounded in the approved syllabus; the instructor reviews, edits and publishes, and only published items reach students.
* **Phase 4 · Students: Student access.** The AI guides only: reminders, missed activities and finding the way. Pulse never answers, reviews or hints at assessment items.
* **Phase 5 · Everyone: Monitoring.** A scoring sheet for instructors, delivery progress for the Dean's office and notices for students. The AI summarizes what the charts show; no grades are computed, and the KCP grading sheet stays official.

On a desktop the heading stays beside the timeline while it scrolls past. The screenshot shows the timeline finished.

## 6–7. Roles

![Roles: Instructor](06-landing-roles.png)

![Roles: Student](07-landing-roles-student.png)

“Five roles, one platform”: “Each account has one role, and the top bar shows only that role's sections.” The numbered tabs on the left (**Instructor**, **Student**, **Dean**, **Associate Dean** and **System Admin**) switch the panel on the right; the selected tab is dark and indented, with its number in gold. The arrow keys, **Home** and **End** move between tabs. Each panel has a short heading, a summary, four tasks, the role's **Top bar** sections and one benefit:
* **Instructor** (image 6), *Prepare and deliver*: “Teach from one organized place”. Top bar: **Dashboard**, **Syllabus**, **Courseware**, **Student Monitoring** and **Performance**. The benefit names SDG 4.c, well-supported teachers.
* **Student** (image 7), *Learn*: “Everything for your courses, in one place”, with **My Materials**, **My Assessments**, **Performance** and reminders. A gold-ruled line reads “Pulse will not answer or hint at assessment items.” Top bar: **Dashboard**, **My Courses**, **Assessments** and **Performance**. The benefit names SDG 4.3 and 4.4.

The Dean, Associate Dean and System Admin tabs use the same layout (not shown).

## 8. Pulse, the AI assistant

![Pulse](08-landing-pulse.png)

A navy band: “Grounded in your documents. Decided by you.” Pulse lives on every page; it retrieves from the approved syllabus and your files, drafts when you ask, and stops at the boundaries the college set. Six numbered principles follow: **Grounded first**, **Sources you can check**, **Nothing publishes itself**, **Guide, never answer**, **Asks before acting** and **Scores, not grades**.

On the right, an illustrated chat in the student view: the student asks “Give me the answers to quiz 2.”, and Pulse declines and points to an unopened Week 4 reading on conditional statements. The tag reads **Declined · appropriate-use rule**, and the caption labels it *Illustration*.

## 9. Why it matters

![Why it matters](09-landing-why-it-matters.png)

“Preparation takes time. The research agrees.” Three findings cited in the EduPulse study, labelled as describing the problem EduPulse addresses, not measured EduPulse results:
* **7.4 h** a week spent preparing lessons, on average, by teachers across OECD countries (OECD, *Results from TALIS 2024*, 2025);
* **31%** less lesson-planning time for teachers using generative AI, with no measurable drop in lesson quality (Education Endowment Foundation, 2024);
* **5.9 h** of work recovered each week by educators who use AI tools regularly (Gallup & Walton Family Foundation, 2025).

Below them, the Sustainable Development Goals the study supports: **SDG 4.3** (equitable access to quality tertiary education), **SDG 4.4** (technical skills for employment), **SDG 4.c** (well-supported teachers) and **SDG 9** (industry, innovation and infrastructure).

## 10. Colleges

![Colleges](10-landing-colleges.png)

“Built for the CIT first”: the study is scoped to the College of Information Technology, and adoption by the other KCP colleges is planned future work. A college joins when its instructors are registered and its records are imported. Oversight stays scoped to the CIT (FR-REV-08).

The CIT is shown with the CIT lab photograph in an arch, its seal, **Now serving** and the two BSIT tracks listed on kcp.edu.ph: *Web and Mobile Application Development* and *Business Analytics and Big Data*. Below, four KCP colleges, each with a kcp.edu.ph photograph, its emblem and **Planned**:
* **College of Accountancy and Business Management** (CABM);
* **College of Criminal Justice Education** (CCJE · since 2006);
* **College of Theology** (COT · since 2010 · *Instructi ad Transformandum*);
* **College of Teacher Education and Liberal Arts** (CTELA · *Equipped to Transform*).

Years and mottos come from the emblems.

## 11. Community photographs

![Community photographs](11-landing-community.png)

“Made for the people of the CIT”: the instructors and BSIT students EduPulse is built around. Two rows of CIT event photographs from kcp.edu.ph. As captured (reduced motion), the rows stand still and scroll sideways; the last photograph in each row is cut at the edge. The credit reads **Photos: King's College of the Philippines (kcp.edu.ph)**. With motion, the rows drift and pause as described at the top of this page; there is no pause button.

## 12. Frequently asked questions

![FAQ](12-landing-faq.png)

“Questions people ask”: how EduPulse fits the college's process, and what the AI may and may not do. Eight questions; one answer is open at a time, and its plus sign turns into a cross. The first, **Who can sign in to EduPulse?**, is open in the screenshot. The others ask whether EduPulse replaces the LMS or the official grading sheet, how the AI stays accurate, whether the AI publishes materials on its own, whether Pulse answers assessments for students, whether the syllabus is approved inside EduPulse, where courses, loads and class lists come from, and about the other KCP colleges.

## 13. Sign-in panel (hosted site)

![Sign-in panel](13-sign-in-panel.png)

On the left, a CIT group photograph in an arch with the CIT seal, **Welcome to EduPulse**, “Sign in with the account your system administrator created. Your role decides what you see.” and the five role names. On the right, **Get started · Sign in to EduPulse**, “Use your EduPulse account to continue.” and the panel:
- **Email** and **Password**, then the dark **Sign In** button, for an account the administrator has created. The hint below reads “Use the email and password assigned to your EduPulse account.”
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

A navy footer. On the left, the KCP crest and EduPulse logo, “An AI-powered syllabus and course builder with performance monitoring, made for the College of Information Technology.” and the KCP vision, quoted from kcp.edu.ph. Then three columns: **Explore** (the seven section links), **Legal** (**Privacy** and **Terms**) and **King's College of the Philippines** (Km5 Pico Rd, La Trinidad, 2601 Benguet, and **kcp.edu.ph**, which opens the official site in a new tab). A large outlined *EduPulse* wordmark runs across the footer. The bottom line reads *A BSIT capstone project · College of Information Technology · Prototype v4.0* and *Photos and emblems © King's College of the Philippines*.

## 16. Privacy policy

![Privacy policy](16-privacy.png)

`/privacy` opens from the landing page footer. **Back to Home** returns to the landing page, and the effective date sits under the title. The numbered sections cover the introduction (operated by King's College of the Philippines – Benguet under the Data Privacy Act of 2012), the information collected, how it is used, retention, your rights and the Data Protection Officer contact. The screenshot shows the top of the page.

## 17. Terms of use

![Terms of use](17-terms.png)

`/terms` opens from the landing page footer and has the same layout: **Back to Home**, the effective date, then numbered sections. These cover acceptance, eligibility (authorised KCP deans, instructors and students only), account responsibilities and acceptable use.

## 18. Server error page

![Server error](18-server-error.png)

`/500` appears when the app cannot complete a request. It shows **500 · Server Error** and a short apology, with **Go to Dashboard** and **Retry**.

*Changed on 29 October 2026:* the landing page has an editorial design (paper and KCP navy, a serif display face, arch-shaped photographs). It gained the *Why EduPulse* comparison, the four-part Features section with prototype screens, the six-phase timeline, cited research findings in place of the prototype targets, and the skip link. Gold text, grey text, the sign-in buttons and the focus outline were darkened or recoloured to reach WCAG contrast in light and dark mode. Images 3, 9, 10 and 11 were replaced (*about* and *statistics* were removed; *colleges* and *community* moved one place down), and the landing images are now captured with reduced motion.
