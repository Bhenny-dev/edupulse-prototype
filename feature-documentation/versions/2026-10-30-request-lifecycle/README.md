# Bounded API request intake

The shared Node adapter now limits how long an incomplete request can occupy the API before authentication and model work begin. A stalled body receives a structured `408 REQUEST_TIMEOUT` after 30 seconds. Existing per-action byte limits still return `413 BODY_TOO_LARGE`; declared oversize and streamed oversize are checked before dispatch. Parsed Vercel bodies and split UTF-8 bytes keep their original values.

Node and Fetch handlers use the same action/method table. An unsupported method such as `TRACE` receives `405` with `Allow`, rather than falling through to a generic server failure when the native Fetch request constructor rejects it. Unknown action names, including inherited object-property names, receive `404`.

Client disconnects cancel the request signal passed to downstream work. Intake listeners are released on completion, failure and cancellation; the adapter avoids writing to a closed response. Unexpected transport or handler failures return safe structured JSON with a request ID and no-store headers, without exposing exception text.

This change uses existing Node APIs. There are no new dependencies, migrations, role changes, model changes or frontend edits. It preserves existing approval, save and source boundaries. The intake deadline does not extend the hosted function's duration limit or change the model-generation budget.

See [validation](validation/results.md). The normal interface is unchanged, so existing workflow screenshots remain applicable. Invalid raw HTTP requests and a client that stops uploading have no new screen to capture. The [Backend System guide](../../backend-system/README.md) describes the intake limits. Released as part of the [30 October combined release](../2026-10-30-integrated-release/README.md).
