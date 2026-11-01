# AGENTS.md

## Purpose and scope

This is the ChatGPT Sites adaptation of [ExcaliDash](https://github.com/ZimengXiong/ExcaliDash),
an Excalidraw dashboard. The deployed application uses the retained React SPA plus a
Cloudflare Worker API, D1 metadata and R2 scene storage, not the original Node backend.
The repository is LGPL-3.0; preserve upstream attribution and license notices.

Use this file for agent workflows. See [README.md](README.md) for the human-facing
introduction and [upstream.json](upstream.json) for the pinned upstream revision.
Keep upstream `frontend/src` changes minimal; prefer adapter-layer changes when possible.

## Read only the context needed for the task

Start with the named subsystem, its entrypoints and nearby tests. Expand only to
resolve a concrete missing fact; do not reread the entire repository.

| Task | Start here | Relevant code / checks |
| --- | --- | --- |
| SPA, editor, transport, upstream compatibility | [docs/ADAPTATION.md](docs/ADAPTATION.md) | `frontend/src/`, `frontend/tests/` |
| UI text, language selection, localized errors | [docs/ADAPTATION.md#localización](docs/ADAPTATION.md#localización) | `frontend/src/locales/`, `frontend/src/i18n.ts`, `server/error-codes.ts`, `frontend/tests/i18n*.test.tsx` |
| API, identity, ownership, persistence | [docs/ADAPTATION.md](docs/ADAPTATION.md) | `worker/index.ts`, `server/api.ts`, `db/`, `tests/adapter.integration.mjs` |
| Build, preview, migrations, publishing | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | `scripts/`, `vite.config.ts`, `drizzle/`, `.openai/hosting.json` |
| Original upstream behavior | [upstream-docs/](upstream-docs/) | `upstream-backend/` is reference-only; check current adapter behavior separately |

For cross-cutting changes, inspect both the frontend contract and API tests. For an
unfamiliar task, search relevant names, imports and tests before opening more files.

## Repository boundaries

| Path | Responsibility / constraint |
| --- | --- |
| Root package | Sites shell and build tooling: React 19, Next 16 via Vinext, Vite 8, Tailwind 4 |
| `frontend/` | Independently managed upstream SPA: React 18, Vite 7, Tailwind 3, Excalidraw, React Router |
| `server/`, `worker/` | Deployed API and Worker entrypoint |
| `db/`, `drizzle/` | D1 (SQLite) schema and append-only migrations |
| `components/`, `hooks/`, `lib/`, `vendor/` | Sites/shadcn scaffold, connector helpers and vendored styling |
| `tests/` | Adapter integration harness |
| `upstream-backend/` | Reference-only Express/Prisma/Socket.IO backend; not deployed |
| `upstream-docs/` | Retained original documentation; not the Sites deployment contract |

There are three independently managed packages: root, `frontend/` and
`upstream-backend/`. `pnpm-workspace.yaml` contains policy, not package globs.
Do not assume recursive workspace commands install or test the other packages.
Do not use upstream backend scripts as Sites commands: some retain stale `backend/`
paths and references to a missing root `eslint.config.js`.

## Toolchain and dependency setup

Use Node.js **>=24.22.1** (CI uses 24.22.1). There is no `.nvmrc`.
Use **pnpm 11.25.0** at the root and **npm 10.9.2** for `frontend/` and
`upstream-backend/`. Keep each package's own lockfile and package manager.
Root policy includes a seven-day minimum release age and native-build allowlist;
do not bypass these policies to make an install pass.

Run from the repository root unless noted:

```sh
pnpm install --frozen-lockfile
npx -y npm@10.9.2 --prefix frontend ci --no-audit --no-fund
```

Do not install the reference backend just to develop or verify the deployed adapter.
Do not replace lockfiles with those from another package manager or mix the root
and frontend React/Tailwind versions.

## Excalidraw editor

Pin exact published versions only, never ranges or moving dist-tags. The current
pin is `@excalidraw/excalidraw@0.18.0-4ce8305`, independent of ExcaliDash 0.6.7.
Provenance lives in the `editor` block of `upstream.json`; follow the
[editor update procedure](docs/UPDATES.md#actualizar-el-editor-excalidraw), including
backup-before-publish and the lossy rollback caveat. Keep editor bumps separate.

`npm run check:editor-upstream` checks local consistency and reports upstream drift;
append `-- --offline` for the CI consistency-only check. Only local inconsistency
fails the check. Use `npx -y npm@10.9.2 --prefix frontend ...` for frontend installs
and lockfile changes. The adapter's only outbound fetch is the server-side
excalidraw.com comparison behind authenticated `GET /api/system/editor`.

## Development and generated files

Start the Sites development flow:

```sh
pnpm dev
```

Outside managed Linux, the root development server uses port 5173. In managed
ChatGPT Work, follow the current Sites preview instructions in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) instead of guessing the execution profile.
Development has a QA identity fallback; never expose it as a production service.

The root dev command builds the frontend **statically** before starting the shell.
After changing `frontend/`, rebuild the SPA and refresh the browser:

```sh
node scripts/prepare-frontend.mjs
```

That script builds `frontend/`, copies its output to `public/` and generates
`server/spa-html.ts`. Do not hand-edit those outputs or `frontend/dist/`.
`worker/index.ts` sends `/api/*` to `server/api.ts` and otherwise serves generated
SPA HTML; the SPA owns navigation.

For isolated upstream frontend development only:

```sh
npm --prefix frontend run dev
```

This uses port 6767 and proxies to a backend on port 8000. It is not the integrated
Sites Worker flow; do not mistake its upstream backend expectations for production.

Build the application, then optionally run its local Worker preview:

```sh
pnpm build
pnpm start
```

The Wrangler configuration is generated at `dist/server/wrangler.json` from the
root Vite configuration. Do not invent a separate root Wrangler configuration.
`pnpm start` uses local persisted resources under `.wrangler/state`.

## Tests and pre-PR checks

Choose focused checks while editing. Frontend tests use Vitest in a Node environment
under `frontend/tests/**/*.test.tsx`; there is no Jest or Playwright test suite.
Run all frontend tests or a single transport test file:

```sh
pnpm test:frontend
npm --prefix frontend run test:unit -- tests/sites-transport.test.tsx
```

Editor regressions include `frontend/tests/editor-thumbnail-exports.test.tsx`,
`frontend/tests/editor-scene-api.test.tsx` and
`frontend/tests/settings-advanced.test.tsx`.

API, identity, ownership, storage or concurrency changes need adapter coverage:

```sh
pnpm test:adapter
```

The adapter harness uses Node assertions and Miniflare D1/R2. It compiles with the
development identity fallback disabled and uses isolated emulated resources, not
production account data. The upstream Node backend suite does not verify Workers.

Before a code PR, mirror [.github/workflows/sites-ci.yml](.github/workflows/sites-ci.yml)
after the frozen installs above:

```sh
npm run check:public-source
npm run check:editor-upstream -- --offline
npm run build
node node_modules/typescript/bin/tsc --noEmit
node frontend/node_modules/typescript/bin/tsc -b frontend/tsconfig.json
npm run test:frontend
npm run test:adapter
```

Also run the relevant linters (CI currently has no lint job):

```sh
pnpm lint
npm --prefix frontend run lint
```

CI runs on pull requests and pushes to `main`; it checks source but does not deploy.
For documentation-only changes, verify paths, documented scripts and the diff;
do not run builds or migrations merely to discover their behavior.

## Code style

- Match surrounding formatting; there is no Prettier configuration to apply.
- Use PascalCase for components and `use*` names for hooks.
- New Sites UI text needs `en` and `es` keys in the relevant
  `frontend/src/locales/` area module and a focused test; TypeScript enforces Spanish
  completeness. Follow the dictionary convention in [ADAPTATION.md](docs/ADAPTATION.md#localización).
- New adapter error text needs a stable code in `server/error-codes.ts` and matching
  translations in `frontend/src/locales/errors.ts`; cover the response in
  `tests/adapter.integration.mjs`.
- Both root and frontend TypeScript are strict; frontend also checks unused locals
  and parameters. Root `@/*` imports resolve from the repository root.
- Root rules live in `eslint.config.mjs` (Next core-web-vitals and TypeScript),
  with exemptions for vendored `components/ui/` and `hooks/use-mobile.ts`.
- Frontend rules live in `frontend/eslint.config.js` (TypeScript, React hooks and
  refresh); `any` and `_`-prefixed unused names are allowed. Its lint script permits
  no warnings. Follow the owning package's rules rather than copying root defaults.

## Authentication and data safety

- `server/api.ts` trusts the Sites-injected `oai-authenticated-user-id` header;
  email/full-name headers support user creation. Never accept browser parameters
  as trusted identity or weaken the production missing-identity response (401).
- The QA fallback is gated by `import.meta.env.DEV`. Keep production tests that
  prove anonymous requests fail, and never make QA identity available in production.
- `app/chatgpt-auth.ts` contains shell identity helpers and
  `/signin-with-chatgpt` / `/signout-with-chatgpt` paths; it is not Worker API auth.
- Preserve per-user ownership checks, mutation origin checks, immutable R2 scenes
  and D1 optimistic concurrency. Test cross-user access and conflicting updates
  when changing these contracts.
- Do not reintroduce local passwords, SMTP, API keys, external sharing, scheduled
  backups or a Socket.IO server as if the adapter already supported them. See
  [docs/ADAPTATION.md](docs/ADAPTATION.md) for intentional feature boundaries.
- Never commit secrets or credentials. Frontend configuration names include
  `VITE_API_URL`, `VITE_APP_BUILD_LABEL`, `VITE_APP_VERSION`, `VITE_DEV_BACKEND_URL`,
  `VITE_EXCALIDASH_UI_FONT_FAMILY` and `VITE_EXCALIDASH_UI_FONT_URL`.
  Treat browser-exposed configuration as public; there are no `.env.example` files.

## D1 schema changes

Use Drizzle to generate new migrations:

```sh
pnpm db:generate
```

Migrations are append-only: never rewrite an applied migration. Review generated
SQL before applying it. A source rollback does not restore database contents.
After a build has generated the Wrangler config, the initial local migration is:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_thick_baron_zemo.sql
```

Apply each local migration once, in order; use the appropriate file for subsequent
migrations. Local resources are independent of production. Read
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) before any hosted migration or publication.

## Publishing and handoff

- Deployment is ChatGPT Sites-managed Cloudflare Worker/D1/R2. The logical hosted
  bindings are `DB` and `BUCKET`, declared in `.openai/hosting.json`.
- Pushing to public GitHub **does not publish**. Follow
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and current Sites tooling; do not substitute
  a direct production Cloudflare deployment.
- Keep the public source separate from the managed deployment checkout. Preserve
  an existing Site's identity, complete hosting manifest, audience/access policy,
  environment settings and storage. Do not create a replacement Site for an update.
- Never copy local databases, `.wrangler/`, `.sites-runtime/`, `.env` files,
  credentials or backups between those checkouts. Verify preview before publishing.
- Prefer Conventional Commits for new commits (for example, `feat: ...`); history
  is mixed, so this is guidance rather than a historical invariant.
- Keep changes scoped. Report changed files, focused checks and outcomes, risks
  and unresolved questions. Do not claim checks or deployments that were not run.

## Local agent skills

Skills are installed per developer in `.agents/skills/`, with `.claude/skills/`
symlinks. These directories are git-ignored; keep `skills-lock.json` trackable as
the installation manifest. Do not commit installed skill trees or symlink sets.
Skill-internal `AGENTS.md` files are skill content, not repository guidance.
