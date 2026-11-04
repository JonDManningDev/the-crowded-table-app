# Fastify Phase 5 — health and final reconciliation

Implemented and locally verified on 2026-11-04 from clean checkpoint `2a08e76db95232d598158e24612434295e678597`, branch `architecture/move-to-persistent-api`. The [approved plan](../../22-fastify-architecture-refactoring-plan.md) governs the completed structure. Prior Phase 1–4 evidence remains historical and unchanged.

## Health ownership and transport contracts

The [routes](../../../server/src/health/routes.ts), [service](../../../server/src/health/service.ts) and [schema](../../../server/src/health/schema.ts) use matching Liveness, then Readiness sections. `createHealthService({checkReadiness})` returns `readLiveness` and `readReadiness`; `HealthService` is inferred from the factory. Liveness returns `{live:true}` without checking the database. Every readiness call awaits the supplied checker before returning `{ready:true}` and propagates its original failure.

Composition constructs one health service with `() => checkRuntime(db)` and registers `healthRoutes` outside authentication. The plugin receives only `{service}`, with no database, verifier or cursor dependency. The inline registrations are removed. Root options/errors/cleanup, startup ownership, listener behavior, connection settings and readiness SQL remain unchanged.

Health's schema file exports fixed success-body contracts and derives reply types with `json-schema-to-ts`. Routes import these types only and attach no runtime schemas. This preserves the Phase 1 fixture's explicit absence of health schemas, accepted extra query parameters, authentication independence and cache behavior. GET and HEAD paths remain unchanged; HEAD performs its operation and emits no body. Readiness failures retain root 503/unavailable translation, server-generated request IDs and generic logging.

## Transport typing and remaining cleanup

Community routes use schema-owned types for slug/tenant/account/review/copy params, directory/request/record/history query strings, creation, profile, details, copy and participant-permission bodies. Literal-preserving schema declarations and one file-local typed object constructor retain the exact JSON values, required-array contents/order and absent-versus-empty declarations. The constructor replaces duplicate object constructors without adding an infrastructure layer. Runtime schemas, field-specific validation and serialized outcomes match the unchanged fixture.

Generated command oneOf schemas retain the shared discriminated `CommunityCommand` union. Dynamically assembled community preference/settings maps retain their shared DTO types. These explicit exceptions avoid pretending that widened runtime maps derive precise transport types. Routes pass the resulting types directly to existing service signatures; no `any`, broad route casts, type-provider dependency or shared/browser contract changes are introduced. Service SQL/projections remain independent of HTTP schemas.

`supabase/tests/direct_data_api.mjs` still referenced `withVerifiedActor` and the removed command/configuration modules at the starting revision. It now imports the real implementations from the community service and uses `withEligibleActorTransaction` with explicit actor/request context. Creation and command calls assert eligibility and unwrap successful values; the settings setup asserts eligibility. Existing hostile-client assertions, fixture cleanup, transaction ownership and concurrent slug claims remain intact. No compatibility interface is retained. Repository searches found no remaining obsolete source imports.

## Verification environment and commands

Node `22.22.2`, installed Fastify `5.12.8`. CLI status supplied loopback API `54321` and PostgreSQL `54322`. Restricted `ct_api` readiness passed; all 25 migration versions matched repository filenames through `20261103001700`. The same readiness and migration-state checks passed again after replay and final verification. Only verification-process environment values replaced saved forwarding ports; ignored environment files were unchanged. Credentials, Auth identities and application rows are not captured here.

From the repository root, gates ran sequentially:

```powershell
npm run test:http -w server
npm run check -w server
npm run lint
npm run test:local -w server
# pgTAP against the verified explicit loopback URL, using the runbook command
node supabase/tests/direct_data_api.mjs
node supabase/tests/direct_data_api_upgrade.mjs
# SQL lint against the same loopback URL, schemas public,app_private
npm test -w client
npm run build
```

