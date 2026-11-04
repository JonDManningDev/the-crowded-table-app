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

## Checkpoint 5 — Configuration and copy

20 community operations migrated cumulatively. All 50 backend cases, server TypeScript and root lint passed. Required local suites passed sequentially: `configuration-local`, `directory-local`. Existing assertions, transaction barriers and lock observations were retained.

Details, settings and copy retain separate authority checks, tenant locks, field-specific copy validation, no-op/retry/reset and audit attribution. Configuration authorization is named independently from record authorization; the superseded configuration module is deleted.

Preservation review passed: 110 SQL templates (with input-binding/format normalization), unchanged HTTP fixture, client/shared contracts, migrations, lockfile, runtime privilege manifest, startup/actor/cursor facilities. No required gate remains blocked. Next: checkpoint 6; later groups remain untouched.

Checkpoint 5 additionally compared parsed bodies of all 24 migrated query/authorization helpers with the starting revision, allowing only the documented authorization-helper renaming and ignoring formatting/comments. Their statement structure, literal values and order match.

## Checkpoint 6 — Directories and account facts

23 community operations migrated cumulatively. All 51 backend cases, server TypeScript and root lint passed. Required local suites passed sequentially: `directory-local`. Existing assertions, transaction barriers and lock observations were retained.

Member, public and owner/exact audiences remain distinct; encrypted scopes and both read/change serialization orders pass. Directory/fact projections use independent ordered column lists. Public directory remains the checkpoint 1 implementation; the superseded directory module is deleted.

Preservation review passed: 110 SQL templates (with input-binding/format normalization), unchanged HTTP fixture, client/shared contracts, migrations, lockfile, runtime privilege manifest, startup/actor/cursor facilities. No required gate remains blocked. Next: checkpoint 7; later groups remain untouched.

Checkpoint 6 compiled-query checks confirm all nine facts fields and eight profile fields, JSON projection key order, and exact bound parameter order for member directory, owner enumeration and exact account facts. All 28 moved query/authorization helper bodies match the starting revision after descriptive-name and formatting normalization.

## Checkpoint 7 — Staff and participant permissions

28 community operations migrated cumulatively. All 52 backend cases, server TypeScript and root lint passed. Required local suites passed sequentially: `records-local`, `community-local`. Existing assertions, transaction barriers and lock observations were retained.

Staff and participant operations retain distinct audiences and schemas, read/write denial mappings, no-op updates, attribution and audit categories. Record metadata uses an independent ordered column list; the superseded records module is deleted.

Preservation review passed: 110 SQL templates (with input-binding/format normalization), unchanged HTTP fixture, client/shared contracts, migrations, lockfile, runtime privilege manifest, startup/actor/cursor facilities. No required gate remains blocked. Next: checkpoint 8; later groups remain untouched.

Checkpoint 7 checks all four actual staff/participant SELECT projections and bound parameters using the real service, plus unauthorized read → 404/missing and unauthorized write → 403/forbidden. All 32 moved query/authorization helper bodies retain their parsed statement structure.

## Checkpoint 8 — Audit history

29 community operations migrated cumulatively. All 54 backend cases, server TypeScript and root lint passed. Required local suites passed sequentially: `history-local`. Existing assertions, transaction barriers and lock observations were retained.

History retains independent category/reason audiences, open details, exact-event reads, pagination, empty unauthorized pages and archive/revocation serialization. Cursor helpers move unchanged; the superseded history module is deleted.

Preservation review passed: 110 SQL templates (with input-binding/format normalization), unchanged HTTP fixture, client/shared contracts, migrations, lockfile, runtime privilege manifest, startup/actor/cursor facilities. No required gate remains blocked. All eight community groups are complete; Phase 5 remains deferred.

## Final reconciliation

The community triad contains three public and 26 protected operations, with 20 automatic HEAD routes. Application totals remain 41 explicit operations and 28 HEADs. Composition constructs one `createCommunityService({db,cursors})`; its inferred `CommunityService` type supplies explicit subsets to `publicCommunityRoutes` and `communityRoutes`. Only the public plugin receives the verifier. Neither plugin receives database/cursor resources. Complete URLs, parent authentication, cache/timing exceptions and the unchanged Phase 1 schema fixture are preserved.

