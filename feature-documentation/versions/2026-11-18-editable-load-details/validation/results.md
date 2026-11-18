# Validation

Frontend/server type checks passed. Four native teaching-load tests passed. Two controlled browser scenarios (desktop and phone) verified corrected import payloads, recalculation, numeric rejection and renewed confirmation. Three capture scenarios passed; five images were opened and agent-reviewed. The controlled transport checks do not prove hosted writes or alter production records.

The first native dev-server attempt and first capture build ran out of host memory. Serial captures succeeded with one build worker and bounded Node heap; the browser checks used a UI-only Vite server with explicit fixture transports. No credentials, API schema, database migration or production data were changed by this task.

Parser regression: five native tests passed, including a missing Time heading, ambiguous missing Time/Day headings and spaced clock tokens. Direct inspection of both supplied PDF layout sets found time and computed hours on all 56 and 66 rows. This establishes extraction on those inputs, not a repair of previously saved records.

Full release verification on the isolated base passed: lint, frontend/server types, model assets, all native tests, production build and deployment routing/health. Current main changes were then integrated; combined validation follows below.

Combined release gate passed on current main: 480 native tests, lint (warnings only), types, model assets, production build and deployment routing/health. Eight desktop/phone browser checks and three capture checks passed. Five exact-hash images were agent-reviewed. Documentation checker honored the existing owner pause; guides and capture evidence were nevertheless updated. No production writes were made.
