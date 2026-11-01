# Change: spanish-ui

**Classification**: substantial
**Scope**: coordinated
**Uncertainty**: medium
**Risk**: medium

## Exploration

Evidence gathered 2026-11-01 (Explorer x2) on `main` b179caa.

- Dictionary: `frontend/src/i18n.ts:1-55` holds 21 keys for `en` and `zh-CN` (sidebar + one Settings key); lookup `messages[locale][key]` with English fallback; any locale not starting with `zh` resolves to English, so `es-ES` shows English. Consumers: `components/Sidebar.tsx`, `components/sidebar/SidebarFooter.tsx`, `pages/settings/SettingsMainGrid.tsx`. The dictionary pattern comes from upstream ExcaliDash (commit `e6646fd`).
- Locale flow: `context/LocaleProvider.tsx:9-16` resolves the dashboard locale (initial `navigator.language`, else `en`) and sets `document.documentElement.lang` (the only runtime `lang` writer). `context/PreferencesContext.tsx:16-58,123-175` stores a shared `language` preference (localStorage mirror + `/api/auth/preferences`, `server/api.ts:92`). The same preference reaches the editor as `langCode` (`pages/Editor.tsx:60-63` -> `pages/editor/EditorView.tsx:320,343,358` -> `HistoryPreviewCanvas.tsx:35`). `components/LanguageSelector.tsx:6-23,39,58,73-78` uses Excalidraw's `useI18n`/`languages` and browser detection. `pages/settings/SettingsMainGrid.tsx:66-85` offers only English/中文 and shows other values as "<code> (editor language)".
- Editor: the pinned `@excalidraw/excalidraw@0.18.0-4ce8305` ships `es-ES` (`dist/prod/locales/es-ES-*.js`, 96 % translated per the package) and the chunk is present in `frontend/dist/assets` and `public/assets`.
- Reachability on Sites (`frontend/src/App.tsx:69-129`, `ProtectedRoute.tsx:48-112`): reachable — Dashboard (`/`, `/collections`), Editor (`/editor/:id`, `/shared/:id` owner-only), Settings, Profile (linked from `SidebarFooter.tsx:138-150`; name update supported at `server/api.ts:93`; password/email controls hidden in enforced mode, `Profile.tsx:247,331`). Not reachable through Sites navigation: Admin (USER role, redirect), Login/Register (OIDC redirect), AuthSetupChoice (redirects), password-reset pages (directly addressable but unsupported), ApiKeysCard (not rendered), `StorageManageModal` (gated by `s3Enabled:true`; adapter returns `false`, `server/api.ts:112`). Share notices `ShareModal.tsx:28-32` and `ShareCollectionModal.tsx:20` are reachable (3 strings each).
- Hardcoded inventory (approximate) for reachable UI, `frontend/src/`:
  - Area A shell/dashboard: `components/Layout.tsx`, `Sidebar.tsx`, `sidebar/SidebarFooter.tsx`, `sidebar/SidebarContextMenu.tsx`, `sidebar/SidebarItem.tsx`, `DrawingCard.tsx`, `drawing-card/CollectionMoveOptions.tsx`, `drawing-card/CollectionPicker.tsx`, `drawing-card/DrawingCardContextMenu.tsx`, `ShareCollectionModal.tsx`, `pages/Dashboard.tsx`, `pages/dashboard/DashboardPanels.tsx`, `DashboardToolbar.tsx`, `NewDrawingControl.tsx`, `useDashboardCollectionActions.ts`, `useDashboardData.ts`, `useDashboardDrawingActions.ts`, `useDashboardSort.tsx` (~120-160 strings).
  - Area B editor: `pages/editor/EditorView.tsx`, `EditorDialogs.tsx`, `HistoryPreviewCanvas.tsx`, `droppedImages.ts`, `useEditorCommands.ts`, `useEditorPersistence.ts`, `useEditorSceneLoader.ts`, `useEditorCollaboration.ts`, `useLibraryImportFromUrl.ts`, `components/HistoryPanel.tsx`, `GridStepSelector.tsx`, `ShareModal.tsx` (~70-90).
  - Area C settings/profile: `pages/Settings.tsx`, `settings/SettingsMainGrid.tsx`, `AdvancedSettings.tsx`, `EditorStatusRow.tsx`, `SettingsConfirmModals.tsx`, `UpdateSettingsCard.tsx`, `pages/Profile.tsx` and the profile cards it renders on Sites (~110-140).
  - Area D import/upload + shared controls: `utils/importUtils.ts`, `utils/importHelpers.ts`, `utils/rehydrateFiles.ts`, `utils/imageCompression.ts`, `context/UploadContext.tsx`, `components/UploadStatus.tsx`, `context/AuthContext.tsx` (active failure messages), `ProtectedRoute.tsx`, `AuthStatusErrorPanel.tsx`, `ConfirmModal.tsx`, `LanguageSelector.tsx`, `PlayfulSelect.tsx`, `UserAvatar.tsx`, `api/drawings.ts` (~60-90).
