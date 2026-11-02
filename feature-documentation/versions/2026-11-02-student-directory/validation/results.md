# Student directory validation

The official list contained **2,286 unique student numbers**, 23 program titles and four year levels. All 2,286 student accounts and matching profiles are now present in the existing EduPulse Supabase project. The final usernames are lowercase student numbers followed by `@gmail.com`. Existing imported accounts retained their passwords during the username update. The owner explicitly approved a first-name password fallback for the one row with neither surname nor middle name; its official surname remains blank.

## Hosted account and access checks

- All 2,286 stored profiles match the imported identity/grouping fields checked by the verification script, with zero mismatches. Database checks found zero incorrect roles, mismatched login emails or unconfirmed new accounts. The one pre-existing student account remains, giving 2,287 student Auth accounts in total.
- Six representative accounts signed in successfully with their assigned initial passwords, including the shortest password and the approved fallback. Every signed-in student could read only its own directory profile; anonymous reads were denied. [Aggregate profile receipt](live-profile-checks.json).
- The current application API handler, using a real signed student token and hosted Supabase, returned 200 with only that student's profile. The same route rejected a guest with 403. This checks the candidate handler and hosted database, not a deployed Vercel endpoint. [Aggregate API receipt](live-api-checks.json).
- Existing enrollments remain at zero. Account creation does not assign courses; instructors select their rosters. Initial provisioning created 1,458 accounts; the final pass updated their usernames and added 828 accounts. The complete private credentials CSV contains 2,286 distinct usernames and stays in Downloads, outside Git.
- Migrations `20261102074226_student_directory` and `20261102081005_student_name_fallback` were applied through the existing linked CLI; the connected Supabase app does not expose this project. The security advisor reported no ERROR. Existing SECURITY DEFINER warnings and the leaked-password-protection warning remain. Temporary service-key material was removed after verification. No invitations were sent and no existing password was reset.

## Local implementation checks

Import and SQL/RLS tests pass: source IDs are retained, duplicate usernames are prevented, and an absent surname requires an explicit password-name fallback. Staff may read the official directory; students read only their own profile; anonymous reads and direct authenticated writes are denied. A directory profile alone grants no course access. After instructor enrollment and reviewed publication, the selected student sees released material while an unselected registered student cannot.

The targeted desktop/mobile browser flow passed: search, year/department/program filters, selection retained across pages, a failed save retaining the selection, a successful confirmed save and roster reload. These checks use synthetic session/transport fixtures. The four task captures and updated My Courses screenshot also use synthetic or preview data; all changed images were opened and reviewed. Capture reports identify synthetic transport explicitly.

The release is validated in an isolated checkout based on `57ccd66`, preserving unrelated editor changes in the main workspace. `npm run verify` passed with 187 tests, lint, both TypeScript projects, documentation checks, pinned model-file verification, production build and deployment packaging checks. The final component error-feedback adjustment is included in the full browser run, final capture and final release gate. Existing lint and bundle-size warnings remain.

## Browser and final captures

The full 214-case run completed with 193 passed, 19 suite-defined skips and two failures. Both failures were the public landing WebGL fallback console check, caused by the isolated run's placeholder Supabase key returning 401 from Auth settings. With the existing valid public project key and unchanged assertions, both desktop and mobile fallback tests passed. Across the full run and corrected-key rerun, 195 cases passed; no product failure remains. The new directory flow passed in both projects, including the mobile document-width assertion. [Full run](browser-full.txt), [corrected-key rerun](browser-key-rerun.txt).

The final capture build and all nine selected snapshot tests passed. Run `2026-11-02T08-57-52-981Z-c03734ff` refreshed four synthetic directory/profile captures and the preview My Courses scene, while the complete walkthrough suite preserved its manifest. All final changed hashes have agent visual-review attestations; identical hashes retained their earlier review. No real student records or passwords appear in these captures. [Capture log](captures.txt).

## Final release gate

`npm run verify` passed again on the final candidate: 187 tests passed, zero failures; documentation integrity/freshness, lint, both TypeScript projects, pinned model-file verification, production build and deployment packaging checks passed. Existing lint, experimental-runtime and bundle-size warnings remain. [Final gate log](verify.txt).

Production publication follows the release commit. The deployed API and real browser sign-in will be checked before the release is marked live.
