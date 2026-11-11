# Validation — local model catalog

- All twelve IDs match installed WebLLM 0.2.85. Public weight manifests, model configuration and compiled Wasm endpoints responded successfully. Sizes count weights only; GPU estimates come from runtime records.
- Real isolated download: SmolLM2-360M-Instruct-q4f32_1-MLC, seven shards, 203,614,080 bytes checked against the manifest. Complete-cache detection remained true after browser reload on 11 November 2026. This is a private verification profile, not installation into the owner's everyday browser.
- GPU initialization did not succeed in the automated Windows environment. Chromium reported a graphics-runtime/requestDevice error; bounded Chrome/Edge attempts did not reach ready. No real local inference is claimed. No operating-system drivers or DLLs were changed.
- Desktop/phone captures exercise actual cache inspection/removal against synthetic manifest/shard records with simulated WebGPU capability, not real model inference. Images are reviewed separately at their exact hashes.
- `npm run verify` passed: documentation checks, lint, both TypeScript projects, model assets, 298 native tests, production build and deployment checks. Existing bundle/lint warnings remain.
- Focused browser validation passed: four desktop/phone local-model tests, two saved-provider regression cases and two courseware reload cases. The first provider attempt used a preview without its required API baseline and failed before testing the interface; the normal dev/API run passed both cases.
- The wider browser run exposed an older courseware assertion expecting a collapsed week after reload. It matched three item buttons because the week correctly remained expanded. The assertion now targets the week header and checks the restored expanded state; both focused cases pass.
- The complete `npm run test:browser` selection finished with 429 passed, 24 skipped and that one original desktop assertion failure. The corrected case passed in the full mobile run and in both focused reruns. No additional failure appeared. This records the original invocation rather than describing it as an all-green run; unchanged passing cases were not repeated after the test-only correction.
- [Final capture run](../../../capture-runs/2026-11-11T06-17-36-669Z-8d0046a5.json): two suites passed, six desktop/phone images opened by Codex agent with exact-hash attestations. A long mobile selector found during review was constrained to the available width, then recaptured and checked again. This is agent review, not human acceptance.

## Production receipt

- Application commit `4a1659b76620928f9be617ea8f5151dbb12631f7` was pushed to `main`. Production deployment `dpl_6NgxREvV3dXnmuAVJsqRWivNtNqH` was **Ready**, checked on 11 November 2026 at 3:29 PM Asia/Manila. Its independent Vercel build passed all 298 native tests, the production build and deployment checks.
- At 3:38 PM Asia/Manila, public artifact inspection of the [production site](https://edupulse-prototype.vercel.app/) found all twelve curated model IDs and the new download-source, cached-count, load-cached and selected-removal controls in the deployed JavaScript. This establishes publication of the code, not GPU inference.
- A controlled production UI attempt could not establish its synthetic session and returned to sign-in. No protected Settings interaction is claimed from that attempt. Desktop/phone interaction evidence comes from the controlled local browser suites described above; real hosted authentication was not exercised.
- [GitHub Actions run](https://github.com/Bhenny-dev/edupulse-prototype/actions/runs/42979330563) did not start the verification job: GitHub reported that the account is locked due to a billing issue. This is separate from the successful local and Vercel release gates. No billing setting was changed.

This documentation-only receipt does not change application bytes or add a claim that all twelve models were downloaded or successfully ran inference.
