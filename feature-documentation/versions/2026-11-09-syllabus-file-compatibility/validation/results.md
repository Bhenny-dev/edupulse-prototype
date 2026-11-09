# Validation

## Owner-file preflight

All 14 PDFs in the owner-supplied Syllabi directory were read with the production parser, retained byte-for-byte with SHA-256, and passed through the same candidate builder used by the upload interface. Each candidate passed the production workspace schema locally. Single-syllabus envelopes ranged from about 524 KB to 806 KB, within the unchanged 3 MB workspace limit. No hosted account, workspace, enrollment, publication or assessment was written by this preflight.

The source course codes and offered years remain as printed, including `IT 201 - AD` and the 2025–2026 offered year where present. The explicit CP 2 and WMAD 306 title cells take precedence over conflicting footer/header wording. The ruled metadata reader also preserves written-number values such as Three (3) Units and Ninety (90) Hours. All 14 supplied copies have three credit units; eleven show 90 hours and three show 54 hours. Blank source descriptions remain blank, without credit/hour/prerequisite text leaking into them. Named signatories and the owner's approval attestation are not represented as electronic signature verification.

Thirteen files expose weeks 1–18; IT 103 exposes 17 explicit weeks and has an unnumbered **Hypothesis Testing for One/Two Samples** row on page 5. WMAD 303 also has an unnumbered **Lesson 3: Operators and User Interaction** row on page 4. These two source gaps remain warnings; no week is inferred. Original pages were rendered and inspected to distinguish true gaps from page-break fragments. The full private review assets remain outside the repository; the original PDFs are not published as test fixtures.

## Automated and visual checks

- Nine focused native cases passed, covering actual generated PDF bytes, scaled/segmented paths, wrapped identity and metadata cells, printed ranges, forward and backward page continuations, examination boundaries, unnumbered rows, matching checksums and client/server size limits.
- The final approved-copy and PDF browser suites passed 17 cases with one declared mobile OCR skip. This includes explicit selection, save rejection/retry, retained original downloads, malformed/missing fields, unauthorized student controls, 650 KB scaled PDF review, missing-week warnings, desktop OCR and unfamiliar course identity on desktop/mobile.
- Ten capture cases passed across desktop, mobile, dark mobile, the instructor page and the optional draft approval workflow. Fourteen changed/new images were opened and reviewed. The capture evidence shares one unchanged source digest. Sample PDFs exercise the real parser; controlled account transports do not establish hosted persistence.
- The manual capture helper now dismisses the current first toast rather than stale indexed locators. The entire native lifecycle workflow passed with bounded capture timeouts.
- The full `npm run verify` gate passed: documentation, lint, both type checks, pinned model checks, 266 native cases, production build and serverless deployment contract. The initial full run exposed an old test expecting an explicit unfamiliar course code to be discarded; that assertion now verifies source retention, no invented title and no invented catalog match. Its focused rerun and the complete gate both passed.
- Production deployment `dpl_27ydA7ydDrgTbENdiw9EkH6Zh6n7` reached **Ready** for `b0ca8043da293ec82fa1a3ff6e27347331162ed4` on 10 November (Asia/Manila).

## Hosted persistence verification

At `https://edupulse-prototype.vercel.app`, an isolated temporary instructor signed in and saved an actual generated 650 KB scaled PDF through the production workspace API. Readback preserved every original byte, its SHA-256, all four printed weeks and the saved revision. A subsequent 750,001-byte declaration was rejected with HTTP 400, and readback confirmed the revision remained unchanged. The academic projection contained the approved course and no publications. This check used the modern project secret only for temporary-account administration/cleanup and the instructor's own session for workspace operations.

The temporary session was signed out globally, its synthetic academic events removed and its Auth account deleted; a final Auth lookup returned 404. No registered student's enrollment, access history, attempt or grade was changed. This proves hosted import persistence and rejection behavior, not real instructor seeding, signature verification, live model inference or learner completion. The private receipt is retained outside Git.

## Scope remaining

## Existing WMAD 304 record repair, 10 November

The owner's reported saved WMAD 304 contained the older five-week extraction and the title **Network Management &**. Its retained original matched both the supplied Syllabi PDF and Downloads PDF byte-for-byte. Re-reading those bytes with the released parser produced **Network Management & Application Areas**, all 18 printed weeks and no extraction warnings. An owner-authorized compare-and-save updated that same syllabus ID from workspace revision 1 to 2, retaining the approved original/checksum, existing source links and editable history. The affected workspace had no saved generated items, publications, attempts or material opens; readback confirmed the complete title/outline and unchanged learner activity. This was a specific data repair, not an automatic rewrite of other instructors' work.

## Scope remaining after the repair

This compatibility change prepares approved files for import. It is not evidence of instructor seeding, shared publication, block-specific delivery, real AI inference, learner submissions or live statistics. Those tasks require separate persisted execution and authorization checks. Existing actual student activity must remain unchanged during seeding.
