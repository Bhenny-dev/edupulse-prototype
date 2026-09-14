# Deployment tests must execute

The app's `.vercelignore` excluded `tests/`. After enabling `npm run verify` as the build command, Node accepted the unmatched test glob and reported zero tests. The deployment completed but did not run the intended test suite.

The build context now includes test sources. `scripts/test.mjs` enumerates test files and fails if the directory is missing or empty, then runs them with Node/tsx. This prevents a missing suite from producing a misleading pass. Test sources are not part of the static site; private databases, environment files, and browser artifacts remain excluded.

Lint explicitly targets the application's source, API, scripts, tests and build configuration. CLI preview builds do not always retain Git ignore behavior, which previously allowed lint to scan third-party dependencies. Explicit targets keep the same checks focused on maintained code in both Git and CLI deployments.

Deployment review must check the test count in build logs, not only the Ready status. Expected release suite: 16 tests, including actual SQL/RLS validation. Desktop and mobile browser tests run separately because installing Chromium during every serverless build is unnecessary; six browser workflow checks remain in GitHub Actions and the local verification procedure.
