# Fastify Phase 3 — user-account feature triad

Implemented and locally verified on 2026-11-04 under the [approved architecture](../../22-fastify-architecture-refactoring-plan.md). Starting revision `0c2266d962854ea086780b8fcd4fcd5b1506216d`, branch `architecture/move-to-persistent-api`, clean checkout. Prior [Phase 1](../fastify-phase-1-2026-11-04/README.md) and [Phase 2](../fastify-phase-2-2026-11-04/README.md) evidence remains unchanged.

## Ownership and interfaces

The [routes](../../../server/src/user-accounts/routes.ts), [service](../../../server/src/user-accounts/service.ts) and [schema](../../../server/src/user-accounts/json-schema.ts) contain these matching operation sections, in order:

| Section | Service operations, in order |
| --- | --- |
| Account preferences | `readAccountPreferences`, `saveAccountPreferences` |
| Own profile | `readOwnProfile`, `saveOwnProfile` |
| My communities | `listMyCommunities` |
| Global profiles | `discoverGlobalProfiles`, `readGlobalProfile` |
| Account blocks | `listAccountBlocks`, `blockAccount`, `unblockAccount` |

`createUserAccountService({db,cursors})` binds the two explicit resources and returns named operations taking `AuthenticatedContext`, then validated operation input. `UserAccountService` exposes their inferred signatures. The service retains the existing SQL/current-state authorization, transaction orchestration, projections and cursor scopes, without Fastify or HTTP schema/utility runtime imports. Its preference projection explicitly selects/returns `user_is_discoverable`, `enable_matchmaking`, `allow_direct_messages` in the existing order. It does not read `preferencesSchema.required`.

The `userAccountRoutes` plugin receives only `{service}`. Application composition constructs one service and registers this encapsulated child beneath the existing authenticated parent, without a prefix or a second authentication hook. Routes attach complete schemas, extract verified context/validated input and retain the preference eligibility/status mappings. Other operations retain their existing application-error paths. No universal service-result envelope is introduced.

The schema file composes existing shared preference/profile-input schemas and derives request types with `json-schema-to-ts`. Browser-safe shared DTOs remain unchanged. Schema shape, declared statuses, open/closed fields, absent versus empty `required` declarations, body limits, serialization and validation precedence match the unchanged Phase 1 fixture. The migrated feature has 10 explicit operations and 6 automatic HEADs; application totals remain 41 and 28.

`ownProfile`, `inspectGlobalProfile` and `setOwnBlock` remain exported transaction-taking implementations used by both service operations and real rollback/snapshot tests. Tests import them directly from the new service, preserving their held transactions, lock observations, barriers and assertions. These helpers neither open nested transactions nor wrap legacy interfaces.

The old preference/global-profile modules and inline account preference routes are removed. The legacy self-service module now contains only PATCH community profile and GET/PATCH community preferences, registered once as `registerCommunitySelfService`. Its `ownCommunityProfile`/`ownCommunityPreferences` helpers are unchanged. That temporary file remains under `accounts` until the Phase 4 profiles/preferences group migrates, when it can be deleted. There are no old registration aliases, duplicated HTTP routes or new community-service dependencies. Personal community summaries remain user-account operations.

## Verification

Node `v22.22.2`, installed Fastify `5.12.8`. Local CLI status supplied loopback API `54321` and PostgreSQL `54322`. Restricted `ct_api` readiness passed; all 25 recorded migrations matched repository filenames, through `20261103001700`. Only the verification process overrode saved forwarding ports using the existing local credential; ignored environment files were unchanged. No hosted target was used and no credentials/application rows are captured here.

| Gate | Result |
| --- | --- |
| Existing HTTP/shared-facility/startup suite | All 36 cases passed; Phase 1 fixture unchanged |
| Isolated account HTTP adapter | 7 cases passed: all 10 dispatches, validated arguments and trusted context, fixed projections, all 6 HEADs, 32 identity denials, invalid inputs before service calls, preference/application failure mapping, null/empty results and sibling scope isolation |
| Preference database projection | SELECT and RETURNING contain exactly the three approved fields; covered in the adapter test file using the actual service and dummy driver |
| Combined backend gate | 43 cases passed |
| Server TypeScript | Passed |
| Root ESLint | Passed |
| Relevant frontend tests | 74 tests in 11 files passed; account settings, profile, communities, hooks/adapters and AuthShell |
| preferences-local | Passed: real Auth/HTTP, all preference combinations, attribution, strict input, direct denials, eligibility and rollback |
| community-local | Passed: lifecycle, request identity, staff/discipline/archive authority, stale requests, rollback and concurrency |
| history-local | Passed: category/reason isolation, exact reads/pages, runtime/browser denials and both serialization orders |
| self-service-local | Passed: global/community profile and preference separation, summaries, lifecycle/archive, bypasses, rollback and sharing/inactivity races |
| configuration-local | Passed: public projections, configuration audiences, attribution, retries/no-op/reset, bypasses and authority serialization |
| records-local | Passed: staff/participant audiences, bounded pages, archive/Auth, audit, rollback and concurrent authority changes |
| directory-local | Passed: member/public/exact/owner distinctions, projections, encrypted cursor checks, lifecycle/archive and both read/change orders |
| global-profiles-local | Passed: discovery/exact sharing, bilateral blocks, source validation, retries/attribution/rollback and snapshot ordering |
| access-audit-local | Passed: exact privilege manifest, REST/OpenAPI/GraphQL/Storage/Realtime denials and local Auth flows |
| Client boundary scan | Passed, 130 production TypeScript files |
| Preservation review | All 110 SQL template expressions match across relocation; all 8 moved/retained query-helper bodies match exactly after line-ending normalization. Cursor formats, HTTP fixture, shared/browser contracts, frontend, migrations, runtime privilege manifest, dependency lockfile and startup/transaction facilities are unchanged. |

From the repository root:

```powershell
npm run test:http -w server
npm run check -w server
npm run lint
npm test -w client -- src/features/user-accounts src/features/auth/AuthShell.test.tsx
npm run test:local -w server
```

The complete local fixture command ran once, with its nine suites and client boundary scan sequentially. The [runbook](../../../supabase/README.md#final-local-access-audit) describes loopback and forwarded-port handling. Do not overlap SQL and HTTP fixture suites or substitute hosted credentials.

The initial sandbox frontend invocation failed during transform imports because worker-generated temporary files were unavailable (`ENOENT`, 8 suites before test collection). The exact command passed with host access: 11 files, 74 tests. No frontend source/configuration or assertion was changed. The HTTP fixture also caught omitted empty `required` arrays during schema relocation; the relocated schemas were corrected, leaving the fixture unchanged. No application assertion was weakened to obtain a passing run.

`test:http` explicitly includes the account adapter test file. Isolated cases use service doubles and the real authentication parent without a database; the projection case uses the actual account service with a scripted driver. These establish transport/dependency boundaries. Real-runtime suites remain authoritative for RLS, authorization, integrity, rollback and concurrency.

All Phase 3 gates passed. No migration/reset, dependency change, hosted verification/deployment, frontend reorganization or Phase 4 implementation occurred. Separate full frontend tests/build, pgTAP/replay/SQL lint and hosted/browser/external-delivery checks were not rerun; later applicable gates remain. Phase 3 is complete as an independent checkpoint; Phase 4 has not started.
