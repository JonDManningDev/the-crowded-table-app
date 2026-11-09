# The Crowded Table

A React/TypeScript gaming-community app with a persistent TypeScript API and Supabase Auth/PostgreSQL. The frontend and API run locally; the development database is hosted. Preview community screens still include mock features. See [implementation status](docs/12-implementation-status.md) for verified boundaries.

## Source layout

- `client/`: the `@crowded-table/client` workspace: React source, public assets, HTML, Vite/Vitest and frontend TypeScript configuration.
- `server/`: the API workspace: Fastify services, generated public-schema database types, startup configuration, setup scripts and integration tests.
- `supabase/`: migrations, database configuration, preflight queries and access-verification tooling.
- `docs/`: product decisions, architecture, implementation evidence and operational instructions.

Each workspace owns the HTTP definitions used by its features. The root package owns repository commands, common TypeScript/ESLint tooling and one `package-lock.json`. Install dependencies once from the root; workspace manifests declare application dependencies. See [file structure](docs/07-file-structure.md) for frontend feature organization.

## Codex workspace setup

In Codex's project menu, choose **Edit project**, attach the complete Git repository root (the folder containing `.git`, `AGENTS.md` and the root `package.json`), and make it the primary folder. `client/` and `server/` are npm workspaces inside this repository; use their shared parent as the Codex project root so agents can also work with `supabase/` and `docs/`.

After relocating a checkout, update the project's folder attachment and remove the obsolete attachment without deleting its files. Verify the chat's working directory and workspace roots point to the checkout: `git rev-parse --show-toplevel` should report the repository root. If an existing chat retains the old location after reopening, continue in a new chat opened from the corrected project with the task context carried over.

## Run locally against the hosted development database

From the repository root, run the API and frontend in separate terminals after installation:

```sh
npm ci
npm run dev:api
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite forwards `/api` to the local API at `http://127.0.0.1:3001`. Keep port 5173 for the configured Auth redirects. Both application processes run on this computer.

Browser configuration lives in ignored `client/.env.hosted-db.local`; `client/.env.example` lists its public settings. The server reads ignored `server/.env.hosted-db.local`, including its restricted database connection and cursor key. Database credentials and service-role keys never belong in Vite variables. Existing environment files move with the workspace; no credentials need rotation. See the [Supabase runbook](supabase/README.md#hosted-development-database-local-application--2026-11-03) for initial setup and certificate handling. Restart the relevant process after changing its configuration.

## Independent local Supabase target

API startup defaults to port `3001` when `PORT` is absent. When supplied, `PORT` must contain only ASCII decimal digits and represent an integer from `0` through `65535`; leading zeros are accepted. Empty values, whitespace, signs, fractions, hexadecimal and exponent forms are rejected before resource construction. Explicit `PORT=0` requests an ephemeral listener. Programmatic `startApi` calls must supply a numeric integer in the same range. Invalid ports retain the existing generic CLI startup-failure diagnostic.

Use the same root install, then run these commands in separate terminals:

```sh
npm run dev:api:local
npm run dev:local
```

These use `server/.env.local` and `client/.env.local-api.local`. Initial local setup remains `npm run setup:local -w server`. Local fixture suites enforce loopback endpoints. This machine uses forwarded Supabase API/database ports 15421/15422, as described in the runbook.

## Verification and build

```sh
npm test
npm run build
npm run lint
npm run preview
```

Root `test` runs the client tests. Root `build` checks the server and type-checks/builds the client into `client/dist/`. Root `lint` checks repository TypeScript with React rules scoped to the client. `preview` serves the built frontend for asset inspection; use the dev server and API for application flows with API forwarding.

Run `npm run test:http -w server` for the reviewed route and schema fixture, Fastify feature adapter tests, shared facilities and startup/cleanup; these require no Supabase stack or environment file. Run `npm run test:local -w server` for the real local API suites and client access audit. Set the forwarded port environment variables when required. Database and hosted verification commands are documented in the runbook; hosted suites require explicit opt-in and create disposable fixtures.

## Application boundaries

Supabase Auth provides identity; persisted application data goes through the local TypeScript API. Main account routes are Home, Profile, Communities and Settings under `/account`; personal breadcrumbs start at My Account. Community preview routes remain under `/community/preview`.

See [planning documents](docs/README.md) for accepted rules, deferred resource domains and eventual application-hosting work.