All eight sections appear in matching order. SQL, authorization and transaction orchestration live in the service, transport validation/mapping in routes, and full schemas in schema.ts. Profile input uses schema-derived typing alongside unchanged shared DTOs. Directory/fact/record projections use independent ordered lists. Configuration and record authorization remain distinct helpers; their renames do not change statements or order. Real transaction-taking implementations remain directly imported by integration tests, without nested transactions or compatibility wrappers. Superseded community modules and the temporary account self-service module are deleted.

| Final gate | Result |
| --- | --- |
| `npm run test:http -w server` | 54 passed: prior 43 plus 11 community adapter/service cases |
| Community adapter | All 29 dispatches, context/params/body/query forwarding, validation before service calls, serialization, operation-specific denials, all 20 HEADs, authentication once, public timing/cache exceptions and sibling scope isolation passed |
| Compiled-query cases | Public bindings, exact-profile projection, directory JSON/owner/exact facts projections, staff/participant projections and read-versus-write denial mappings passed |
| `npm run check -w server` | Passed |
| `npm run lint` | Passed |
| Focused `history-local` | Passed before the complete local command |
| `npm run test:local -w server` | Ran once after checkpoint 8 changes; all nine suites and boundary scan passed sequentially |
| preferences-local | Passed: real Auth/HTTP, all flag combinations, isolation, strict input, attribution, rollback, bypass, ban and missing row |
| community-local | Passed: lifecycle commands, request/revision identity, delegation, discipline/audit, archive/authority races and rollback |
| history-local | Passed: independent category/reason audiences, exact reads/pages, legacy records, bypass, archive/revocation serialization |
| self-service-local | Passed: profile/preferences, summaries, lifecycle/archive, independent edits, bypasses, rollback and both sharing/inactivity orders |
| configuration-local | Passed: public projection, configuration audiences, copy fields, no-op/retry/reset, attribution, bypasses and authority serialization |
| records-local | Passed: staff/participant audiences, scoped pages, archive/Auth, attribution/audit, no-op, rollback and concurrent authority changes |
| directory-local | Passed: member/public/exact/owner audiences, projections, encrypted cursor scopes/tampering, lifecycle/archive, bypasses and both read/change orders |
| global-profiles-local | Passed: discovery/exact sharing, bilateral blocks, source validation, idempotence, attribution/rollback, snapshot ordering and bypasses |
| access-audit-local | Passed: exact runtime privilege manifest, caller/definer/owner boundaries, REST/OpenAPI/GraphQL/Storage/Realtime denials and local Auth flows |
| Client boundary scan | Passed across 130 production TypeScript files |
| `npm test -w client -- src/features/communities src/features/auth/AuthShell.test.tsx` | 64 tests in nine files passed; host access used for the previously documented Windows transform-file issue, with no frontend changes |
| Preservation review | All 110 SQL templates and 35 moved query/authorization helper bodies match after binding/descriptive-name/format normalization. All nine integration suites retain identical non-import statement bodies, including assertions, barriers and transaction control. HTTP fixture, cursor formats, client/shared contracts, migrations, dependency lockfile, runtime privilege manifest and shared startup/transaction facilities remain unchanged |

Checkpoint commits, in execution order:

| Checkpoint | Commit |
| --- | --- |
| Public access and standing | `a586d98` |
| Creation and lifecycle | `603af7b` |
| Requests and reviews | `91b3029` |
| Profiles and preferences | `f8b96f9` |
| Configuration and copy | `27b06f5` |
| Directories and account facts | `5e7a330` |
| Staff and participant permissions | `a6b25d0` |
| Audit history and final reconciliation | This evidence belongs to that independently verified commit |

The earlier verification failures described above were resolved before their checkpoints were committed; no assertion was weakened. No required Phase 4 gate remains failed or unavailable. Health restructuring, broader frontend/build checks and Phase 5 final verification remain deferred. No product policy, frontend implementation, migration/reset, dependency change, hosted execution or deployment is included.
