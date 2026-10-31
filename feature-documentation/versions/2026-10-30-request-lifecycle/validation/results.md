# Request lifecycle validation

Initial focused verification: four tests passed against the proposed backend changes in an isolated checkout. On 31 October the change was integrated into the [combined release](../../2026-10-30-integrated-release/validation/results.md); there `npm run verify` passed with all 176 unit and integration tests, including these four, and the deployment checks exercised the actual application handler and packaging. After the production deployment of `ebe4834`, the hosted API returned 404 for unknown and inherited action names, 405 with `Allow` for a wrong method, and 413 with a request ID for a body over the limit, before authentication. A stalled upload was not reproduced against the hosted site.

- Real loopback HTTP requests verify unsupported methods and `Allow`, unknown/prototype action names, declared and chunked oversize bodies, exact UTF-8 delivery and safe unexpected-failure responses. Existing oversize responses already worked before this change; this pass retains that behavior.
- Parsed Buffer, Uint8Array, string and object bodies retain their bytes. Split UTF-8 input is reassembled without corruption. Completion, cancellation and premature disconnect release intake listeners.
- Closing a real client socket aborts the signal received by downstream work.
- A real incomplete upload waits through the 30-second intake deadline, receives `408 REQUEST_TIMEOUT` with a request ID and no-store headers, and never invokes the handler.

These checks use synthetic requests and an in-process dispatch stub for transport isolation. They do not establish hosted ingress behavior or authenticated Supabase access. The broader release gate also exercises the actual application handler and deployment packaging checks.

Implementation references: [Node HTTP](https://nodejs.org/api/http.html) and [Node streams](https://nodejs.org/api/stream.html).
