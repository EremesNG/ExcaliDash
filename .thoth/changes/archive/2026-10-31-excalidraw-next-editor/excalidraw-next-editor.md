# Change: excalidraw-next-editor

**Classification**: substantial
**Scope**: coordinated
**Uncertainty**: medium
**Risk**: high

## Exploration

Evidence gathered 2026-10-31 (Explorer x2, Librarian x1; root checks of CORS headers).

- Editor today: `frontend/package.json:16-17` declares `@excalidraw/excalidraw` `^0.18.1`; `frontend/package-lock.json:975-977` locks `0.18.1`. Other locked editor-family packages: `@excalidraw/laser-pointer` 1.3.1, `markdown-to-text` 0.1.2, `mermaid-to-excalidraw` 2.2.2, `random-username` 1.1.0. `frontend/package.json:52-59` overrides nanoid/sass/parser for the editor and Mermaid converter. React/ReactDOM/react-test-renderer locked at 18.3.1. Root, `server/`, `worker/`, `scripts/`, root `tests/` do not import any `@excalidraw/*` package.
- Upstream target: excalidraw.com serves the excalidraw/excalidraw `release` branch. Every push to `release` publishes `@excalidraw/excalidraw@0.18.0-<shorthash>` with dist-tag `next` (`.github/workflows/autorelease-excalidraw.yml`, `scripts/release.js`). On 2026-10-31: `https://excalidraw.com/version.json` = `2026-10-27T16:39:50Z-4ce8305`; `release` head = `4ce8305ca78e4ea05ad78c306292932bfe6b256f`; npm `next` = `0.18.0-4ce8305` (published 2026-10-27T17:05:24Z, integrity `sha512-tn3m0jjDQbd+mvFdAgmT6ikc+rVa8pt4Fc+HO7TLrqUxsFrMR+wNErbLSsR5dNliEayg3TMGugKf88sLG2Pq9g==`); npm `latest` = `0.18.1`. `master` (`8bcdca4`) diverges from `release` and has no npm build.
- Target compatibility: peers `react`/`react-dom` `^17.0.2 || ^18.2.0 || ^19.0.0` (React 18.3.1 stays valid); ESM; CSS still `@excalidraw/excalidraw/index.css`; fonts still in `dist/prod/fonts` with `window.EXCALIDRAW_ASSET_PATH` and an esm.sh fallback; `./*` and `./element/*` subpaths are type-only exports; depends on exact `@excalidraw/element`, `@excalidraw/common`, `@excalidraw/math` `0.18.0-4ce8305`.
- Breaking changes relevant here (pinned CHANGELOG, PR #12347): `exportToSvg`/`exportToBlob`/`exportToCanvas` replaced by `exportScene({ type, data: { elements, appState, files }, config })` (`exportPadding` -> `config.padding` default 10, `exportWithDarkMode` -> `config.theme`, `exportBackground:false` -> `config.canvasBackgroundColor:false`, `exportEmbedScene` -> `config.embedScene`); prop `excalidrawAPI` renamed `onExcalidrawAPI`; MainMenu theme item `onSelect` removed in favor of editor `onThemeChange`; `scrollToContent` replaced by `setViewport`; `restore` no longer exported. `onChange`, `onPointerUpdate`, `UIOptions`, `langCode`, `addFiles`, `updateScene`, `convertToExcalidrawElements`, `CaptureUpdateAction`, `useI18n`, `languages`, `MainMenu` remain. New element type `stickynote` (`baseHeight`), text `baseFontSize`; Bucket Fill and lasso present in the build.
- Local call sites: production `exportToSvg` in `frontend/src/utils/importHelpers.ts:90-104` (import thumbnails, padding 10), `frontend/src/components/drawing-card/useDrawingPreview.ts:128-144` (dashboard thumbnail regeneration, light, padding 10), `frontend/src/pages/editor/useEditorPersistence.ts:382-400` (persisted thumbnail, light, default padding). Test mocks in `frontend/tests/editor-history-sharing.test.tsx:12,26-43,320` and `editor-save-safety.test.tsx:16`. Editor props in `frontend/src/pages/editor/EditorView.tsx:317-346`; read-only history instance `HistoryPreviewCanvas.tsx:1-39`; `addFiles` monkeypatch `useEditorSceneApi.ts:91-102`; type imports from `/types` and `/element/types`.
- Collaboration: local `reconcileElements` in `frontend/src/utils/sync.ts`; its equal-metadata signature (`sync.ts:26-49`) and the outgoing change-tracking signatures (`frontend/src/pages/editor/shared.ts:16-38`, `frontend/src/pages/editor/useEditorElementTracking.ts:8-35`) enumerate known fields only, so new element fields such as `baseHeight` and `baseFontSize` are not represented.
- Server: `server/api.ts:40` validates elements only as objects with string ids (no type whitelist); scenes stored as JSON in R2; backups preserve arbitrary element fields. `/api/system/*` (`server/api.ts:55`) returns static `upstream.json` metadata with `outboundEnabled:false`; `/api/auth/status` (`server/api.ts:20`) hardcodes `authMode:'oidc_enforced'`, provider ChatGPT. No outbound `fetch()` exists; JSON responses use `Cache-Control:no-store`.
- Settings: `frontend/src/pages/settings/AdvancedSettings.tsx:32` renders Advanced; auth row `:147-166` (managed mode shows `AUTH_MODE=oidc_enforced` and a disabled Disable button); version row `:178-193`, using `SettingsRow` (`SettingsRow.tsx:54-62`). Version/label come from `frontend/vite.config.ts:6-14,29-32` (`VITE_APP_VERSION` from root `VERSION`) and `scripts/prepare-frontend.mjs:3` (static edition label `ChatGPT Sites · personal`, not a Site name). Advanced strings are English-only; no Settings tests exist.
- Network: browser fetches of `https://excalidraw.com/version.json` are blocked by CORS (`Access-Control-Allow-Origin: https://excalidraw.com`); npm dist-tags endpoint returns no CORS header. No CSP found in repository source.
- Toolchain: all manifests require Node `>=24.22.1`; the local Node is 24.21.0 (managed by pnpm at `%LOCALAPPDATA%\pnpm\bin`), local npm is 12.1.0 while `frontend/` declares npm 10.9.2, pnpm 11.25.0 matches the root. Neither root nor frontend `node_modules` is installed. `tests/adapter.integration.mjs:4-9` loads esbuild from `frontend/node_modules`; `scripts/prepare-frontend.mjs:3-6` writes `public/` and `server/spa-html.ts`. Locked Miniflare supports an `outboundService` callback for stubbing outbound fetch.
- Policy: `upstream.json` records ExcaliDash provenance only (`updateMode: manual-reviewed`); `docs/UPDATES.md` has no editor-specific procedure; README states the editor stays 0.18.1 without Bucket Fill. Frontend uses npm (root pnpm `minimumReleaseAge` 7 days does not apply to it). `.thoth/` did not exist before this record.

## Intent

Pin the fork's Excalidraw editor to the exact published build that excalidraw.com serves (`@excalidraw/excalidraw@0.18.0-4ce8305`, `release` commit `4ce8305`) instead of the stable `0.18.1`, keep all ExcaliDash and ChatGPT Sites behavior working on it, record the editor's provenance, and give both developers (script) and users (Settings → Advanced) a way to detect when excalidraw.com moves to a different build. Also make the Advanced authentication row describe ChatGPT Sites-managed authentication accurately.

## Non-goals

- Upgrading React (stays 18.3.1), Vite, Tailwind or other frontend libraries beyond what the editor pin requires.
- Tracking `master` or unpublished commits; building Excalidraw from source.
- Automatic editor updates, CI failure on upstream drift, or browser-side requests to third parties.
- Changing ExcaliDash upstream version (0.6.7), the adapter's persistence/collaboration architecture, or `/api/auth/status` semantics.
- Localizing the Advanced panel; adding sharing, Socket.IO or other unimplemented upstream features.
- Publishing to the hosted Site; that is a separate, user-confirmed step after closeout.

## Acceptance

- AC-1: `frontend/package.json` pins `@excalidraw/excalidraw` to exactly `0.18.0-4ce8305` (no range) and `frontend/package-lock.json` resolves it with integrity `sha512-tn3m0jjDQbd+mvFdAgmT6ikc+rVa8pt4Fc+HO7TLrqUxsFrMR+wNErbLSsR5dNliEayg3TMGugKf88sLG2Pq9g==`, React stays 18.3.1, no removed editor API (`exportToSvg`, `exportToBlob`, `exportToCanvas`, `excalidrawAPI` prop, theme-item `onSelect`, `scrollToContent`, `restore`) remains in `frontend/src` or `frontend/tests`, the three thumbnail paths use `exportScene` SVG with equivalent output (light theme, white fallback background, files, padding 10 where previously set), and frontend `tsc -b`, `lint` and `test:unit` pass with tests that failed against the old export path.
- AC-2: Collaboration and save reconciliation treat edits to fields introduced by the new build (at least sticky-note `baseHeight` and text `baseFontSize`) as real changes, proven by frontend tests.
- AC-3: `upstream.json` has an `editor` provenance block (package, version, full commit, branch, npm channel, excalidraw.com version id, release timestamp, npm integrity, update mode), and `check:editor-upstream` verifies offline that `upstream.json`, `frontend/package.json` and `frontend/package-lock.json` agree (non-zero exit on mismatch, run in CI) and, online, reports match or drift against `https://excalidraw.com/version.json` and npm `next`.
- AC-4: Authenticated `GET /api/system/editor` returns the pinned build and excalidraw.com status (`match`, `newer`, `different` or `unavailable`) using a server-side fetch with a short timeout and caching; unauthenticated requests get 401; existing `/api/system/*` responses are unchanged; adapter tests cover match, newer, upstream failure and authentication.
- AC-5: Settings → Advanced shows an "Excalidraw editor" row with the built editor version and the excalidraw.com status for loading, match, newer, different and unavailable states without any browser request to third-party hosts, and the authentication row describes ChatGPT Sites-managed authentication without a disable control; frontend tests cover these states.
- AC-6: README, `docs/ADAPTATION.md`, `docs/UPDATES.md` and `AGENTS.md` describe the pinned editor, its new capabilities, the editor update procedure (find excalidraw.com build, pin matching `next` version, update provenance, run checks) and the backup-before-publish and non-reversible-data caveat.
- AC-7: On the integrated tree, the CI-equivalent suite (`check:public-source`, `build`, root `tsc --noEmit`, frontend `tsc -b`, `test:frontend`, `test:adapter`, `check:editor-upstream --offline`) passes, frontend lint passes, root lint has no new findings versus `main`, and a real-browser smoke test passes: sticky note, Bucket Fill and lasso work; save and reload persist a sticky note; dashboard thumbnail, history preview, PNG/SVG export and image upload work; editor fonts load from the same origin; the Settings rows render; a second session receives a sticky-note edit.

## Clarifications

- Target build: user asked for the version excalidraw.com runs; evidence shows that is `0.18.0-4ce8305` (release head, npm `next`, `version.json`). No question needed.
- Git (user, 2026-10-31): commit preparatory docs on `main`, implement on branch `feat/excalidraw-next` for PR review. Done: `93ce6ab`, `43c8111`, branch created.
- Release age (user): install `0.18.0-4ce8305` now; do not wait for the 7-day age used by root pnpm policy.
- Tracking (user): document the procedure, add a local check script, and add a Settings → Advanced indicator.
- Indicator mode (user): live comparison through an authenticated Worker endpoint that fetches `excalidraw.com/version.json` server-side.
- Authentication row (user): fix the misleading `AUTH_MODE=oidc_enforced` row in this change.
- Personal Site identity must never be written to the repository; Sites preview/publish happens later through Codex with explicit confirmation.

## Decisions

- Pin exact versions only; editor updates remain `manual-reviewed`, one reviewed change per editor bump.
- Keep React 18.3.1 and the existing frontend toolchain; adjust `overrides` only if the new dependency tree requires it.
- Thumbnails keep current visual output (light, white fallback, existing padding); `embedScene` stays off as today.
- Editor provenance lives in a new `editor` block in `upstream.json`; ExcaliDash fields keep their meaning.
- The drift endpoint is authenticated, sends no user data upstream, uses a timeout of at most 3 s and caches the upstream answer for at least 10 minutes; failures return `unavailable` instead of an error to the UI. Status: `match` when the short hash equals the pinned one, `newer` when the upstream timestamp is later than the pinned release timestamp, `different` otherwise.
- The Settings badge shows the editor version actually built into the bundle (build-time constant); the status comes from the endpoint.
- The drift check never fails CI; only the offline consistency check does.
- New Advanced strings stay English, consistent with the panel.
- Risk accepted: once drawings contain new element types, reverting to 0.18.1 is not lossless; mitigation is documented backup-before-publish.
- Precondition P-1: local Node must satisfy `>=24.22.1` before any install or check runs; upgrading the global runtime is a user-owned environment step that root confirms with the user before AC-1 starts. Frontend installs and lockfile changes use npm 10.9.2 (`npx -y npm@10.9.2 ...`), root installs use pnpm 11.25.0 with `--frozen-lockfile`.

## Durable deltas

- `ADDED editor-integration` **Pinned editor build** — The frontend MUST depend on one exact published `@excalidraw/excalidraw` version whose package, commit and integrity are recorded in `upstream.json`, and the repository MUST fail its offline consistency check when the manifest, lockfile and provenance disagree.
  - GIVEN `upstream.json` records editor version V; WHEN `frontend/package.json` or `frontend/package-lock.json` resolves a different version or a range; THEN `check:editor-upstream --offline` exits non-zero .
- `ADDED editor-integration` **Editor upstream drift status** — Authenticated users MUST be able to see, in Settings → Advanced, the built editor version and whether excalidraw.com currently serves the same build, a newer build, a different build, or could not be checked, without their browser contacting third-party hosts.
  - GIVEN the pinned editor is `0.18.0-4ce8305`; WHEN excalidraw.com reports a later build with another hash; THEN `GET /api/system/editor` returns status `newer` and the Advanced row shows that an editor update is available .
- `ADDED settings-advanced` **Managed authentication description** — When authentication is provided by ChatGPT Sites, Settings → Advanced MUST describe it as managed by ChatGPT Sites and MUST NOT offer a control to disable authentication.
  - GIVEN the adapter reports Sites-managed authentication; WHEN a user opens Settings → Advanced; THEN the authentication row names ChatGPT Sites and shows no Disable button .

## Plan

Approach: upgrade in place inside `frontend/`, add provenance and drift detection at the root/server layer, then update the Advanced panel and docs, and verify the integrated tree in a real browser.

1. Editor pin and API migration (`frontend/`): test-first — change test mocks/assertions to expect `exportScene` with `{ type: "svg", data: { elements, appState, files }, config: { padding, theme: "light", canvasBackgroundColor } }` and see them fail; pin the exact version with npm 10.9.2 (`npm --prefix frontend install --save-exact @excalidraw/excalidraw@0.18.0-4ce8305`), review lockfile churn and `overrides`; migrate the three export sites, `excalidrawAPI` -> `onExcalidrawAPI` (nullable on unmount), MainMenu theme item -> `onThemeChange`, `scrollToContent` -> `setViewport` if used, type-only subpath imports; confirm `frontend/scripts/copy-excalidraw-assets.mjs` still finds `dist/prod/fonts`. Focused checks stay inside `frontend/`: `npm ci`, `tsc -b`, `lint`, `test:unit`, `npm --prefix frontend run build` (writes only `frontend/dist`). `scripts/prepare-frontend.mjs` runs only in step 7.
2. Sync coverage (`frontend/src/utils/sync.ts`, `frontend/src/pages/editor/shared.ts`, `frontend/src/pages/editor/useEditorElementTracking.ts`, reconciliation helpers, tests): test-first — a remote, outgoing or saved change touching only `baseHeight`/`baseFontSize` (and any other new persisted field identified from the pinned types) must not be treated as equal on the receiver or skipped by the sender; extend the signatures generically where possible.
3. Provenance and script (root): `upstream.json` `editor` block; `scripts/check-editor-upstream.mjs` (Node, no new dependencies) with `--offline`; root `package.json` script `check:editor-upstream`; CI step `npm run check:editor-upstream -- --offline` in `.github/workflows/sites-ci.yml`. The script accepts an alternate root directory so mismatch cases are exercised on temporary fixture copies outside the repository; it never edits `frontend/` manifests. No installs or builds in this step.
4. Drift endpoint (`server/api.ts`, `tests/adapter.integration.mjs`): route `GET /api/system/editor` before the `/api/system/*` catch-all, after identity checks; fetch `https://excalidraw.com/version.json` with `AbortSignal.timeout(<=3000)`, parse `<ISO>-<hash>`, compare with `upstream.json` editor block, cache in module scope (and/or Cache API) for >=10 minutes; adapter tests stub outbound fetch through Miniflare `outboundService`, run each upstream scenario (match, newer, failure/timeout) in a fresh Miniflare instance or behind a bounded reset seam so cached results cannot mask later cases, assert cache reuse and timeout handling, and assert 401 without identity. Root dependencies are installed with `pnpm install --frozen-lockfile` at the start of this step.
5. Advanced panel (`frontend/`): build-time constant for the installed editor version (read the installed package manifest from disk in `frontend/vite.config.ts`, following the existing `VERSION` pattern); `frontend/src/api/system.ts` client for `/api/system/editor`; new `SettingsRow` "Excalidraw editor" in `AdvancedSettings.tsx` with badge and status text; authentication row: when auth is managed by ChatGPT Sites show "Managed by ChatGPT Sites" without the Disable button, keep local-mode behavior; frontend tests for row states.
6. Docs: README baseline table and features, `docs/ADAPTATION.md` editor section, `docs/UPDATES.md` editor update procedure (with rollback/backup caveat), `AGENTS.md` pointer to the procedure and `check:editor-upstream`.
7. Integrated verification: CI-equivalent suite, linters versus `main` baseline, real-browser smoke with `pnpm dev` (development identity) using agent-browser, including two sessions and network inspection for fonts and third-party requests.

Mutable surfaces and owners: (1)(2) frontend editor files, package manifest/lockfile and tests; (3) `upstream.json`, `scripts/check-editor-upstream.mjs`, root `package.json`, CI workflow; (4) `server/api.ts`, `tests/adapter.integration.mjs`; (5) `frontend/vite.config.ts`, `frontend/src/api/system.ts`, `frontend/src/pages/settings/*`, new frontend test; (6) docs and `AGENTS.md`. Scheduling: units 1 and 3 run in parallel (disjoint writes; unit 1 checks stay inside `frontend/`; unit 3 runs no installs or builds and probes mismatches only on fixture copies). Unit 4 waits for units 1 and 3 because the adapter harness loads esbuild from `frontend/node_modules`, which unit 1 replaces. Unit 2 waits for unit 1 and may run alongside unit 4 (disjoint writes; both only read shared `node_modules`). Unit 5 waits for units 2 and 4 so frontend `tsc -b` runs are not concurrent. Units 6 and 7 follow in order; `scripts/prepare-frontend.mjs` and other root-wide build steps run only in unit 7.

Risks: hidden behavior changes in retained APIs (`updateScene`, `addFiles`, reconciliation, image insertion) not visible to mocked tests — covered by browser smoke; transitive dependency churn and `overrides` conflicts; Sites runtime may block outbound fetch — UI degrades to `unavailable`, verified later in a Sites preview; irreversible new element data after publication — backup-before-publish documented; the 4-day-old package is accepted by the user.

## Tasks

- [x] AC-1: Pin `0.18.0-4ce8305` and migrate removed editor APIs with failing-first tests
  - Outcome: frontend builds and tests on the pinned editor with no removed APIs and equivalent thumbnails
  - Known entrypoints and skill paths: `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/utils/importHelpers.ts`, `frontend/src/components/drawing-card/useDrawingPreview.ts`, `frontend/src/pages/editor/useEditorPersistence.ts`, `frontend/src/pages/editor/EditorView.tsx`, `frontend/src/pages/editor/HistoryPreviewCanvas.tsx`, `frontend/src/pages/editor/useEditorSceneApi.ts`, `frontend/tests/editor-history-sharing.test.tsx`, `frontend/tests/editor-save-safety.test.tsx`, `frontend/scripts/copy-excalidraw-assets.mjs`; skills `tdd`, `simplify`
  - Inputs: Exploration section (API mapping, call sites, target version and integrity)
  - Dependencies: precondition P-1 satisfied
  - Output: pinned manifest/lockfile, migrated source and tests, list of any additional API differences found
  - Owner: thoth-worker
  - Writes: `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/**` except `frontend/src/pages/settings/**` and `frontend/src/api/system.ts`, `frontend/tests/editor-*.test.tsx`, `frontend/scripts/copy-excalidraw-assets.mjs`
  - Interface boundaries: Excalidraw public API; scene/thumbnail strings consumed by `server/api.ts` unchanged
  - Focused check and PASS evidence: `npx -y npm@10.9.2 --prefix frontend ci`, `node frontend/node_modules/typescript/bin/tsc -b frontend/tsconfig.json`, `npm --prefix frontend run lint`, `npm --prefix frontend run test:unit`, `npm --prefix frontend run build` all exit 0 and write nothing outside `frontend/`; grep shows no removed API; red-then-green test evidence
  - Return milestone: all focused checks green
  - Stop / reassessment: React 19 or toolchain upgrade required, persisted scene format changes, or removed API without replacement
- [x] AC-2: Make sync and save reconciliation detect changes to new element fields
  - Outcome: edits to new-build fields are never treated as no-ops by collaboration or conflict reconciliation
  - Known entrypoints and skill paths: `frontend/src/utils/sync.ts`, `frontend/src/pages/editor/shared.ts`, `frontend/src/pages/editor/useEditorElementTracking.ts`, `frontend/src/pages/editor/reconcileSave.ts`, `frontend/src/pages/editor/useEditorCollaboration.ts`, `frontend/tests/editor-collaboration-safety.test.tsx`, `frontend/tests/editor-save-safety.test.tsx`; skill `tdd`
  - Inputs: accepted AC-1 output (pinned types installed)
  - Dependencies: AC-1 unit accepted
  - Output: updated receiver and sender signatures/reconciliation with receiver-side and sender-side regression tests
  - Owner: thoth-worker
  - Writes: `frontend/src/utils/sync.ts`, `frontend/src/pages/editor/shared.ts`, `frontend/src/pages/editor/useEditorElementTracking.ts`, `frontend/src/pages/editor/reconcileSave.ts` if needed, `frontend/tests/editor-collaboration-safety.test.tsx`, `frontend/tests/editor-save-safety.test.tsx`
  - Interface boundaries: `reconcileElements` callers; collaboration event payloads unchanged
  - Focused check and PASS evidence: new tests fail before and pass after; `npm --prefix frontend run test:unit` and frontend `tsc -b` exit 0
  - Return milestone: tests green
  - Stop / reassessment: change requires altering event or persisted formats
- [x] AC-3: Record editor provenance and add the `check:editor-upstream` script
  - Outcome: provenance block, offline consistency check in CI, online drift report
  - Known entrypoints and skill paths: `upstream.json`, `package.json`, `.github/workflows/sites-ci.yml`, `scripts/check-public-source.mjs` (style reference); skill `nodejs-best-practices`
  - Inputs: Exploration target facts (version, full SHA, timestamp, version id, integrity)
  - Dependencies: none; runs in parallel with AC-1, performs no installs or builds and never edits `frontend/` (offline check passes on the real tree once AC-1 lands)
  - Output: `upstream.json` editor block, `scripts/check-editor-upstream.mjs`, root script, CI step
  - Owner: thoth-worker
  - Writes: `upstream.json`, `scripts/check-editor-upstream.mjs`, `package.json` (scripts only), `.github/workflows/sites-ci.yml`
  - Interface boundaries: `upstream.json` read by `server/api.ts` `/api/system/*`; existing fields unchanged
  - Focused check and PASS evidence: offline mode exits non-zero on a mismatching fixture copy and zero on a matching fixture copy, both outside the repository via the alternate-root argument; online mode prints match for `4ce8305`
  - Return milestone: script behavior demonstrated
  - Stop / reassessment: need for new dependencies or CI secrets
- [x] AC-4: Add authenticated `GET /api/system/editor` drift endpoint with adapter tests
  - Outcome: endpoint returns pinned build and excalidraw.com status with timeout, caching and graceful failure
  - Known entrypoints and skill paths: `server/api.ts`, `tests/adapter.integration.mjs`, `upstream.json`; skills `tdd`, `workers-best-practices`
  - Inputs: accepted AC-3 `upstream.json` editor block; accepted AC-1 frontend dependency tree (adapter harness loads esbuild from `frontend/node_modules`)
  - Dependencies: AC-1 and AC-3 units accepted; may run alongside AC-2
  - Output: route, comparison logic, tests for match/newer/failure/401
  - Owner: thoth-worker
  - Writes: `server/api.ts`, `tests/adapter.integration.mjs`
  - Interface boundaries: `/api/system/*` existing responses unchanged; identity and origin checks preserved; response JSON `no-store`
  - Focused check and PASS evidence: `pnpm install --frozen-lockfile` then `pnpm test:adapter` exits 0 with new cases (each upstream scenario in a fresh Miniflare instance or after a bounded reset; cache reuse and timeout asserted); root `tsc --noEmit` exits 0; no `scripts/prepare-frontend.mjs` run
  - Return milestone: adapter tests green
  - Stop / reassessment: Miniflare cannot stub outbound fetch without new dependencies
- [x] AC-5: Add the Excalidraw editor row and fix the managed authentication row in Settings → Advanced
  - Outcome: accurate Advanced panel for Sites with tested states
  - Known entrypoints and skill paths: `frontend/src/pages/settings/AdvancedSettings.tsx`, `frontend/src/pages/settings/SettingsRow.tsx`, `frontend/src/pages/settings/Settings.tsx`, `frontend/src/api/system.ts`, `frontend/vite.config.ts`, `frontend/src/context/AuthContext.tsx`; skills `tdd`, `accessibility`
  - Inputs: accepted AC-1 (installed editor), AC-2 (frontend tree) and AC-4 (endpoint contract)
  - Dependencies: AC-1, AC-2 and AC-4 units accepted
  - Output: editor row, auth row change, build-time editor version constant, client, tests
  - Owner: thoth-designer
  - Writes: `frontend/src/pages/settings/**`, `frontend/src/api/system.ts`, `frontend/vite.config.ts`, `frontend/src/vite-env.d.ts` if needed, new `frontend/tests/settings-advanced.test.tsx`
  - Interface boundaries: `/api/system/editor` contract; `/api/auth/status` unchanged; local auth mode behavior preserved
  - Focused check and PASS evidence: new tests fail before and pass after; frontend `tsc -b`, `lint`, `test:unit` exit 0
  - Return milestone: tests green with state screenshots or rendered output
  - Stop / reassessment: auth row fix needs an API contract change
- [x] AC-6: Document the pinned editor and the editor update procedure
  - Outcome: docs match the implemented behavior
  - Known entrypoints and skill paths: `README.md`, `docs/ADAPTATION.md`, `docs/UPDATES.md`, `AGENTS.md`; skill `documentation-writer`
  - Inputs: accepted AC-1 to AC-5 outputs
  - Dependencies: AC-1, AC-2, AC-4 and AC-5 units accepted
  - Output: updated docs
  - Owner: thoth-worker
  - Writes: `README.md`, `docs/ADAPTATION.md`, `docs/UPDATES.md`, `AGENTS.md`
  - Interface boundaries: no personal Site identity in any file
  - Focused check and PASS evidence: documented scripts/paths exist; `git diff --check` clean; no Site name present
  - Return milestone: docs updated
  - Stop / reassessment: behavior differs from accepted outputs
- [x] AC-7: Verify the integrated tree with the CI-equivalent suite and a real-browser smoke test
  - Outcome: evidence that the integrated change works end to end
  - Known entrypoints and skill paths: `.github/workflows/sites-ci.yml`, `package.json`, `frontend/package.json`; skill `agent-browser`
  - Inputs: accepted AC-1 to AC-6 outputs
  - Dependencies: all other units accepted
  - Output: command outcomes and smoke-test evidence (screenshots outside the repository)
  - Owner: thoth-worker
  - Writes: none
  - Interface boundaries: development identity only; no hosted Site access
  - Focused check and PASS evidence: every suite command exits 0; root lint findings not above `main`; each smoke step observed
  - Return milestone: suite and smoke complete
  - Stop / reassessment: any failure returns evidence to root for a fix unit

## Authorization

Accepted values: Plan review: `OKAY | SKIPPED`; Plan review selection:
`EXPLICIT_REVIEW | EXPLICIT_SKIP | DEFAULT_REVIEW_AFTER_3`; Implementation:
`AUTHORIZED`. Put notes on separate lines below the fields, never on field lines.

**Plan review**: OKAY
**Plan review selection**: EXPLICIT_REVIEW
**Implementation**: AUTHORIZED

Plan review round 1 (subtask_thoth-oracle_1793503619931_0c68713f): REJECT on check scheduling/ownership; repaired in the same record.
Plan review round 2 (subtask_thoth-oracle_1793503947565_85d4b9fd): OKAY, valid gate verdict, recordSha256 f8bcf3f6810f75d87b3ffa4ba769cd6e0954532e2c58c51ba064ccf8592dd2b1 (recordDigest match).
Nonblocking cautions carried into AC-1: `initialData.scrollToContent` remains valid upstream; the `onSelect` removal applies to `DefaultItems.ToggleTheme`, not generic `MainMenu.Item`.
Implementation authorized explicitly by the user on 2026-10-31 after the OKAY.
P-1 satisfied 2026-10-31 with user approval: global Node switched to v24.22.2 via `pnpm env use --global 24.22.2`.

## Verification

Accepted values: Reviewer: `oracle`; Independent from implementer: `Yes`;
Verdict: `PASS`; Reviewed record SHA-256: 64 lowercase hex characters hashing
exact UTF-8 bytes before the case-sensitive `## Authorization` heading. Use
exactly one SHA field line; put notes on separate lines below the fields.

**Reviewer**: oracle
**Independent from implementer**: Yes
**Verdict**: PASS
**Reviewed record SHA-256**: d5a4c8b2a735cce1c60a55419ae1a6f31bf34550636926d4c3341e2899bc7025

Final verification by fresh Oracle subtask_thoth-oracle_1793507926924_0042ca0a; harness gate verdict valid:true, kind final-verification, verdict PASS, mode record, recordDigest match.
Nonblocking risks carried forward: content-signature CPU cost on dense drawings (profile before optimizing); hosted outbound access to be confirmed in the separately authorized Sites preview; editor downgrade is not lossless (backup before publishing).

**Oracle envelope**:

```thoth-result
{
  "schemaVersion": 1,
  "role": "oracle",
  "status": "complete",
  "conclusion": "PASS. The reviewed diff satisfies AC-1–AC-7 and the durable deltas. No blocking defects found.",
  "evidence": [
    {
      "id": "E1",
      "kind": "record-binding",
      "locator": ".thoth/changes/excalidraw-next-editor/excalidraw-next-editor.md",
      "claim": "Verify validation passes; both declared canonical specs are absent. Reviewed inputs remained unchanged throughout verification.",
      "basis": "observed",
      "uncertainty": ""
    },
    {
      "id": "E2",
      "kind": "dependency-review",
      "locator": "frontend/package.json; frontend/package-lock.json; upstream.json",
      "claim": "Exact editor pin, required integrity and editor-family versions agree; React, ReactDOM and renderer remain 18.3.1.",
      "basis": "observed",
      "uncertainty": "Dependencies were not reinstalled during this read-only review."
    },
    {
      "id": "E3",
      "kind": "frontend-verification",
      "locator": "frontend/src; frontend/tests; frontend build",
      "claim": "106 tests pass. All three thumbnail migrations preserve contracted settings. Nullable API registration clears readiness. New-field, nested-content, Settings-state and local-auth regressions pass. Frontend build, typecheck and lint pass.",
      "basis": "observed",
      "uncertainty": "Thumbnail unit tests mock rendering; browser artifacts provide complementary integration evidence."
    },
    {
      "id": "E4",
      "kind": "api-verification",
      "locator": "server/api.ts; tests/adapter.integration.mjs",
      "claim": "24 adapter checks pass, covering authentication, method/origin rejection, public-only upstream requests, timeout, caching, comparison states and unchanged system/auth contracts.",
      "basis": "observed",
      "uncertainty": "Outbound behavior was exercised in Miniflare, not the hosted Site."
    },
    {
      "id": "E5",
      "kind": "consistency-verification",
      "locator": "scripts/check-editor-upstream.mjs; .github/workflows/sites-ci.yml",
      "claim": "Offline check passes; independent in-memory manifest-range, manifest-version, lock-version and integrity mismatches exit 1. CI invokes offline mode; online drift remains informational.",
      "basis": "observed",
      "uncertainty": "Live upstream services were not queried during this review."
    },
    {
      "id": "E6",
      "kind": "bundling-verification",
      "locator": "frontend/vite.config.ts; frontend/dist/assets",
      "claim": "Fresh build isolates the subset helper. Worker imports exclude the SPA entry. Independent guard probes reject missing helpers and document/window-bearing helpers and accept a worker-safe helper regardless of filename hash.",
      "basis": "observed",
      "uncertainty": "Upstream WASM code contains guarded browser branches; a blanket document-token scan was therefore inapplicable."
    },
    {
      "id": "E7",
      "kind": "integration-artifacts",
      "locator": "C:/Users/EremesNG/AppData/Local/Temp/excalidash-ac7; C:/Users/EremesNG/AppData/Local/Temp/excalidash-fix-subset",
      "claim": "Supplied screenshots, HARs, completed build log and worker probe corroborate integrated smoke results, same-origin fonts, no third-party browser requests and clean post-fix console behavior.",
      "basis": "observed",
      "uncertainty": "Artifacts were independently inspected; the complete live-browser sequence was not replayed."
    },
    {
      "id": "E8",
      "kind": "source-hygiene",
      "locator": "README.md; AGENTS.md; docs/ADAPTATION.md; docs/UPDATES.md; root checks",
      "claim": "Documentation matches implementation and explains backups and lossy rollback. Public-source and diff-whitespace checks pass. No Site identity was added; app/layout.tsx is unchanged. Root typecheck passes; in-memory comparison confirms all 38 API lint findings also exist on main.",
      "basis": "observed",
      "uncertainty": "Plain repository-wide lint retains the reported pre-existing generated-output limitation."
    },
    {
      "id": "E9",
      "kind": "reconciliation-review",
      "locator": "frontend/src/utils/sync.ts; frontend/src/pages/editor/shared.ts; useEditorElementTracking.ts",
      "claim": "Canonical signatures preserve JSON array order, normalize object-key order and exclude separately compared revision metadata. Independent probes confirm version, nonce, timestamp and prefer-local precedence. No transport payload or persisted format changes occur.",
      "basis": "observed",
      "uncertainty": "Synthetic signature scans measured approximately 2.7 ms for 1,000 small elements and 47 ms for ten 10,000-point strokes on this machine."
    }
  ],
  "verification": [
    {
      "check": "AC-1: pin and editor migration",
      "method": "Inspect manifests, installed implementation, call sites and regression tests; run frontend build and lint.",
      "outcome": "pass",
      "evidenceIds": ["E2", "E3"],
      "reason": "Contracted export options and nullable registration are correct. Retained initialData.scrollToContent and generic MainMenu.Item.onSelect are not removed APIs."
    },
    {
      "check": "AC-2: synchronization and reconciliation",
      "method": "Review canonicalization and consumers; run regression suite and independent precedence probes.",
      "outcome": "pass",
      "evidenceIds": ["E3", "E9"],
      "reason": "New persisted fields are detected without changing ordering precedence or wire formats."
    },
    {
      "check": "AC-3: provenance and consistency tooling",
      "method": "Run offline check and negative in-memory fixtures; inspect online paths and CI invocation.",
      "outcome": "pass",
      "evidenceIds": ["E2", "E5"],
      "reason": "Local mismatches fail; upstream drift does not fail CI."
    },
    {
      "check": "AC-4: authenticated drift endpoint",
      "method": "Inspect route/security boundaries and rerun adapter integration tests.",
      "outcome": "pass",
      "evidenceIds": ["E4"],
      "reason": "Timeout, completed-result caching, privacy and graceful unavailable behavior meet the endpoint contract."
    },
    {
      "check": "AC-5: Advanced Settings",
      "method": "Review rendered component semantics, state tests and supplied screenshots/network artifacts.",
      "outcome": "pass",
      "evidenceIds": ["E3", "E7"],
      "reason": "All states are represented accessibly; comparison uses the same-origin API; managed authentication has no disable control and local controls remain."
    },
    {
      "check": "AC-6: documentation and identity hygiene",
      "method": "Review documentation diff and rerun public-source/whitespace checks.",
      "outcome": "pass",
      "evidenceIds": ["E8"],
      "reason": "Procedure, capabilities, provenance and rollback caveats are accurate within scope."
    },
    {
      "check": "AC-7: integrated verification",
      "method": "Rerun required fast checks, frontend build/lint and root typecheck; compare API lint against main; inspect supplied integration artifacts.",
      "outcome": "pass",
      "evidenceIds": ["E3", "E4", "E5", "E6", "E7", "E8"],
      "reason": "Fresh focused checks pass, existing lint debt is unchanged, and supplied full-suite/browser evidence is coherent with the reviewed implementation."
    }
  ],
  "risks": [
    {
      "description": "Complete-content signatures add CPU and allocation cost for dense drawings. Profile representative large scenes before any follow-up optimization; preserve nested-change detection.",
      "severity": "medium",
      "blocking": false,
      "evidenceIds": ["E9"]
    },
    {
      "description": "Hosted outbound access remains deployment-specific; confirm the indicator during the separately authorized Sites preview. Failures already degrade safely to unavailable.",
      "severity": "low",
      "blocking": false,
      "evidenceIds": ["E4", "E7"]
    },
    {
      "description": "Downgrading after new element types are saved is not lossless; retain the documented backup-before-publish safeguard.",
      "severity": "medium",
      "blocking": false,
      "evidenceIds": ["E8"]
    }
  ],
  "openQuestions": [],
  "nextAction": "Root should validate this envelope, record the matched digest and evidence, then perform closeout and archive. Publication remains separately authorized.",
  "review": {
    "kind": "final-verification",
    "verdict": "PASS",
    "reviewedRecord": ".thoth/changes/excalidraw-next-editor/excalidraw-next-editor.md",
    "reviewedRecordSha256": "d5a4c8b2a735cce1c60a55419ae1a6f31bf34550636926d4c3341e2899bc7025"
  }
}
```

After PASS, root pastes the Oracle's unchanged final-verification envelope here.

- AC-1: PASS | frontend `npm ci` (npm 10.9.2), `tsc -b`, lint, `test:unit`, build; removed-API grep | exact pin + integrity in manifest/lock, React 18.3.1; thumbnail/scene-API tests red (10 + 1 failures) then green
- AC-2: PASS | `test:unit`, frontend `tsc -b`, lint | receiver/sender/save tests red (32 failures) then green; canonical sorted-key content signature in `sync.ts`/`shared.ts`/`useEditorElementTracking.ts`
- AC-3: PASS | `check:editor-upstream` on fixture copies and real tree; CI step | mismatch fixtures exit 1, matching exit 0; real tree offline exit 0; online match for excalidraw.com and npm `next`
- AC-4: PASS | `pnpm test:adapter` (24 checks), root `tsc --noEmit` after build | match/newer/different/unavailable/timeout/cache reuse/401/403/405 covered; `/api/system/update` unchanged
- AC-5: PASS | `test:unit` (16 new tests, 13 red first), frontend build | row states, managed auth row without Disable, local mode intact; `0.18.0-4ce8305` inlined
- AC-6: PASS | documented scripts/paths/links verified, `git diff --check`, identity scan | README, `docs/ADAPTATION.md`, `docs/UPDATES.md`, `AGENTS.md` updated; no Site identity
- AC-7: PASS | CI-equivalent suite steps 1-10 and 12 exit 0; root lint by owning-package boundaries (`pnpm exec eslint . --ignore-pattern dist --ignore-pattern .next --ignore-pattern "frontend/**" --ignore-pattern "public/**"`: zero findings on branch-changed root lines; frontend judged by its own lint, exit 0); real-browser smoke a-k | all smoke steps observed; 0 third-party requests; console clean after the subset-worker chunking fix in `frontend/vite.config.ts` (pre-existing on `main` with 0.18.1)
- Source: .thoth/specs/editor-integration/spec.md | absent
- Source: .thoth/specs/settings-advanced/spec.md | absent

## Closeout

Accepted value: Archive: `READY`. Put notes on separate lines below the field.

**Archive**: READY
