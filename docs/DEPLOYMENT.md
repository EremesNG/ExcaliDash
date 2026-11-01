# Deploying this fork to ChatGPT Sites

## Configuration example

The checked-in `.openai/hosting.json` is a reusable configuration:

```json
{
  "d1": "DB",
  "r2": "BUCKET"
}
```

There is no Site ID, database ID, bucket credential or account identity in this
public source. Sites provisions hosted storage from the logical binding names.
Do not add Cloudflare credentials to browser code or the manifest.

## New Site through ChatGPT Work

Ask the Sites plugin to deploy this repository. The assistant should read the
current Sites skill and use its supported helpers rather than running a direct
Cloudflare production deployment.

1. Prepare a separate deployment checkout from this fork's selected commit.
2. Register a new Site once and persist the returned `project_id` in that checkout's
   `.openai/hosting.json`, retaining `d1: DB` and `r2: BUCKET`.
3. Install root and frontend dependencies, then build and apply local migrations.
4. Run tests and verify the preview. New Sites start private; retain that audience
   unless the owner explicitly requests a change.
5. Use the Sites source helper to push the exact deployment source to the Site's
   managed repository and package the output. Save and deploy that saved version
   through the native Sites tools. Confirm the deployment result.

Keep deployment-specific manifest edits in the Site's managed source repository.
The public GitHub template must stay free of personal Site identities. Publishing
is not automatically connected to GitHub pushes by this PR.

## Update an existing Site

Open the current Site and its managed source checkout first. Copy the reviewed
source changes from this repository while preserving that checkout's entire hosting
manifest, environment settings, access policy and storage resources. Do not create
another Site or replace its project ID. Do not copy `.wrangler`, `.sites-runtime`,
local databases, backups, `.env` files or credentials between checkouts.

Use `upstream.json` for the ExcaliDash base. The editor baseline is independently
pinned in `frontend/package-lock.json`. Add migrations for schema changes; never
rewrite an applied migration. A code rollback does not restore database contents.

## Local build and D1 migration

After installing dependencies as described in README:

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_thick_baron_zemo.sql
```

Apply each local migration once, in order. Local D1/R2 are independent of production.
The generated deployment artifact carries migrations for Sites to apply on publish.

In the managed ChatGPT Work environment, read the Sites preview instructions and
launch `sites-preview start <absolute-checkout>`. In a supported local environment,
`npm run dev` launches the development server. Follow the current Sites skill when
selecting and repairing the execution profile.

Development includes a fixed QA identity when the platform provides no identity.
It is guarded by `import.meta.env.DEV` and absent from production output. Do not expose
the development server as a hosted production service. Integration tests compile the
adapter in production mode and check that anonymous data requests receive HTTP 401.

## Checks before publication

```sh
npm run build
node node_modules/typescript/bin/tsc --noEmit
node frontend/node_modules/typescript/bin/tsc -b frontend/tsconfig.json
npm run test:frontend
npm run test:adapter
npm run check:public-source
```

The adapter tests create isolated emulated D1/R2 resources. They do not import data
into, restore, or delete anything from an existing production account. Preview is
required before updating the hosted application.
