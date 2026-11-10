# Four-file feature checkpoint - 2026-11-10

[Issue #4](https://github.com/JonDManningDev/the-crowded-table-app/issues/4) is implemented against baseline `5cec498`. The accepted four-file decision, current architecture, file structure and AGENTS guidance were recorded before application edits. This is a scoped follow-up to the completed five-phase/eight-community-checkpoint migration.

Communities and user accounts each contain exactly `routes.ts`, `json-schema.ts`, `types.ts`, and `service.ts`, with no forwarding modules or replacement subdirectories. Ten supporting modules are removed. Routes own endpoint paths; types contain independent service inputs/results, dependency/helper contracts and associated declarative constants. Service facades retain `ReturnType` inference through erased type-only factory imports. Services retain all execution, SQL projections, locks and transactions. Matching operation sections remain in routes, HTTP schemas and services; types follow that order where applicable.

## Verification

| Gate | Result |
| --- | --- |
| `npm.cmd run check -w server` | Passed; inferred transport inputs satisfy independent service contracts |
| `npm.cmd run test:http -w server` | 69 passed; exact unchanged HTTP fixture, 41 explicit operations and 28 generated HEAD registrations |
| Existing nine local Auth/HTTP suites | Preferences, community, history, self-service, configuration, records, directory, global profiles and access audit all passed through real local Auth/HTTP and `ct_api` |
| `node supabase/tests/access-client-audit.mjs` | Passed across 134 production TypeScript files |
| `npm.cmd test -- --run` | 279 passed in 38 files |
| `npm.cmd run lint` | Passed |
| `npm.cmd run build` | Server/client TypeScript and production Vite build passed |
| Repository/diff review | Exact four-file layouts, removed-module references absent, direct updated source/test/runbook imports, erased factory references, independent service command/block contracts and SQL projections; `git diff --check` passed |

The existing suites preserve positive/nearest-denial payloads, variants and forbidden fields, authentication/validation precedence, nullable replies and staff enums, projection, open audit details, authorization/direct bypass, stale inputs, rollback/retry and concurrent transitions. No new layout-coupled tests or fixture regeneration were added. Injection tests establish HTTP integration; real local suites remain the database/consistency evidence.

Normalized emitted JavaScript bodies for both services and both renamed JSON-schema modules exactly match `5cec498` after excluding imports. Runtime constants moved unchanged. Health, shared infrastructure, browser sources, generated database types, SQL, migrations, privileges, dependencies and fixture are unchanged.

## Environment and limits

Windows PowerShell, Node 22.22.2, npm.cmd, existing local Supabase Auth on loopback 54321 and PostgreSQL on 54322. The parent runner supplied root ignored configuration and corrected ports only in the process environment; no credentials were printed and no environment file changed. Real-suite summaries remain ignored under root `node_modules/.codex-verification/issue-4-real/summary.json`.

An initial worktree below `node_modules` hit Node's unsupported TypeScript-stripping restriction before HTTP tests could run. Moving that worktree to ignored `supabase/.temp/issue-4-worktree` resolved the environment issue; all passing suites used the unchanged Node runtime without a custom loader. Nonblocking npm update notices and existing Vitest/Vite performance notices remain.

No required gate remains unresolved. This checkpoint includes no hosted execution, database/schema change, frontend reorganization or deployment. Historical verification records retain their original results; their source links now point to the current schema location.
