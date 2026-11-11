# Complete application query schema — issue #6

Authorized by the user's request to implement [issue #6](https://github.com/JonDManningDev/the-crowded-table-app/issues/6), under parent #5, ADR 0001 and document 23. This is the query-schema checkpoint only. Policy modules, transaction retries, workflow/audit cutovers and hosted work remain pending.

## Implementation and operation

`kysely-codegen@0.20.0` is an exact server development dependency. `server/kysely-codegen.json` includes only `public`/`app_private`, keeps public as the default schema, uses type-only imports and applies the reviewed nullable, unwritable staff-standing override. The checked-in generated `DB` describes all 16 application relations and all their columns, independently of privileges. Private relation keys retain schema qualification; Auth/platform schemas are excluded.

The tooling entry point resolves the local stack through CLI status and validates loopback and the `postgres` database through the existing local helper. It uses the local administrative tooling credential, never the runtime `DATABASE_URL`. `CT_LOCAL_DB_PORT` supports the existing loopback forwarding arrangement. Runtime connection construction, credentials, grants, RLS, readiness checks and privilege manifest are unchanged. No migration is needed for this type-only checkpoint.

From the repository root with the local stack running:

```sh
npm run regen:types
npm run verify:types
npm run check -w server
npm run test:types:local -w server
npm run test:http -w server
npm run test:local -w server
npm run lint
npm test -- --run
npm run build
```

Generation inventories stored generated and identity columns from `pg_catalog` before generating or verifying. A new column, removed column or changed reviewed generation/nullability metadata fails until its write semantics, override and compiler checks are reviewed. The current catalog contains one stored generated column: nullable `public.tenant_staff_assignments.required_account_standing`. Its read type is `string | null`; insert/update types are `never`. Types describe defaults/nullability and pg representations, not actor entitlements, all constraints or trigger effects.

The four-table `ApiTables` adapter and Supabase generation command are removed. Connections and transactions use generated `DB` directly. Raw result contracts now distinguish top-level pg `Date` values from SQL-built JSON timestamps and explicit six-digit cursor text. Reply-only TypeBox timestamp static types accept `Date | string`, reflecting the existing Fastify serializer; the runtime JSON schemas and reviewed fixture are unchanged. No result cast conceals a mismatch, and services still do not import runtime HTTP schemas. Explicit cursor SQL and service query logic are unchanged.

## Verification results

- Compiler red/green: the new compiler fixture failed against the former generated model (missing `DB` and unused negative assertions), then passed after generation. Production and fixture compilation pass. Checks include nullable reads, pg Dates, timestamp write inputs, defaults, private keys, JSON inserts, required identifiers, excluded Auth and rejected generated-column insert/update values.
- Two local generation/driver cases pass: full relation/column coverage against the live catalog, byte-identical regeneration, successful verification, deliberate drift rejection without rewriting the drifted file, pg Date/null/JSON values and retained six-digit cursor text. Temporary drift files are removed; checked-in output remains clean.
- HTTP: all 70 cases pass, including the unchanged 69-registration contract fixture and a new actual-profile-service Date serialization check preserving nulls and field projection.
- All nine real local Auth/HTTP suites pass: preferences, community lifecycle/staff, history, self-service, configuration, records, directories, global profiles/blocks and final access audit. These retain real restricted-runtime, concurrency, Auth, archive/integrity/attribution, rollback, cursor and external REST/GraphQL denial assertions. The exact runtime privilege manifest passes unchanged. Client Auth-only/workspace boundary scan passes across 134 production TypeScript files.
- All 265 pgTAP assertions pass; public/private SQL lint reports no schema errors. All 51 hostile PostgREST checks and concurrent slug claims pass. Clean migration replay/populated upgrade, backfill/preflight/rollback/provenance checks and both sharing/deactivation lock orders pass in the disposable database.
- All 279 client tests in 38 files pass. Root lint, server/compiler fixtures and production build pass. The existing bundle-size warning remains.

The explicit local target was API `127.0.0.1:54321`, database `127.0.0.1:54322`, with Node 22.22.2. Docker Desktop was initially stopped and was started. The local runtime environment still recorded the old forwarded port 15422; runtime suites used process-only endpoint overrides to match current CLI status, preserving credentials and environment files. Initial target-guard failures were resolved before checks passed.

The retired Data API script initially imported the removed `actor-transaction.ts` module. Its import now points directly to `database.ts`, the authoritative owner; no compatibility module was added. The script then passed with the same local endpoint override.

SQL CLI checks used `test db --remote=<explicit-loopback-URL> --yes` and `db lint --remote=<explicit-loopback-URL> --schema public,app_private --level warning`, as required by the local runbook. SQL fixtures ran after the HTTP fixtures. Replay/upgrade created and removed its own disposable database. No working database reset, hosted operation, deployment or UI change occurred.

## Review and remaining work

Two independent code-review agents inspected the staged implementation against starting revision `8b0473f2c33abb555d7d124a13d71a2b7b72f0ce`, the parent/child specification and repository standards. Review included the new untracked implementation files after staging. Existing unrelated planning edits were excluded from the reviewed commit.

### Standards

No substantive documented-standard violations or actionable code smells. Feature ownership, independent service contracts, runtime security boundaries and the reviewed HTTP baseline are preserved. The reviewer caught a malformed documentation heading and replacement separators in the checkpoint banners; these were corrected before commit. Runtime results were assessed from evidence rather than rerun by this reviewer.

### Spec

No findings. Public/private coverage, excluded Auth, generated-column inventory, nullable/read/write/default semantics and driver/JSON/cursor distinctions match the accepted requirements. Reply-only `Date | string` typing preserves runtime schemas. The reviewer independently reran server/compiler fixture checks successfully; broader regression results were assessed from evidence.

Review summary: Standards 0 unresolved findings; Spec 0 findings. Issue #6 does not change any authorization enforcement boundary. Later tickets retain their documented dependency gates and separate commits. Existing uncommitted design/publication work is preserved separately from this implementation commit.
