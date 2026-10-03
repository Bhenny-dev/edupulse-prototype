# 01 · Public site

What a visitor sees before signing in. Route: `/` (the landing page scrolls through all sections).

## 1. Landing page: hero

![Landing hero](01-landing-hero.png)

- **Top bar:** EduPulse logo, **About** and **Why It Matters** (jump to their sections) and **Sign In** (jumps to the sign-in panel).
- **Hero:** the institution badge (*King's College of the Philippines — Benguet*), the headline “One shared home for syllabi, courseware & scores” and a one-paragraph summary.
- **Get Started** scrolls to sign-in; **See how it helps** scrolls to the role benefits.

## 2. Landing page: what EduPulse does for each role

![Role benefits](02-landing-about.png)

Three cards summarise the benefit for **Instructors** (outline → syllabus → class materials), **Students** (one place for readings, activities, assessments and their own scores) and **the Dean's Office** (which courses are loaded, which syllabi are ready, where delivery is slow).

## 3. Landing page: why it matters

![Prototype targets](03-landing-statistics.png)

The prototype's design targets, labelled as targets rather than measured results: 46% less preparation time, 2 roles on one platform, 61% of materials centralised, 15/7 access.

## 4. Sign-in panel

![Sign-in panel](04-sign-in-panel.png)

- **Email** and **Password** sign in a provisioned account (Supabase Auth on the hosted site).
- **Quick preview access (testing only):** **Dean**, **Assoc. Dean**, **Instructor** and **Student** open the system as that role with sample data and no account. These buttons are how the rest of this walkthrough was captured.