The [runbook](../../../supabase/README.md#final-local-access-audit) supplies endpoint handling. SQL CLI invocations used `test db --remote=<explicit-loopback-URL> --yes` and `db lint --remote=<explicit-loopback-URL> --schema public,app_private --level warning`. No bare remote target or hosted execution was used. SQL fixtures did not overlap HTTP fixtures. The replay/upgrade script created and removed its own disposable database; the working database was not reset or migrated.

| Gate | Result |
| --- | --- |
| Starting HTTP gate | All 54 existing cases passed before edits |
| Final HTTP/shared/startup/adapter gate | All 60 cases passed; prior 54 plus six health cases |
| Health coverage | Service waiting/rechecks/failure identity, query-free liveness, exact registration and schema absence, GET/HEAD dispatch/bodies, extra query parameters, invalid credentials ignored, cache isolation, root translation/logging, request-ID trust and sibling hooks passed |
| Server TypeScript | Passed; also included in root build |
| Root ESLint | Passed |
| preferences-local | Passed: real Auth/HTTP, all flags, strict input, attribution, isolation, rollback, bypass, ban/missing row |
| community-local | Passed: commands, request identity, delegation/reappointment, discipline/audit, archive/authority races, rollback and exact profiles |
| history-local | Passed: category/reason audiences, exact reads, pagination, legacy preservation, bypasses and both serialization orders |
| self-service-local | Passed: profiles/preferences/summaries, lifecycle/archive, independent edits, rollback/bypasses and both sharing/inactivity orders |
| configuration-local | Passed: public projection, audience/field matrix, copy limits, no-op/retry/reset, audit, rollback/bypasses and authority serialization |
| records-local | Passed: staff/participant audiences, bounded pages, archive/Auth, attribution/audit, no-op/rollback, bypasses and concurrent authority changes |
| directory-local | Passed: member/public/exact/owner distinctions, projections, encrypted scopes/tampering, limits, lifecycle/archive, bypasses and both read/change orders |
| global-profiles-local | Passed: discovery/exact sharing, bilateral blocks, source validation, attribution/idempotence/rollback, snapshot revocation and bypasses |
| access-audit-local | Passed: exact runtime privilege manifest, caller/definer/owner boundaries, REST/OpenAPI/GraphQL/Storage/Realtime denials and local Auth flows |
| Client boundary scan | Passed across 130 production TypeScript files |
| pgTAP | Nine files, all 265 assertions passed |
| Retired Data API regression | All 51 real PostgREST checks and concurrent slug claims passed |
| Replay/populated upgrade | Passed: backfills, preflight rejection, late rollback, audit provenance/categories, private preferences, active-owner integrity and both sharing/inactivity lock orders |
| SQL lint | No public/app_private schema errors |
| Full frontend tests | All 279 tests in 38 files passed |
| Root production build | Server check, client TypeScript and Vite build passed |

Frontend tests/build used host access for the previously documented Windows transform-file issue; no frontend source, assertions or test configuration changed. An initial ESLint run rejected private health schema constants used only in types; exporting the named success contracts resolved it without suppressing the rule. No assertion was weakened. The existing Vite chunk-size warning and CLI `auth.email.enable_signup` deprecation notice remain outside this structural refactor.

## Preservation and completion

The unchanged Phase 1 fixture confirms 41 explicit operations and 28 automatic HEAD routes, including complete schemas, declared statuses, body limits and authentication categories. Feature counts remain 10 user-account operations/6 HEADs, 29 community operations/20 HEADs and 2 health operations/2 HEADs. All three features contain only their approved triad and follow matching section/operation order.

All 110 application SQL template expressions match the starting revision exactly after line-ending normalization. Existing community and user-account service files, shared authentication/errors/transactions/cursors, database construction/runtime check and startup source are unchanged. All nine existing integration suites are unchanged, preserving assertions, barriers, transaction control and lock observations. Migrations, shared/browser contracts, client source, dependency lockfile and runtime privilege manifest are unchanged. Source dependency and obsolete-import checks passed; prior evidence remains unchanged.

All five phases are complete and locally verified. No required gate remains failed or unavailable. This is one independently reviewable Phase 5 checkpoint, completing the approved structural plan. No product-policy change, frontend implementation, new migration, working-database reset, dependency change, hosted execution or deployment is included. Browser/hosted/external-delivery verification and future feature/hosting work retain their separate authorization and release gates.
