# Fastify Phase 1 HTTP baseline — 2026-11-04

This is a preservation baseline for the [approved structural refactor](../../22-fastify-architecture-refactoring-plan.md), not a new product/API specification. The [API transition](../../20-persistent-api-transition-proposal.md), [intended access matrix](../../16-intended-access-matrix.md) and [final access audit](../../21-final-local-access-audit.md) retain their behavioral authority. No production source or database interface changes are part of this checkpoint.

## Starting point and artifacts

- Branch: `architecture/move-to-persistent-api`; starting revision: `cfdd3d99a4255d01b6ecb818566eeb406f0de395`.
- The implementation checkout was clean. The earlier planning turn's README edits and refactoring document were already committed; no pre-existing uncommitted edits were overwritten.
- Node `v22.22.2`, installed Fastify `5.12.8`. Local Supabase was healthy on loopback API `54321` and PostgreSQL `54322`; the restricted `ct_api` runtime readiness check passed. All 25 recorded migration versions matched the migration filenames, through `20261103001700`.
- The ignored server environment retained forwarding ports `15421`/`15422`. Only the verification child process used active `54321`/`54322` overrides. No environment file, credential, database configuration or hosted application was changed. Initial sandbox-only probes could not access Docker/CLI telemetry and the saved forwarding endpoint refused connection; the host-access preflight and baseline succeeded. No pre-existing application failure was found.
- [HTTP fixture](../../../server/tests/fixtures/http-contract.json): 69 method/path registrations, authentication category, effective body limit and declared response statuses. Its `schemas` map contains all 41 complete operation schemas; automatic HEAD entries reference the corresponding GET schema. Explicit `null` records absent health schemas. Object keys and route entries are sorted; schema array order and intentionally open fields are preserved.
- [Injection tests](../../../server/tests/http-baseline.test.mjs) and [test harness](../../../server/tests/helpers/http-harness.mjs): run `npm run test:http -w server` without Supabase, environment files, network access or a listening server. The helper uses Kysely's dummy driver with explicitly queued results/errors, records unexpected execution even if an HTTP handler catches it, scopes the initialization subscriber to synchronous construction, and closes every instance.

