# Student Stream and Week 1 verification

The linked inventory found 27 current loaded courses across eight instructors with active approved syllabi and readable Week 1 teaching material. The original seed had multiple choice and true or false in mixed assessments, plus essay and generic written responses. Matching, enumeration, identification and step-by-step documentation were absent from Week 1.

The additive backfill uses the seeded teaching material and writes checked and published records through `edupulse_save_workspace` at the current instructor revision. The eight rollback rehearsals exercised projection for 179 new assessments and checked public question redaction and private key creation without creating attempts. Current block schedules govern the delivered copies.

All eight batches were applied. The linked readback found each of the seven formats in all 27 current courses, and a second backfill plan returned zero pending assessments. Existing mixed-format checks and submitted attempts remain in place.

A read-only call to the existing student publication RPC, scoped to one authorized enrollment in WMAD 302, returned the Week 1 reading and eight assessments with all seven formats.

The release gate and hosted-mode suite each passed 588 tests. The added seed regression passed separately. Targeted desktop and mobile browser checks exercised the new tabs, the true-or-false, identification and matching controls, authorization and reload without replay. Back-button focus restoration passed twice on both browser profiles.

Fourteen desktop and mobile capture scenes passed using fictional accounts. [Capture run](../../../capture-runs/2026-11-28T14-15-25-089Z-f0761fac.json).

No schema migration is required. [Vercel runbook](../../../backend-system/vercel.md#shared-agent-production-deployment-22-november-2026).
