# Landing page redesign and interface motion

The public landing page was rebuilt around the College of Information Technology (CIT) of King's College of the Philippines (KCP). It is informational about the system as specified in `edupulse-app/docs/FLOW_SPEC.md` and `SYSTEM_SPEC.md`, and every section describes behaviour that exists. The illustrations (hero cards, Pulse chat) are labelled as illustrations with sample data.

## Features

- **Navigation:** a transparent bar over the hero that turns frosted on scroll, with a gold underline on the section in view, a reading-progress bar, a ☰ menu on phones and a **Back to top** button.
- **Hero:** the CIT photograph from kcp.edu.ph with slow drift (parallax), a pointer-following light, the KCP crest and CIT seal, and a floating sample-data illustration of the syllabus stations, courseware drafts, class progress and Pulse.
- **New sections:** an institution ribbon, about (with photo collage), seven features, the six phases of the business flow with AI and People roles, a five-role explorer (accessible tabs), Pulse and its six boundaries, colleges, CIT community photos with a pause control, prototype targets, seven FAQs, a sign-in welcome panel and a footer with the KCP vision, address and official site.
- **Colleges:** `edupulse-app/src/data/colleges.js` lists the CIT as `active` and CABM, CCJE, COT and CTELA as `onboarding` (shown as **Ready to onboard**). A college moves to `active` when its instructors are registered and its records are imported. Oversight remains scoped to the CIT (FR-REV-08); no account, role or data model changed.
- **Interface motion:** routed pages fade and rise in when the top-bar section changes (state is kept within a section). Swapped page-tab views fade in. Dialogs settle in over a fading, blurring backdrop and rise like a sheet on phones. Top-bar dropdowns open from their button. All of it is switched off with *reduce motion* (NFR-ACC-04). Settled screens are unchanged.

## Assets

- Emblems (KCP crest and the CIT, CABM, CCJE, COT and CTELA seals) were supplied by the project owner. Their backgrounds were removed and they were saved as 384 px WebP files.
- Photographs were downloaded from kcp.edu.ph on 28 October 2026: the CIT page's BSIT event photographs and lab image, and each college's card image on the home page. They were resized to WebP (about 0.9 MB for all 23 files) and are served from the app under `src/assets/kcp/`. The page credits KCP.
- Images below the hero load lazily. No new runtime dependency was added, and the Content-Security-Policy is unchanged.

## Documentation

[System Walkthrough 01](../../system-walkthrough/01-public-site/README.md) was rewritten: 18 images in page order, replacing the previous 8. [06 · Mobile](../../system-walkthrough/06-mobile/README.md) has a new hero image and a new open-menu image. [02 · Shared interface](../../system-walkthrough/02-shared-interface/README.md) describes the transitions. [System Manual 1](../../system-manual/01-getting-started/README.md) points to the renumbered sign-in images.

[Validation](validation/results.md) · Status: live from `952107c`; Vercel build and production smoke checks passed; GitHub Actions blocked by the account billing lock.