The harness observes `fastify.initialization` and `onRoute` before registration, then compares after `ready()`. See the [Fastify hook documentation](https://github.com/fastify/fastify/blob/v5.12.7/docs/Reference/Hooks.md). The installed 5.12.8 implementation was inspected to confirm initialization publication before the factory returns. The current authentication capture recognizes the legacy `actor` request decorator; update this test-only observation when Phase 2 changes context decoration, without changing the preserved audience or timing categories.

Do not automatically regenerate the fixture on failure. A refactor should retain it. If accepted behavior changes separately, review the complete schema/route diff, audiences, statuses and nearest denials before updating it. Test construction introduces no production hooks, dependencies, module mocks or alternate HTTP interfaces.

## HTTP behavior inventory

There are 28 GET, 2 POST, 5 PATCH, 4 PUT and 2 DELETE operations, plus 28 automatic HEAD registrations. All paths remain complete, without new prefixes. The fixture supplies the exact per-operation schema/status inventory; the table below records actual operation outcomes independently of schema declarations. Here `C` means `/api/communities/:tenantId`; suite names refer to `server/tests/<name>-local.mjs`.

All protected operations additionally produce direct `401 unauthenticated` and locked-eligibility `403 ineligible`, except review's eligibility response is `403 unavailable`. Schema/JSON errors produce `400 invalid_request`. The common error rules below apply even when their status is absent from that route's declared response schemas. A declared status is not evidence that every handler has a branch producing it.

| Operation(s) | Success and operation-specific failure mapping | Existing real-runtime suite(s) |
| --- | --- | --- |
| GET `/health/live` | 200 `{live:true}`; no schema/authentication/database work | New injection coverage |
| GET `/health/ready` | 200 `{ready:true}` after runtime check; failed check maps to 503 | Runtime checks throughout existing suites; new injection coverage |
| GET `/api/community-standings` | 200 array; supplied invalid identity is 401 after validation | community, self-service |
| GET `/api/public/communities/:slug` | 200 landing projection; absent/inaccessible slug is 404 `missing` | configuration |
| GET `/api/public/communities/:slug/directory` | 200 page, including visible empty page; inaccessible/disabled/archived is 404 `missing`; invalid cursor is 400 | directory |
| GET/PUT `/api/me/preferences` | 200 three booleans; missing account row is 404 `missing` | preferences |
| GET/PUT `/api/me/profile` | 200 `{profile:row}`; absent own profile is 200 `{profile:null}` | self-service |
| GET `/api/me/communities` | 200 page; invalid cursor is 400 `invalid_cursor` | self-service |
| GET `/api/profiles` | 200 discovery page; invalid cursor is 400 `invalid_cursor` | global-profiles |
| GET `/api/profiles/:userId` | 200 exact global profile; hidden/absent target is 404 `missing` | global-profiles |
| GET `/api/me/blocks` | 200 outgoing-only page; invalid cursor is 400 `invalid_cursor` | global-profiles |
| PUT `/api/me/blocks/:userId` | 200 `{blocked:true}`; self target is 400 `invalid_target`; unauthorized source/target is 404 `missing` | global-profiles |
| DELETE `/api/me/blocks/:userId` | 200 `{blocked:false}` including retries; self target is 400 `invalid_target` | global-profiles |
| POST `/api/communities` | 201 command result; unique violation `23505` is 409 `handle_taken` | community |
| POST `C/commands` | 200 typed command result, including no-op/retry outcomes; 403 `forbidden`, 404 `missing`, 409 `stale_state` remain operation-specific | community, self-service |
| GET `C/me/request` | 200 `{request:row}` or `{request:null}` for an existing account; absent/archived account is 404 `missing` | access-audit |
| GET `C/accounts/:target/review` | 200 standing/revision/request projection; 403/404 both use `unavailable` rather than generic `ineligible`/`missing` | community, access-audit |
| GET `C/staff-candidates`; GET `C/requests` | 200 bounded page, including empty scoped results | community, access-audit |
| GET `C/accounts/:userId/profile` | 200 curated profile; absent/inaccessible is 404 `missing` | community, self-service |
| PATCH `C/me/profile` | 200 `{tenantId}`; no eligible affected row is 404 `missing` | self-service |
| GET/PATCH `C/me/preferences` | 200 private booleans; absent/inaccessible is 404 `missing` | self-service |
| GET `C/details`; GET `C/settings`; GET `C/copy` | 200 corresponding projection; missing tenant/unauthorized read is 404 `missing` | configuration |
| PATCH `C/details` | 200 details; 400 `invalid_details`/`invalid_timezone`, 403 `forbidden`, 404 `missing` | configuration |
| PATCH `C/settings` | 200 settings; 403 `forbidden`, 404 `missing` | configuration |
| PUT `C/copy/:contentKey` | 200 copy page; 400 `invalid_copy`, 403 `forbidden`, 404 `missing` | configuration |
| DELETE `C/copy/:contentKey` | 200 copy page; missing override is 404 `missing`, unauthorized mutation 403 `forbidden` | configuration |
| GET `C/directory`; GET `C/accounts` | 200 member/owner page; 400 `invalid_cursor`, 404 `missing` for unauthorized audience | directory |
| GET `C/accounts/:userId` | 200 nine account facts; absent/inaccessible target is 404 `missing` | directory |
| GET `C/staff`; GET `C/participant-permissions` | 200 scoped page; 400 `invalid_cursor`, 404 `missing` for unauthorized read | records |
| GET `C/staff/:userId`; GET `C/accounts/:userId/permissions` | 200 scoped record; absent/inaccessible is 404 `missing` | records |
| PATCH `C/accounts/:userId/permissions` | 200 participant permission record; 403 `forbidden`, 404 `missing` | records |
| GET `C/history` | 200 page, including empty page for absent tenant or missing audit authority; 400 `invalid_cursor`; eligible-actor denial remains 403 | history |

### Lifecycle, validation, cache and errors

- Protected routes inherit required `onRequest` authentication and `Cache-Control: private, no-store`, including denied/invalid requests. Public landing/directory use route-local optional `onRequest` verification and `no-store`; anonymous access does not call the verifier, but any supplied invalid Authorization header is rejected. They authenticate before parameter/query validation.
- Standing-reference optional verification occurs inside the handler, after validation. An invalid query with an invalid token is 400 without calling the verifier; a valid query with an invalid token is 401. It sets no cache directive. Health also sets no cache directive, ignores credentials and does not inherit protected hooks. No new cache policy is introduced.
- Root body limit is 8,192 bytes. Both POST community endpoints override it to 32,768 bytes. Limits apply before schema validation, after `onRequest`; oversized authenticated payloads map to 413 `invalid_request`, while missing identity still returns 401 first. Unsupported media type maps to 415 `invalid_request`.
- Preserve AJV `removeAdditional:false`, `coerceTypes:false`, `useDefaults:false`. Extra forbidden input is rejected rather than stripped, string booleans are not converted, missing values are not defaulted. Do not tighten intentionally open schema fields or add header restrictions. The fixture preserves those distinctions verbatim; injection checks retain open history `details` and serialization allowlists.
- Required/optional authentication failures send 401 directly. Root `CommunityError` translation preserves its status and message as `code`. PostgreSQL `23514`/`22023` map to 400: `invalid_timezone` only for that exact message, otherwise `invalid_details`. Creation alone maps `23505` to 409 `handle_taken`.
- Other numeric error statuses from 400 through 499 map to that status with `invalid_request`; everything else maps to 503 `unavailable`. Only the latter branch logs `API request failed`, the trusted request ID and error code (or `internal`); it does not log error messages, SQL contents or bearer headers. Error bodies contain only `code` and server-generated UUID `requestId`. Incoming request IDs do not establish attribution.
- Registered automatic HEAD operations execute their GET lifecycle and mapping but expose no response body. Unknown paths keep Fastify's default 404 `{message,error,statusCode}`, with no protected hook/cache inheritance. In injection, an unknown HEAD exposes that default JSON too; this is distinct from registered HEAD routes and is not a claim about bytes delivered over a real HTTP socket.

### Cursor and state exceptions

| Surface | Preserved pagination contract | Real-runtime authority |
| --- | --- | --- |
| Member/owner directories; public directory; global discovery; outgoing blocks | AES-256-GCM UUID cursor, shared persistent key. Scope respectively `['member-directory',actor,tenant]`, `['owner-accounts',actor,tenant]`, `['public-directory',slug]`, `['global-discovery',actor,trimmed-lowercase-q]`, `['outgoing-blocks',actor]`. Default 50, maximum 100; opaque `next` or null. Invalid/tampered/cross-scope cursors fail closed. | directory, global-profiles |
| Personal community summaries | Base64url JSON `[actor,filter,created_at,id]`; filter defaults `all`; timestamp descending and UUID ascending. Six fractional timestamp digits. Default 50, maximum 100. | self-service |
| Staff/participant record lists | Base64url JSON `[actor,tenant,kind,user_id]`, kind `staff`/`participant`; ascending UUID. Default 50, maximum 100. | records |
| Audit history | Base64url JSON `[actor,tenant,target-or-null,category-or-null,created_at,id]`; descending timestamp/UUID. Six fractional timestamp digits. Exact `eventId` selects one and bypasses cursor decoding; default page 50, maximum 100. | history |
| Staff candidates/request queue | UUID `after`, ascending candidate user/request ID; fixed 50-row pages and UUID/null `next`. These do not use the encrypted codec. | community, access-audit |

Archived-owner exceptions and exact inactive-profile reads remain distinct from ordinary enumeration. Unauthorized history remains a successful empty page. Missing own profile/request data retains null where specified; missing/inaccessible account or target retains its endpoint-specific error. These are preserved outcomes, not normalization opportunities.

SQL text, transaction boundaries, trusted attribution, lock order, snapshot admission, retries, rollback, audit and G-02 archive RLS remain unchanged. The original real-runtime suites exercise nearest denials, raw REST/GraphQL/runtime bypasses, stale transitions, competing authority/archive/eligibility changes and both relevant serialization orders. Injection fixtures do not establish those database properties.

## Verification and reproduction

The pre-change integration run completed before the new test files were added. Run fixture suites sequentially; never overlap the SQL fixture suites with HTTP fixtures. From the repository root, the Phase 1 gate is:

```powershell
npm run test:local -w server
npm run test:http -w server
npm run check -w server
npm run lint
npm run test:local -w server
```

For this run only, the host-access process set `CT_LOCAL_API_PORT=54321`, `CT_LOCAL_DB_PORT=54322` and `DATABASE_URL` to the existing restricted credential with its port changed to `54322`. Node's environment-file loading preserves those process overrides. Resolve active ports with local CLI status and verify loopback before applying process overrides; do not copy credentials into evidence or substitute the hosted environment. The [runbook](../../../supabase/README.md#final-local-access-audit) documents the alternative forwarded-port setup.

| Gate / suite | Before additions | After additions |
| --- | --- | --- |
| preferences | Passed | Passed |
| community | Passed | Passed |
| history | Passed | Passed |
| self-service | Passed | Passed |
| configuration | Passed | Passed |
| records | Passed | Passed |
| directory | Passed | Passed |
| global-profiles | Passed | Passed |
| access-audit (including exact privilege manifest and alternate surfaces) | Passed | Passed |
| Auth-only client boundary scan | Passed, 130 production TypeScript files | Passed, 130 production TypeScript files |
| Environment-independent injection | Not present | Passed: 14 cases, including 118 protected-route identity denials |
| Server TypeScript / root ESLint | Not rerun before additions | Passed |
| Source/shared contracts/migrations/runtime manifest | Starting revision recorded | Unchanged; dependency lockfile and original root README also unchanged |

All Phase 1 gates passed. Documentation file links and `git diff --check` also passed. The checkpoint contains the HTTP fixture, test helper/suite, server test command and documentation/guidance only. No SQL migration/reset, dependency installation/upgrade, privilege-manifest refresh, hosted fixture run or deployment is included. Separate pgTAP/replay/SQL-lint, frontend build/tests, hosted/browser checks and construction/startup-failure ownership tests were not executed for Phase 1; later gates remain as specified in document 22. Future failed or unavailable required checks block progression pending resolution or explicit user adjudication. Phase 2 has not started.
