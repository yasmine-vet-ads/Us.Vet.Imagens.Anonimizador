# Reusable client-side engine

`engine.ts` exposes `processImage(bytes, extension, config, validateOnly?, fallback?, offscreenAvailable?)`. The caller supplies bytes and a neutral extension; original names and paths never enter the engine. Process one item at a time. A host can await each call, collect successful output Blobs, invalidate `ReviewState` whenever input/order/config changes, confirm review, then call `createZIP` using `outputName` names. This is a private source module, not a published package.

- `validation.ts`: size, extension and magic checks.
- `jpeg.ts`: bounded structural parsing, metadata stripping, color hint, browser/DOM decoding.
- `png.ts`: PNG parsing, bounded inflation, normalization and explicit RGB8 encoding.
- `binary.ts`: CRC and byte helpers.
- `core.ts`: limits, types, mask regions and processing orchestration.
- `effects.ts`: Gaussian blur and pixelization; algorithms unchanged from the baseline.
- `zip.ts`: neutral filenames and local ZIP STORE.
- `state.ts`: review/invalidation state.
- `errors.ts`: closed error-code mapping, no native exception strings.
- `capabilities.ts`: required API checks and actual Canvas/deflate constructor probes.
- `codec.ts`: compatibility facade for prior imports.
- `worker.ts`: PoC transport adapter with capability handshake and DOM callback.
- `main.ts`: PoC-only DOM/UI adapter, sequential processing, preview/download lifetime.

The engine modules do not depend on the PoC HTML, element IDs or a specific host framework. JPEG decoding needs browser APIs; PNG normalization/effects/encoding/ZIP run without the DOM when stream APIs are present. A future client host must check capabilities in both contexts, keep the worker loaded before offline operation, use the supplied JPEG fallback contract, preserve review gating and neutral names, and preserve local-only operation. No platform integration is included here.
