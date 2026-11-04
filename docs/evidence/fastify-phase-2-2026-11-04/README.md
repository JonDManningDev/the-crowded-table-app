# Fastify Phase 2 — shared facilities and resource ownership

Implemented and locally verified on 2026-11-04 under the [approved refactor](../../22-fastify-architecture-refactoring-plan.md). Starting revision `a5cb9d165f958bcee01b2061e1705c5ae4e8de5d`, branch `architecture/move-to-persistent-api`, clean checkout. The Phase 1 checkpoint and [historical evidence](../fastify-phase-1-2026-11-04/README.md) remain intact. No Phase 3 feature migration, frontend change, hosted run or deployment is included.

## Implemented ownership and interfaces

| Facility | Current contract |
| --- | --- |
| `token-verifier.ts` | Existing `verifyBearer` factory and plain `BearerVerifier` type. Parsing, Supabase `getClaims`, issuer/audience/role/algorithm/expiry/subject checks are unchanged. No Fastify or database eligibility logic. |
| `http-authentication.ts` | Required authentication registration, optional route hook, optional handler verification and typed context extraction. The protected parent declares `authenticatedContext:null` and assigns a fresh `{actorId,requestId}` after verification. Extraction rejects undeclared/null context; it never invents identity. |
| `application-errors.ts` | `ApplicationError(status,code)` retains `statusCode` and `Error.message`. There is no old class alias or new error envelope. |
| `http-errors.ts` | Unchanged `errorResponse` schema and root application/PostgreSQL/4xx/unexpected-error translation and safe logging. Operation-specific mappings stay with their existing registrations. |
| `actor-transaction.ts` | Readonly `AuthenticatedContext`; `withEligibleActorTransaction(db,context,work)` returns `{eligible:false}` or `{eligible:true,value:T}`. Attribution SQL and locked eligibility execute before callback work, on the same transaction. Callback exceptions propagate and roll back. |
| `directory-cursors.ts` | Existing codec and exported type moved from the community directory. Encryption, validation, key format, endpoint scopes and `invalid_cursor` mapping are unchanged. A fixed cursor from the pre-refactor codec still decodes. |
| `app.ts` | `buildApi({db,verify,cursors,cleanup})` requires all four construction inputs. It installs root cleanup/errors and the shared authentication helpers, retaining existing route registrations and root options. It neither constructs verifier/codec nor implicitly destroys the supplied database. |
| `index.ts` | `readApiConfig` retains environment names/defaults. `startApi` constructs resources through narrow constructor/check dependencies; importing the module starts nothing. Direct execution retains the success message, generic startup-failure diagnostic and nonzero failure exit status. |

All production and test callers use the new interfaces. The obsolete `auth.ts`, `http.ts` and community `directory-cursor.ts` are deleted; the old error class, transaction helper, actor decorator and positional application construction have no compatibility exports or retained callers. The hosted verification script's imports/construction were updated but not executed.

Existing mixed account/community feature modules remain until their prescribed phases. This checkpoint only updates their shared-facility calls and eligibility unwrapping. In particular, operation `{status:404}` values, review's `unavailable` codes, unauthorized successful empty history pages, own-profile/request nulls, archived-owner exceptions and exact inactive-profile access retain their prior mapping. Direct test transactions assert eligibility and explicitly unwrap values where consumed; lock barriers, stale-request tests, rollback assertions and concurrency checks are retained.

The preference projection still uses its existing shared schema; replacing it with a database column allowlist and constructing feature services remain scheduled feature-phase work. No feature triad, new route or extra architectural layer is introduced here.

## Resource lifecycle

1. Read required configuration and construct the verifier/codec before allocating the database pool.
2. Startup owns the allocated database until `buildApi` successfully returns. A synchronous build failure releases it directly.
3. The returned app owns its supplied cleanup through root `onClose`. Later plugin boot, readiness or listener failures call `app.close()` and await cleanup.
4. Startup supplies one memoized cleanup promise, including rejected promises. Concurrent shutdown signals share one close request; cleanup is not retried or duplicated. Installed signal listeners are removed on close.
5. Cleanup rejection does not replace the original startup error. The direct CLI retains a nonzero startup status; signal cleanup rejection emits one generic shutdown diagnostic and sets a nonzero exit status. Private error contents are not logged.