- Interpolation/plurals: counts (selected/total drawings, uploads, import results, backup totals, history versions), `file(s)`/`drawing(s)`/`collection(s)` (`AdvancedSettings.tsx:138`, `SettingsConfirmModals.tsx:234`), names/search terms (`DashboardPanels.tsx:185`), `{filename}: {error}` import errors, sizes (`SettingsMainGrid.tsx:135`), percentages, relative times (`HistoryPanel.tsx:20-26`).
- Formatting: `DrawingCard.tsx:4,271` date-fns `formatDistanceToNow` without locale + literal `" ago"`; `HistoryPanel.tsx:20-26,252` custom relative strings + default `toLocaleString()`; `share-modal/shareUtils.ts:68` default locale; `EditorStatusRow.tsx:14-20` forced `en-US`/UTC; no `Intl` helpers or pluralization utility exist.
- Server errors: `server/api.ts:55` serializes failures as `{error: string}` with English messages and no `code` field (catalogue of ~50 messages incl. `VERSION_CONFLICT`, size limits, `SITE_PRIVATE`, `FEATURE_UNAVAILABLE`, `AUTH_MANAGED_BY_SITES`). Frontend shows them verbatim through `utils/getApiErrorMessage.ts:3-15` and direct reads in `utils/importUtils.ts:97-98,281-282`, `pages/Settings.tsx:152,181,255,291`, `pages/settings/SettingsConfirmModals.tsx:134-135,265-266`, `pages/editor/useEditorSceneLoader.ts:251-252`. Server-created names "Untitled Drawing" (`server/api.ts:82`) and " (copy)" (`:147`) are persisted data.
- HTML: the Worker serves the generated SPA HTML (`worker/index.ts:2,7-8` from `frontend/index.html`, static `lang="en"`); `app/layout.tsx` is not served to users.
- Tests: `frontend/vitest.config.ts:6-7` uses a Node environment; no test sets `navigator.language`; `settings-advanced.test.tsx` asserts 16 English strings; `editor-history-sharing.test.tsx` renders `EditorView`, `EditorDialogs`, history and share labels (`:217,392,562-571,609`) with `langCode="en"`.
- Constraint: root AGENTS.md asks for minimal upstream `frontend/src` diffs; translating reachable UI necessarily edits ~45 upstream-retained files.

## Intent

Make every screen reachable on ChatGPT Sites usable in Spanish, defaulting to the browser language, by extending the existing upstream-style dictionary (no new i18n library), localizing dates and numbers, translating server error messages through stable codes, and letting the editor follow the same language. English remains the fallback and Chinese keeps its existing keys with English fallback.

## Non-goals

- Translating pages not reachable through Sites navigation: Login, Register, AuthSetupChoice, password-reset pages, Admin, ApiKeysCard, `StorageManageModal`, and inactive upstream share/auth branches.
- Completing Excalidraw's own missing editor translations (the package's `es-ES` is 96 %).
- Translating user content or persisted names created by the server ("Untitled Drawing", " (copy)").
- Adding an i18n library, adding languages beyond `es`, or completing `zh-CN` beyond its existing keys.
- Changing API status codes, `error` message texts, persisted formats or routes; contributing upstream.

## Acceptance

