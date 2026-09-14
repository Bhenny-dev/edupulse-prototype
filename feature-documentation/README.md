# EduPulse feature history

Version folders are release snapshots. Preserve released snapshots; add corrections in a new version. Each snapshot records features, architecture, validation evidence, deployment status, and known limitations. No secrets or student records belong here.

| Version | Scope | Status |
| --- | --- | --- |
| [v0.0.0](versions/v0.0.0/README.md) | Recorded baseline before connected AI | Historical baseline |
| [v0.1.0](versions/v0.1.0/README.md) | Real AI API, LangChain/LangGraph RAG, private vector knowledge, working UI integration | Deployed; local/live checks pass; GitHub runner billing lock recorded |
| [v0.1.1](versions/v0.1.1/README.md) | Ensure deployment tests execute and fail when tests are missing | Local and Vercel verification passed; supersedes v0.1.0 deployment gate |

Execution is tracked in [WORKPLAN.md](WORKPLAN.md). A release is verified only after lint, typecheck, tests, build, deployment validation, and remote checks have evidence.
