# EduPulse System Prototype

- **What:** KCP CIT BSIT capstone. AI-assisted syllabus, courseware and performance system for the College of Information Technology, King's College of the Philippines.
- **Stack:** React 19 + Vite front end (`edupulse-app/src`), Node API (`edupulse-app/server`), Vercel functions (`edupulse-app/api`), Supabase (auth, accounts per role), GSAP 3.15 and three.js 0.186 on the landing page, Playwright for browser tests and documentation captures.
- **Users:** five roles, one per account: System Admin, Dean, Associate Dean, Instructor, Student. EduSuite stays the system of record; AI output stays a draft until people approve it; Pulse never answers assessments; scores, not official grades.
- **Data:** Supabase in production; local JSON data under `edupulse-app/.data` for development and tests.
- **Constraints:** documentation and screenshots change in the same commit as any visible change (see `CLAUDE.md` at the repository root and `feature-documentation/DOCUMENTATION-POLICY.md`); release gate is `npm run verify` plus `npm run test:browser`; a push to `main` deploys to Vercel.
- **Machine notes:** low free memory, so run browser tests with one worker; a dev server from another session can linger on a port (check `Get-NetTCPConnection` before trusting it); in Playwright, a `#/` navigation on the same URL does not reload the page, use `page.reload()`.

# AI strategy
Use Haiku for simple tasks; Sonnet for main dev; Opus for complex architecture or if Sonnet fails twice.
Keep context low: Grep before Read, targeted reads only.

# Rules
Concise responses. No overengineering. No unrequested extras.