- AC-1: The dictionary supports `en`, `es` and `zh-CN` with `{name}` interpolation, a plural helper based on `Intl.PluralRules`, a compile-time check that `es` defines every English key, and English fallback for missing `zh-CN` keys; locales starting with `es` resolve to Spanish; the first visit follows `navigator.language`; `<html lang>` matches the resolved locale (while the editor is mounted Excalidraw writes its own `langCode`, e.g. `es-ES`, and leaving the editor restores the resolved locale); Settings offers English, Español and 中文 and choosing Español stores `es-ES` so the editor uses Excalidraw's `es-ES`; locale-aware helpers format absolute dates, relative times, numbers and byte sizes; frontend tests cover resolution, fallback, interpolation, plurals and formatting.
- AC-2: Every adapter error response carries a stable `code` from a documented catalogue next to the unchanged `error` text and status; adapter tests assert codes for representative errors; the frontend shows the translated message for known codes and the server text otherwise.
- AC-3: Area A (shell, sidebar, dashboard, drawing cards, collections, collection share notice) renders no hardcoded English user-visible text, with Spanish and English messages and locale-aware dates.
- AC-4: Area B (editor chrome, dialogs, history panel, save/load states, library import, share notice, grid step) renders no hardcoded English user-visible text, with Spanish and English messages and locale-aware times.
- AC-5: Area C (Settings incl. Advanced, Excalidraw editor row, confirm modals, update card, and Profile's Sites-visible parts) renders no hardcoded English user-visible text, with locale-aware dates and plurals; existing tests updated to the new contract.
- AC-6: Area D (import/export/backup and upload flows, shared controls, auth/route error panels, API client errors) renders no hardcoded English user-visible text, including interpolated import errors.
- AC-7: `AGENTS.md`, `README.md` and `docs/ADAPTATION.md` describe the Spanish UI, the dictionary convention for new strings and the error-code catalogue.
- AC-8: On the integrated tree the CI-equivalent suite and frontend lint pass, root lint has no new findings on changed lines, and a real-browser smoke with an `es-ES` browser shows Spanish across dashboard, collections, editor (incl. history and dialogs), Settings, Profile, import/export and an error toast, switches to English and back from Settings (editor included) without reload errors, keeps `<html lang>` in sync, and leaves the console free of new errors.

## Clarifications

- Scope (user, 2026-11-01): translate only what is used on Sites. Profile is reachable and linked, so its Sites-visible parts are included; directly addressable but unsupported pages and the unreachable storage modal stay English.
- Default language (user): follow the browser language; each user can change it in Settings and it persists.
- Approach (user): extend the existing dictionary; no i18n library.
- Chinese (user): keep existing `zh-CN` keys with English fallback for new keys.

## Decisions

- Messages are split into per-area modules (one writer per area) merged by `frontend/src/i18n.ts`, which keeps its public API for existing consumers.
- Spanish completeness is enforced by TypeScript (`es` typed against the English module shape); `zh-CN` is a partial overlay.
- Settings stores the editor-compatible code (`es-ES`, `en`, `zh-CN`) so the app locale and editor `langCode` share one preference.
- Server errors keep status and English `error`; a central message-to-code map at the serializer adds `code`, so existing clients keep working.
- Neutral, informal Spanish ("tú") consistent with Excalidraw's `es-ES` wording; technical names (ExcaliDash, Excalidraw, ChatGPT Sites, `.excalidash`) stay untranslated.
- Area units run focused checks without concurrent `tsc -b`; whole-project checks run in AC-8.
- AC-8 smoke found that Excalidraw sets `document.documentElement.lang` to its `langCode` (`es-ES`) when the editor loads and nothing reset it afterwards. Excalidraw keeps ownership while mounted (same language, more specific tag); the editor restores the app's resolved locale on unmount. The Spanish sort labels are shortened because "Fecha de modificación" was truncated in the dashboard sort control.
- AC-8 rerun showed that `pages/Settings.tsx` always renders `ApiKeysCard`, contrary to the exploration's assumption. On Sites the API answers 409 `AUTH_MANAGED_BY_SITES`, so the card showed English controls and a raw English error (already the case before this change). The user chose to hide the card when `authMode === "oidc_enforced"`, the same rule Profile already applies to password controls. The card stays untranslated and unchanged for `local`/`hybrid`.
- Final verification round 1 found that backup metadata with a missing or invalid `exportedAt` crashed the Settings import confirmation, because `Intl.DateTimeFormat` throws (`RangeError`). The adapter accepts such metadata, and that behavior stays unchanged. The `format.ts` date helpers now return an empty string for invalid input, and the confirmation shows a localized "Unknown date" / "Fecha desconocida". `DrawingCard`'s `formatDistanceToNow` already threw on invalid dates before this change and stays unchanged.

## Durable deltas

- `ADDED localization` **Spanish user interface** — Every screen reachable on ChatGPT Sites MUST render its application text in Spanish when the resolved locale is Spanish, falling back to English only for keys absent from a partial locale.
  - GIVEN a user whose browser language is `es-ES` and who has no stored language preference; WHEN they open the dashboard, an editor and Settings; THEN application text and `<html lang>` are Spanish and the editor uses Excalidraw's `es-ES` locale.
- `ADDED localization` **Localized API errors** — Adapter error responses MUST include a stable `code`, and the frontend MUST show a localized message for known codes while preserving the server text for unknown ones.
  - GIVEN the Spanish locale; WHEN a backup upload exceeds the archive size limit; THEN the response carries `code` `ARCHIVE_UPLOAD_TOO_LARGE` and the UI shows the Spanish message.
- `ADDED settings-advanced` **API keys hidden under managed authentication** — When authentication is managed by ChatGPT Sites (`authMode` `oidc_enforced`), Settings MUST NOT render API-key management or request API keys; `local` and `hybrid` modes keep the API-key card.
  - GIVEN a Sites user whose auth status reports `authMode` `oidc_enforced`; WHEN they open Settings; THEN no API-key card is shown and no API-key list request is made.

## Plan

1. Infrastructure (AC-1): refactor `frontend/src/i18n.ts` into a merger of per-area modules under `frontend/src/locales/` (`common`, `dashboard`, `editor`, `settings`, `importExport`, `errors`), each exporting `en`, `es` and optional `zh-CN`; keep `t`/existing hook API; add interpolation and `plural()`; resolve `es*`; update `LocaleProvider` and locale context; add `frontend/src/locales/format.ts` (`Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.NumberFormat`, byte formatting) and date-fns locale mapping if date-fns stays; `getApiErrorMessage` translates `code` via the `errors` module with server-text fallback. Delivers empty area modules with the agreed names so area units can start. Tests first.
2. Server codes (AC-2): central `message -> code` map applied in the `server/api.ts` error serializer (`{error, code}`), catalogue exported/documented; adapter tests for representative codes (`VERSION_CONFLICT`, `ARCHIVE_UPLOAD_TOO_LARGE`, `AUTH_REQUIRED`, `SITE_PRIVATE`, `DRAWING_NOT_FOUND`) and unchanged `error`. Runs in parallel with step 1; the code list in Exploration is the contract for the `errors` module.
3. Areas A-D (AC-3..AC-6): each unit replaces hardcoded strings in its files with dictionary keys in its own module, adds Spanish (and English) texts, uses the format helpers for dates/numbers, and updates/adds focused tests. Units run in parallel after step 1; each owns only its listed files and module.
4. Docs (AC-7): AGENTS.md convention (add strings to the area module; Spanish required by types), README feature line, ADAPTATION note, error-code catalogue.
5. Integrated verification (AC-8): CI-equivalent suite, lints, and agent-browser smoke with `es-ES` and `en-US` browser locales.

Error-code contract (frozen; AC-2 implements it, AC-1 translates it; both start in parallel from this list; `server/api.ts` lines as of b179caa; any message not listed maps to `INTERNAL_ERROR` only if it is the generic 500, otherwise AC-2 stops and root extends this list before AC-1 closes):

| Code | Status | Current `error` text |
| --- | --- | --- |
| `INVALID_NAME` | 400 | Invalid name |
| `REQUEST_TOO_LARGE` | 413 | Request too large |
| `INVALID_JSON` | 400 | Invalid JSON |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `AUTH_REQUIRED` | 401 | Sign in with ChatGPT |
| `CSRF_ORIGIN_REJECTED` | 403 | CSRF origin rejected |
| `DRAWING_NOT_FOUND` | 404 | Drawing not found |
| `INVALID_COLLECTION` | 400 | Invalid collection |
| `COLLECTION_NOT_FOUND` | 404 | Collection not found |
| `SCENE_UNAVAILABLE` | 500 | Scene file unavailable |
| `INVALID_FILES` | 400 | Invalid files |
| `INVALID_FILE_ID` | 400 | Invalid file ID |
| `INVALID_FILE` | 400 | Invalid file |
| `INVALID_IMAGE` | 400 | Invalid image |
| `IMAGE_TOO_LARGE` | 413 | Image too large |
| `UNTRUSTED_IMAGE_REFERENCE` | 400 | Untrusted image reference |
| `IMAGE_MISSING` | 400 | Image is missing |
| `INVALID_ELEMENTS` | 400 | Invalid elements |
| `INVALID_APP_STATE` | 400 | Invalid appState |
| `VERSION_CONFLICT` | 409 | VERSION_CONFLICT |
| `AUTH_MANAGED_BY_SITES` | 409 | Authentication is managed by ChatGPT Sites |
| `METHOD_NOT_ALLOWED` | 405 | Method not allowed |
| `INVALID_LIBRARY` | 400 | Invalid library |
| `SITE_PRIVATE` | 409 | This personal Site is private; use Sites access settings to change its audience |
| `FILE_NOT_FOUND` | 404 | File not found |
| `BACKUP_IMAGE_MISSING` | 500 | Backup image missing |
| `ARCHIVE_REQUIRED` | 400 | Archive required |
| `ARCHIVE_UPLOAD_TOO_LARGE` | 413 | Archive too large (20 MB maximum) |
| `INVALID_ARCHIVE` | 400 | Invalid archive |
| `ARCHIVE_TOO_MANY_ENTRIES` | 413 | Archive has too many entries |
| `UNSAFE_ARCHIVE_PATH` | 400 | Unsafe archive path |
| `ARCHIVE_EXPANDED_TOO_LARGE` | 413 | Archive expands beyond 40 MB |
| `MANIFEST_MISSING` | 400 | Missing manifest |
| `INVALID_MANIFEST` | 400 | Invalid manifest |
| `ARCHIVE_CONTENT_TOO_LARGE` | 413 | Archive too large |
| `DUPLICATE_MANIFEST_IDS` | 400 | Duplicate manifest IDs |
| `UNSAFE_DRAWING_PATH` | 400 | Unsafe drawing path |
| `DRAWING_MISSING_FROM_ARCHIVE` | 400 | Missing drawing |
| `DRAWING_TOO_LARGE` | 413 | Drawing too large |
| `INVALID_DRAWING_JSON` | 400 | Invalid drawing JSON |
| `INVALID_DRAWING` | 400 | Invalid drawing |
| `INVALID_SESSION` | 400 | Invalid session |
| `INVALID_EVENT` | 400 | Invalid event |
| `EVENT_TOO_LARGE` | 413 | Event too large |
| `INVALID_IMAGE_TYPE` | 400 | Invalid image type |
| `SNAPSHOT_NOT_FOUND` | 404 | Snapshot not found |
| `IMAGE_UNAVAILABLE` | 500 | Image unavailable |
| `FEATURE_UNAVAILABLE` | 409 | This feature is unavailable on this private personal Site |
| `ENDPOINT_NOT_FOUND` | 404 | Endpoint not found |

`Archive too large (20 MB maximum)` and `Archive too large` are distinct texts with distinct codes; mapping is by exact text. The frontend translates by `code` and falls back to the server `error` text for unknown or missing codes.

Mutable surfaces: step 1 owns `frontend/src/i18n.ts`, `frontend/src/locales/**` skeleton and `format.ts`, `context/LocaleProvider.tsx`, `context/localeContext.ts`, `context/useLocale.ts`, `utils/getApiErrorMessage.ts`, `frontend/src/locales/errors.ts`, new infra tests; step 2 owns `server/api.ts`, `tests/adapter.integration.mjs`; step 3 units own their area files and `frontend/src/locales/<area>.ts` plus their tests (Area C also owns `settings-advanced.test.tsx`; Area B owns `editor-history-sharing.test.tsx`). Area units do not edit `i18n.ts`, other modules or shared controls owned by another area; a missing shared key is requested from root. Ownership is directory-based so no reachable file lacks a writer: Area A owns `components/Layout.tsx`, `components/Sidebar.tsx`, `components/sidebar/**`, `components/DrawingCard.tsx`, `components/drawing-card/**` (storage branch untouched), `components/ShareCollectionModal.tsx`, `pages/Dashboard.tsx`, `pages/dashboard/**`; Area B owns `pages/Editor.tsx`, `pages/editor/**` (including `useEditorCanvasHandlers.ts`, whose drop handler shows "Failed to import dropped images"), `components/HistoryPanel.tsx`, `components/GridStepSelector.tsx`, `components/ShareModal.tsx`; Area C owns `pages/Settings.tsx`, `pages/settings/**`, `pages/Profile.tsx`, `pages/profile/**` (only branches rendered on Sites); Area D owns `utils/**` except `utils/getApiErrorMessage.ts`, `api/**`, `context/UploadContext.tsx`, `context/AuthContext.tsx`, and every other reachable `components/**` file not assigned to A or B (e.g. `UploadStatus.tsx`, `ProtectedRoute.tsx`, `AuthStatusErrorPanel.tsx`, `ConfirmModal.tsx`, `LanguageSelector.tsx`, `PlayfulSelect.tsx`, `UserAvatar.tsx`); excluded unreachable files (`StorageManageModal.tsx`, `components/share-modal/**` inactive upstream bodies, Login/Register/AuthSetupChoice/password-reset/Admin pages, `pages/profile/ApiKeysCard.tsx`) stay untouched. Each area's grep check covers its whole owned set with a reviewed list of allowed technical/content strings, plus targeted Spanish render or message assertions.

Test fixtures: AC-1 makes the locale hook return the English default when no provider is mounted (so existing Node-rendered tests keep working) and provides a test helper to render under a chosen locale; area tests use it for Spanish assertions and stub browser globals explicitly where needed. Focused frontend type check for area units: `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.app.json --noEmit --incremental false` (no shared build-info writes).

Risks: mistranslation or truncated layouts in narrow UI (smoke covers both themes and a narrow viewport); hidden English in rarely triggered errors (code catalogue and grep checks); increased upstream diff (accepted); concurrent frontend checks (area units avoid `tsc -b`, use `tsc --noEmit` against the app config with incremental off).

## Tasks

- [x] AC-1: Build the localized dictionary infrastructure and format helpers
  - Outcome: `es` locale, interpolation, plurals, typed completeness, locale resolution, `<html lang>`, Settings-compatible codes, format helpers and code-aware error helper with tests
  - Known entrypoints and skill paths: `frontend/src/i18n.ts`, `frontend/src/context/LocaleProvider.tsx`, `frontend/src/context/localeContext.ts`, `frontend/src/context/useLocale.ts`, `frontend/src/context/PreferencesContext.tsx` (read), `frontend/src/utils/getApiErrorMessage.ts`; skills `tdd`, `typescript-advanced-types`, `simplify`
  - Inputs: Exploration (dictionary, locale flow, formatting, error catalogue)
  - Dependencies: none
  - Output: refactored `i18n.ts`, `frontend/src/locales/{common,dashboard,editor,settings,importExport,errors}.ts` (`errors` complete for the frozen contract), `frontend/src/locales/format.ts`, updated locale provider/context with provider-less English default, a locale test helper, error helper, `frontend/tests/i18n.test.tsx`
  - Owner: thoth-worker
  - Writes: `frontend/src/i18n.ts`, `frontend/src/locales/**`, `frontend/src/context/LocaleProvider.tsx`, `frontend/src/context/localeContext.ts`, `frontend/src/context/useLocale.ts`, `frontend/src/utils/getApiErrorMessage.ts`, `frontend/tests/i18n.test.tsx`, `frontend/package.json`/`package-lock.json` only if a date-fns locale import needs no new dependency (no new packages)
  - Interface boundaries: existing `t`/hook API used by Sidebar, SidebarFooter and SettingsMainGrid keeps working; locale hook returns the English default without a provider; preference storage format unchanged; `errors.ts` translates every code in the frozen error-code contract
  - Focused check and PASS evidence: new tests red then green; frontend `tsc -b`, `lint`, `test:unit` exit 0
  - Return milestone: infrastructure merged with empty area modules and documented helper API
  - Stop / reassessment: need for a new dependency or a preference format change
- [x] AC-2: Add stable error codes to adapter error responses
  - Outcome: `{error, code}` for every adapter error with unchanged status and text
  - Known entrypoints and skill paths: `server/api.ts` (serializer near `:55`), `tests/adapter.integration.mjs`; skills `tdd`, `workers-best-practices`
  - Inputs: frozen error-code contract in Plan
  - Dependencies: none
  - Output: code map implementing exactly the frozen contract, serializer change, adapter tests
  - Owner: thoth-worker
  - Writes: `server/api.ts`, `tests/adapter.integration.mjs`
  - Interface boundaries: status codes, `error` strings and success responses unchanged
  - Focused check and PASS evidence: `pnpm test:adapter` exits 0 with new code assertions; root `tsc --noEmit` exits 0 after a build
  - Return milestone: adapter tests green
  - Stop / reassessment: an error path that cannot be mapped centrally or a message missing from the frozen contract
- [x] AC-3: Localize Area A (shell, sidebar, dashboard, drawing cards, collections)
  - Outcome: Area A renders Spanish/English from the dictionary with locale-aware dates
  - Known entrypoints and skill paths: Area A owned set in Plan; `frontend/src/locales/dashboard.ts`; skills `tdd`, `simplify`
  - Inputs: accepted AC-1 helper API and module
  - Dependencies: AC-1 unit accepted
  - Output: updated Area A files, `dashboard` module texts, focused tests
  - Owner: thoth-worker
  - Writes: Area A owned set, `frontend/src/locales/dashboard.ts`, new `frontend/tests/i18n-dashboard.test.tsx`
  - Interface boundaries: shared controls and other modules owned elsewhere
  - Focused check and PASS evidence: grep shows no remaining English UI literals in Area A files (reviewed list of allowed technical strings); focused vitest files and app `tsc --noEmit` pass
  - Return milestone: Area A complete
  - Stop / reassessment: a needed key belongs to another area's module
- [x] AC-4: Localize Area B (editor chrome, dialogs, history, share notice, grid step)
  - Outcome: Area B renders Spanish/English from the dictionary with locale-aware times
  - Known entrypoints and skill paths: Area B owned set in Plan (incl. `pages/editor/useEditorCanvasHandlers.ts`); `frontend/src/locales/editor.ts`; skills `tdd`, `simplify`
  - Inputs: accepted AC-1 helper API and module
  - Dependencies: AC-1 unit accepted
  - Output: updated Area B files, `editor` module texts, updated `editor-history-sharing.test.tsx`
  - Owner: thoth-worker
  - Writes: Area B owned set, `frontend/src/locales/editor.ts`, `frontend/tests/editor-history-sharing.test.tsx`, other `frontend/tests/editor-*.test.tsx` only where a translated string is asserted, new `frontend/tests/i18n-editor.test.tsx`
  - Interface boundaries: editor scene/persistence behavior unchanged; only text changes
  - Focused check and PASS evidence: grep check on Area B files; focused vitest files and app `tsc --noEmit` pass
  - Return milestone: Area B complete
  - Stop / reassessment: text change requires behavior change in save/collaboration logic
- [x] AC-5: Localize Area C (Settings, Advanced, editor row, confirm modals, update card, Profile)
  - Outcome: Area C renders Spanish/English with locale-aware dates and plurals; Settings language options include Español
  - Known entrypoints and skill paths: Area C owned set in Plan; `frontend/src/locales/settings.ts`; skills `tdd`, `simplify`
  - Inputs: accepted AC-1 helper API and module
  - Dependencies: AC-1 unit accepted
  - Output: updated Area C files, `settings` module texts, updated `settings-advanced.test.tsx`
  - Owner: thoth-worker
  - Writes: Area C owned set, `frontend/src/locales/settings.ts`, `frontend/tests/settings-advanced.test.tsx`, new `frontend/tests/i18n-settings.test.tsx`
  - Interface boundaries: `/api/system/editor` and preference contracts unchanged
  - Focused check and PASS evidence: grep check on Area C files; focused vitest files and app `tsc --noEmit` pass
  - Return milestone: Area C complete
  - Stop / reassessment: Profile branches visible on Sites differ from Exploration
- [x] AC-6: Localize Area D (import/export/upload, shared controls, auth/route errors, API client)
  - Outcome: Area D renders Spanish/English including interpolated import errors
  - Known entrypoints and skill paths: Area D owned set in Plan; `frontend/src/locales/importExport.ts` and `common.ts`; skills `tdd`, `simplify`
  - Inputs: accepted AC-1 helper API and modules
  - Dependencies: AC-1 unit accepted
  - Output: updated Area D files, module texts, focused tests
  - Owner: thoth-worker
  - Writes: Area D owned set, `frontend/src/locales/importExport.ts`, `frontend/src/locales/common.ts`, new `frontend/tests/i18n-import.test.tsx`
  - Interface boundaries: import/backup formats and API calls unchanged
  - Focused check and PASS evidence: grep check on Area D files; focused vitest files and app `tsc --noEmit` pass
  - Return milestone: Area D complete
  - Stop / reassessment: shared control used by another area needs a different API
- [x] AC-7: Document the Spanish UI and the dictionary convention
  - Outcome: docs match the implementation
  - Known entrypoints and skill paths: `AGENTS.md`, `README.md`, `docs/ADAPTATION.md`; skill `documentation-writer`
  - Inputs: accepted AC-1..AC-6
  - Dependencies: AC-1..AC-6 units accepted
  - Output: updated docs
  - Owner: thoth-worker
  - Writes: `AGENTS.md`, `README.md`, `docs/ADAPTATION.md`
  - Interface boundaries: no personal Site identity
  - Focused check and PASS evidence: paths/scripts exist; `git diff --check` clean
  - Return milestone: docs updated
  - Stop / reassessment: behavior differs from accepted outputs
- [x] AC-8: Verify the integrated tree with the CI suite and a Spanish/English browser smoke
  - Outcome: evidence the change works end to end
  - Known entrypoints and skill paths: `.github/workflows/sites-ci.yml`, `package.json`, `frontend/package.json`; skill `agent-browser`
  - Inputs: accepted AC-1..AC-7
  - Dependencies: all other units accepted
  - Output: command outcomes, smoke evidence (screenshots outside the repo)
  - Owner: thoth-worker
  - Writes: none
  - Interface boundaries: development identity only; no hosted Site access
  - Focused check and PASS evidence: suite exits 0; root lint no new findings on changed lines; smoke steps observed in `es-ES` and `en-US`
  - Return milestone: suite and smoke complete
  - Stop / reassessment: any failure returns evidence to root

## Authorization

Accepted values: Plan review: `OKAY | SKIPPED`; Plan review selection:
`EXPLICIT_REVIEW | EXPLICIT_SKIP | DEFAULT_REVIEW_AFTER_3`; Implementation:
`AUTHORIZED`. Put notes on separate lines below the fields, never on field lines.

**Plan review**: OKAY
**Plan review selection**: EXPLICIT_REVIEW
**Implementation**: AUTHORIZED

Implementation authorized explicitly by the user on 2026-11-01 after the OKAY; work on branch `feat/spanish-ui`.

Plan review round 1 (subtask_thoth-oracle_1793512951629_c1952baf): REJECT (unfrozen error-code contract; unowned `useEditorCanvasHandlers.ts`); repaired in the same record.
Plan review round 2 (subtask_thoth-oracle_1793513233029_ed8b983f): OKAY, valid gate verdict, recordSha256 1622d47ca8a149923c80d5c3d822de4ec7ce158bc65cdbd5cd689109ab624cd6 (recordDigest match).
Nonblocking cautions carried into implementation: `AuthProvider` sits above `LocaleProvider` and import utilities run outside React, so resolve their messages at locale-aware consumers or through a non-React locale accessor from AC-1, with Spanish failure-path tests; blob-configured backup export requests must decode JSON error bodies before code translation, with a failure assertion.

## Verification

Accepted values: Reviewer: `oracle`; Independent from implementer: `Yes`;
Verdict: `PASS`; Reviewed record SHA-256: 64 lowercase hex characters hashing
exact UTF-8 bytes before the case-sensitive `## Authorization` heading. Use
exactly one SHA field line; put notes on separate lines below the fields.

**Reviewer**: oracle
**Independent from implementer**: Yes
**Verdict**: PASS
**Reviewed record SHA-256**: dc35f5aa4be59b624db6aa38f4c707749522c7d2bca25531b241ddecfa50a3b7

Final verification round 2 (subtask_thoth-oracle_1793521362476_b86f4638) returned PASS. Gate verdict: valid:true, kind final-verification, mode record, recordDigest match, recordSha256 dc35f5aa4be59b624db6aa38f4c707749522c7d2bca25531b241ddecfa50a3b7. The reviewer was a fresh read-only Oracle that took part in neither implementation nor earlier reviews.

**Oracle envelope**:

```thoth-result
{
  "schemaVersion": 1,
  "role": "oracle",
  "status": "complete",
  "conclusion": "PASS. AC-1 through AC-8 are satisfied within the stated Sites scope. The invalid-backup-date repair is correct; no blocking localization gaps or new behavioral regressions were found.",
  "evidence": [
    {
      "id": "E1",
      "kind": "snapshot",
      "locator": "git status; git diff main; specified untracked files",
      "claim": "Reviewed the actual working-tree implementation and tests over b179caa. Final review-input fingerprint remained unchanged: 63eb13ad2b5b00e8991446e34ca60872f973ac1dcbd7960acc2766090aab4e59.",
      "basis": "observed",
      "uncertainty": ""
    },
    {
      "id": "E2",
      "kind": "governance",
      "locator": ".thoth/changes/spanish-ui/spanish-ui.md; bundled validate.mjs --through verify",
      "claim": "Structural validation passed. Canonical source baseline matches; API-key hiding is distinct from the existing Advanced authentication-description requirement.",
      "basis": "observed",
      "uncertainty": ""
    },
    {
      "id": "E3",
      "kind": "localization",
      "locator": "frontend/src/i18n.ts; frontend/src/locales/**; LocaleProvider; useRestoreDocumentLanguage",
      "claim": "362 English/Spanish keys have matching placeholders and no collisions. Resolution, fallback, interpolation, plurals, preference codes and document-language restoration are implemented and tested.",
      "basis": "observed",
      "uncertainty": ""
    },
    {
      "id": "E4",
      "kind": "regression",
      "locator": "frontend/src/locales/format.ts:6-67; frontend/src/pages/settings/SettingsConfirmModals.tsx:235; frontend/tests/i18n-settings.test.tsx",
      "claim": "Missing/invalid backup dates render localized unknown-date text. Independent boundary checks passed for all date helpers in en/es/zh-CN, including extreme invalid dates and valid epoch zero. HistoryPanel uses the guarded helpers; EditorStatusRow retains its guard.",
      "basis": "observed",
      "uncertainty": ""
    },
    {
      "id": "E5",
      "kind": "contract",
      "locator": "server/api.ts; server/error-codes.ts; tests/adapter.integration.mjs",
      "claim": "All 49 frozen message/code pairs match. All 59 assert/HttpError expressions are unchanged from main. Server changes are confined to typed catalogue enforcement and additive serialization; identity, ownership, storage and status/text behavior remain unchanged.",
      "basis": "observed",
      "uncertainty": "Adapter execution evidence was reused rather than rerun."
    },
    {
      "id": "E6",
      "kind": "execution",
      "locator": "frontend test:unit; frontend/root TypeScript; frontend/root ESLint",
      "claim": "Fresh checks: 279 tests passed across 14 files; frontend and root TypeScript passed; frontend lint passed. Root lint has exactly the main-equivalent 38 errors and one warning, with identical rule/message/severity multisets and no additional paths.",
      "basis": "observed",
      "uncertainty": ""
    },
    {
      "id": "E7",
      "kind": "artifact",
      "locator": "C:/Users/EremesNG/AppData/Local/Temp/es-smoke-3/",
      "claim": "Reviewed CI logs, browser report, language/preference observations and representative Spanish, English, history, error and narrow-layout screenshots. Build and 29 adapter checks passed. All 590 tracked smoke manifests agree; only SettingsConfirmModals differs from the current tracked source.",
      "basis": "observed",
      "uncertainty": "Browser/build artifacts precede the narrow date repair; untracked files were not covered by those manifests."
    },
    {
      "id": "E8",
      "kind": "scope-and-docs",
      "locator": "AGENTS.md; README.md; docs/ADAPTATION.md; reachable frontend routes and controls",
      "claim": "Reviewed UI literals against adapter reachability and exclusions. Remaining English belongs to excluded/inactive branches, technical names or content. Documentation matches implementation; public-source and offline editor-consistency checks passed; git diff --check was clean.",
      "basis": "observed",
      "uncertainty": ""
    }
  ],
  "verification": [
    {
      "check": "AC-1",
      "method": "Infrastructure inspection, dictionary parity checks and passing locale/formatting tests",
      "outcome": "pass",
      "evidenceIds": ["E3", "E4", "E6"],
      "reason": "Locale selection, fallback, formatting and document-language ownership satisfy the contract."
    },
    {
      "check": "AC-2",
      "method": "Frozen catalogue comparison, main comparison and adapter artifact review",
      "outcome": "pass",
      "evidenceIds": ["E5", "E7"],
      "reason": "Stable codes are additive; existing error statuses/texts are preserved."
    },
    {
      "check": "AC-3",
      "method": "Area A diff/literal audit, interaction tests and screenshot review",
      "outcome": "pass",
      "evidenceIds": ["E6", "E7", "E8"],
      "reason": "Shell, dashboard, collections and cards are localized."
    },
    {
      "check": "AC-4",
      "method": "Editor diff/literal audit, regression tests and browser artifacts",
      "outcome": "pass",
      "evidenceIds": ["E1", "E4", "E6", "E7"],
      "reason": "Editor text and history times are localized without changing scene/save/collaboration behavior."
    },
    {
      "check": "AC-5",
      "method": "Settings/Profile interaction tests and repair verification",
      "outcome": "pass",
      "evidenceIds": ["E4", "E6", "E7"],
      "reason": "Visible controls, errors, plurals and dates are localized; managed-auth API-key requests are suppressed."
    },
    {
      "check": "AC-6",
      "method": "Import/upload/shared-control audit and failure-path tests",
      "outcome": "pass",
      "evidenceIds": ["E3", "E6", "E8"],
      "reason": "Includes interpolated import failures, code translation and Blob JSON error decoding."
    },
    {
      "check": "AC-7",
      "method": "Documentation and public-source review",
      "outcome": "pass",
      "evidenceIds": ["E8"],
      "reason": "Language conventions and the error catalogue are documented without deployment identity."
    },
    {
      "check": "AC-8",
      "method": "Fresh non-build checks plus reviewed CI/browser artifacts for unchanged inputs",
      "outcome": "pass",
      "evidenceIds": ["E1", "E6", "E7"],
      "reason": "Integrated evidence is acceptable; repair-invalidated tests and type/lint checks were rerun. No build or browser process was started by this reviewer."
    }
  ],
  "risks": [
    {
      "description": "Build/browser evidence predates the date repair. The changed helpers and confirmation are independently covered by current passing checks, but were not rebuilt or browser-resmoked during this read-only review.",
      "severity": "low",
      "blocking": false,
      "evidenceIds": ["E4", "E6", "E7"]
    },
    {
      "description": "DrawingCard still throws for invalid timestamps, as on main; this is not introduced by localization.",
      "severity": "low",
      "blocking": false,
      "evidenceIds": ["E1", "E4"]
    }
  ],
  "openQuestions": [],
  "nextAction": "Root should validate this PASS, record acceptance evidence, run closeout and then archive.",
  "review": {
    "kind": "final-verification",
    "verdict": "PASS",
    "reviewedRecord": ".thoth/changes/spanish-ui/spanish-ui.md",
    "reviewedRecordSha256": "dc35f5aa4be59b624db6aa38f4c707749522c7d2bca25531b241ddecfa50a3b7"
  }
}
```

After PASS, root pastes the Oracle's unchanged final-verification envelope here.

Final verification round 1 (subtask_thoth-oracle_1793520734009_74bfe65f) returned FAIL (valid gate verdict, recordSha256 5c67e9e19aa129da72a51c4ec8bb793c314de2b4ed4f847f86c1fa6bcf1aeff2) with one blocking finding: invalid backup `exportedAt` crashed Settings. The fix is recorded in Decisions.

- AC-1: PASS | `frontend/tests/i18n.test.tsx`, `frontend/tests/editor-document-language.test.tsx`; frontend `tsc -b` (a removed Spanish key fails with TS2741) | locale resolution, fallback, interpolation, plurals, formatting incl. invalid dates, `<html lang>` restored after the editor; Oracle E3/E4/E6
- AC-2: PASS | `pnpm test:adapter` (29 checks) | `server/error-codes.ts` maps the 49 frozen codes; statuses and texts unchanged from `main`; Oracle E5
- AC-3: PASS | `frontend/tests/i18n-dashboard.test.tsx`; smoke a | Spanish dashboard, collections, cards and untruncated sort labels; Oracle E6/E7/E8
- AC-4: PASS | `frontend/tests/i18n-editor.test.tsx`, `editor-history-sharing.test.tsx` and the editor safety suites; smoke b | Spanish editor chrome, save status, history times, dialogs and share notice; Oracle E4/E6/E7
- AC-5: PASS | `frontend/tests/i18n-settings.test.tsx`, `settings-advanced.test.tsx`; smoke c/d | Settings with Español, Advanced rows, plurals, blob export errors, API-key card hidden under `oidc_enforced`, localized unknown backup date, Profile; Oracle E4/E6/E7
- AC-6: PASS | `frontend/tests/i18n-import.test.tsx`; smoke e | interpolated import errors via the non-React accessor, upload status, auth panels below AuthProvider, "No se ha encontrado el dibujo" for `DRAWING_NOT_FOUND`; Oracle E3/E6/E8
- AC-7: PASS | `npm run check:public-source`; `git diff --check` | `AGENTS.md`, `README.md` and `docs/ADAPTATION.md` match the implementation with no deployment identity; Oracle E8
- AC-8: PASS | CI-equivalent suite, frontend lint, root lint at the `main` baseline (38 errors, 1 warning), browser smoke a–h in es-ES/en-US (evidence outside the repo) | 279 frontend tests after the repair, plus a post-repair `npm run build` and `pnpm test:adapter` run by root; Oracle E1/E6/E7
- Source: .thoth/specs/localization/spec.md | absent
- Source: .thoth/specs/settings-advanced/spec.md | sha256:58a2989a99f35344ead4c8a9977be29d340b4aa4d787212d164418880ea8e4f1

## Closeout

Accepted value: Archive: `READY`. Put notes on separate lines below the field.

**Archive**: READY