No new timeout, force-close setting, pool option or recovery policy is introduced. The live-request drain test uses a connection-close request so it verifies pool cleanup after response completion without waiting for the existing keep-alive timeout.

## Verification

Node `v22.22.2`, installed Fastify `5.12.8`. Local Supabase was healthy on loopback API `54321` and PostgreSQL `54322`; restricted `ct_api` readiness passed. All 25 recorded migration versions matched repository filenames, through `20261103001700`. The ignored environment's saved forwarding ports remained unchanged. Only the verification process overrode the runtime port and `CT_LOCAL_API_PORT`/`CT_LOCAL_DB_PORT` to the active CLI ports. No credentials or application rows are captured in this evidence.

| Gate | Result |
| --- | --- |
| Phase 1 contract/injection suite | Passed, all 14 cases; identical fixture with 41 explicit operations and 28 HEAD registrations |
| Shared facilities | Passed, 7 cases: attribution and eligibility order, tagged status values, denied callback, propagated query/application errors and rollback, overlapping request isolation, missing context and fixed cursor vector/scope/key/tamper checks |
| Startup and cleanup | Passed, 15 cases: configuration defaults/missing values, verifier/cursor/database constructor failures, build and boot failures, readiness/listener failure, live-request drain, repeated close, overlapping signals, cleanup rejection before/after transfer, explicit cleanup callback and direct CLI failure |
| Server TypeScript | Passed |
| Root ESLint | Passed |
| preferences-local | Passed: real Auth/HTTP, strict fields, attribution, direct denials, eligibility and rollback |
| community-local | Passed: request identity, staff/discipline/archive authority, stale requests, rollback and races |
| history-local | Passed: audit categories/reasons, exact lookup, pagination, denials and both serialization orders |
| self-service-local | Passed: profile/private preferences, lifecycle/archive, summaries, bypasses, rollback and sharing/inactivity races |
| configuration-local | Passed: public projection, full configuration audience, no-op/retry/audit, raw denials and authority serialization |
| records-local | Passed: staff/participant audiences, bounded pages, archive/Auth, audit, raw denials and competing authority changes |
| directory-local | Passed: directory/exact/owner distinctions, opaque cursors, projection, lifecycle/archive and both read/change orders |
| global-profiles-local | Passed: discovery/exact sharing, bilateral blocks, source checks, attribution/retries/rollback and snapshot ordering |
| access-audit-local | Passed: exact privilege manifest, REST/OpenAPI/GraphQL/Storage/Realtime denials and real local Auth flows |
| Client boundary scan | Passed, 130 production TypeScript files |
| Preservation comparison | All 110 `sql` tagged template expressions unchanged, normalizing repository/working-tree line endings; unchanged HTTP fixture, shared/browser contracts, frontend, migrations, database module, dependency lockfile and runtime privilege manifest |

Run from the repository root, with fixture suites sequentially and the actual loopback target verified first:

```powershell
npm run test:http -w server
npm run check -w server
npm run lint
npm run test:local -w server
```

`test:http` explicitly names the baseline, shared-facility and startup files, using Node's built-in runner with file concurrency one. It requires no Supabase/environment file; startup tests use synthetic resources and loopback listeners. Injection/dummy-driver assertions establish transport/control-flow behavior; the real runtime suites establish authorization, RLS, integrity, rollback and concurrency behavior. See the [local runbook](../../../supabase/README.md#final-local-access-audit) for forwarded-port handling. Do not run fixture suites against hosted credentials.

No required Phase 2 gate failed or remains unavailable. A temporary test-only keep-alive wait was removed by explicitly closing the test request's connection; production listener settings were not changed. The source verification normalizes CRLF/LF before comparing SQL template text. No application assertions were weakened to obtain a passing run.

Separate pgTAP/clean replay/SQL lint, frontend tests/build, hosted/browser/external-delivery checks and production operational behavior were not rerun in this structural phase. They remain subject to later applicable gates; no hosted verification is claimed. Phase 2 is complete and forms one independent checkpoint. Phase 3 has not started.
