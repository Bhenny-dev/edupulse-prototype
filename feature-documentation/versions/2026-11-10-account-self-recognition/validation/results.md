# Validation

- Two native HTTP regression cases passed. They cover five English/Filipino phrases, username and trusted-role recognition, forged prior-history text, editable role hints, signed-out behavior, fresh support-subject resolution and distinguishing actor/subject email. Unexpected directory, library, provider or web requests fail the test.
- Eight browser cases passed across desktop/mobile, including self recognition, earlier typo lookup, sourced public images, unavailable images and English/Filipino person follow-ups. The browser account and API transports are synthetic; the reply builder and actual chat rendering run unchanged.
- Two targeted captures passed with unchanged source, and both new images were opened and reviewed.
- The full release gate passed: documentation, lint, type checks, all 271 native tests, production build and deployment checks. Hosted validation is pending deployment of this increment.
