# Fastify Phase 4 — community feature checkpoints

Started from clean checkpoint `aeb1ff6` on `architecture/move-to-persistent-api`, 2026-11-04. [Document 22](../../22-fastify-architecture-refactoring-plan.md) governs the eight ordered groups. Prior Phase 1–3 evidence remains historical and unchanged.

Node 22.22.2, Fastify 5.12.8. Each local invocation checked loopback API 54321 and PostgreSQL 54322, restricted `ct_api` readiness and all 25 migrations through `20261103001700`. Process-only forwarding overrides replaced saved ports; ignored environment files were unchanged. No hosted target, data reset or migration deployment was used.

Each checkpoint ran `npm run test:http -w server`, `npm run check -w server`, `npm run lint`, then the listed local scripts sequentially via `node --env-file=server/.env.local server/tests/<suite>-local.mjs` with the runbook's active loopback-port overrides. The Phase 1 fixture remains unchanged, including 41 explicit and 28 HEAD routes, schemas, response statuses, limits and identity categories. Adapter doubles exercise transport; real runtime suites remain authoritative for authorization, bypasses, integrity, rollback and concurrency.

SQL review compares all 110 template expressions, preserving literal SQL and normalizing formatting and the direct route-input-to-service-input binding names. Runtime suites verify generated queries and lock/serialization behavior; new projection checks cover independent column lists when introduced. Service code imports no runtime HTTP/schema or legacy feature modules. Each group's diff was reviewed before its independent commit.

## Checkpoint 1 — Public access and standing

3 community operations migrated cumulatively. All 49 backend cases, server TypeScript and root lint passed. Required local suites passed sequentially: `configuration-local`, `directory-local`. Existing assertions, transaction barriers and lock observations were retained.

Standing retains post-validation optional verification and no cache directive; landing/directory retain optional onRequest verification and no-store. Standing reads without an actor transaction; landing retains its single raw query; public directory retains its own transaction without an eligibility gate. The legacy commands/request registrar remains alongside the public plugin until checkpoints 2–3.

Preservation review passed: 110 SQL templates (with input-binding/format normalization), unchanged HTTP fixture, client/shared contracts, migrations, lockfile, runtime privilege manifest, startup/actor/cursor facilities. No required gate remains blocked. Next: checkpoint 2; later groups remain untouched.

## Checkpoint 2 — Creation and lifecycle

5 community operations migrated cumulatively. All 49 backend cases, server TypeScript and root lint passed. Required local suites passed sequentially: `community-local`, `self-service-local`. Existing assertions, transaction barriers and lock observations were retained.

Creation and commands retain 32768-byte bodies, tagged eligibility, creation 201 and 23505 → handle_taken, request/revision handling, all command/audit/locking implementations, rollback and retries. The protected plugin inherits required authentication once; remaining reads use registerCommunityRequests.

Preservation review passed: 110 SQL templates (with input-binding/format normalization), unchanged HTTP fixture, client/shared contracts, migrations, lockfile, runtime privilege manifest, startup/actor/cursor facilities. No required gate remains blocked. Next: checkpoint 3; later groups remain untouched.

During checkpoint 2 verification, the first typecheck and two baseline HTTP cases found an omitted `randomUUID` import; the first community-local creation consequently returned 503 and stopped before self-service. The import moved with its implementation; all gates were rerun successfully without assertion changes.

## Checkpoint 3 — Requests and reviews

9 community operations migrated cumulatively. All 49 backend cases, server TypeScript and root lint passed. Required local suites passed sequentially: `community-local`, `access-audit-local`. Existing assertions, transaction barriers and lock observations were retained.

Own request, review, staff candidates and queue retain their statement boundaries and exact projections. Null requests differ from missing accounts; review retains 403/404 unavailable. The final legacy registration and inline request SQL/schemas are removed.

Preservation review passed: 110 SQL templates (with input-binding/format normalization), unchanged HTTP fixture, client/shared contracts, migrations, lockfile, runtime privilege manifest, startup/actor/cursor facilities. No required gate remains blocked. Next: checkpoint 4; later groups remain untouched.

## Checkpoint 4 — Profiles and preferences

13 community operations migrated cumulatively. All 50 backend cases, server TypeScript and root lint passed. Required local suites passed sequentially: `self-service-local`, `community-local`, `directory-local`, `global-profiles-local`. Existing assertions, transaction barriers and lock observations were retained.

Exact profile and independent community profile/preferences edits retain archive/inactive exceptions, sharing gates and account/preference lock order. The temporary accounts/self-service.ts module is deleted; real tests import its implementations directly from the community service.

Preservation review passed: 110 SQL templates (with input-binding/format normalization), unchanged HTTP fixture, client/shared contracts, migrations, lockfile, runtime privilege manifest, startup/actor/cursor facilities. No required gate remains blocked. Next: checkpoint 5; later groups remain untouched.

Checkpoint 4 also verifies exact-profile compiled SELECT fields and bound parameters with the actual service. An initial typecheck caught an unnecessary `params.target` extraction caused by matching a SQL alias/comment; it was removed before runtime checks. No assertion changed. A transient Windows write error during test inventory regeneration was retried; the final complete 50-case gate passed.
