# Complete transaction retries - issue #7

Authorized by the user's request to implement [issue #7](https://github.com/JonDManningDev/the-crowded-table-app/issues/7), following completed/closed issue #6 at `d057f75`. Parent #5, ADR 0001 and document 23 define the accepted retry contract and test boundaries. This checkpoint implements retries only; later policy, workflow, function-disposition and semantic-audit ownership changes remain pending.

## Implementation and boundaries

`server/src/database.ts` owns `withTransactionRetry`. It runs at most three total attempts and rethrows the final error unchanged. Only an actual `pg.DatabaseError` with SQLSTATE `40001` or `40P01` qualifies. Ordinary application errors, stale inputs, unrelated SQL errors, transport errors and an error merely carrying a SQLSTATE-shaped property do not qualify. Each attempt invokes Kysely's transaction executor anew; rollback/release finish before another attempt starts. There is no statement retry, nested retry loop, swallowed business error or automatic uncertain-commit recovery.

`withEligibleActorTransaction` retains its existing public contract. Trusted actor/operation settings and `lock_eligible_actor()` execute inside each fresh transaction, before the entire feature callback repeats. The original immutable request context is captured once; every attempt binds the same actor and operation identity. Feature callbacks reacquire their existing locks and reload/evaluate current state. No previously authorized result is reused. Existing error translation and request-level no-op/stale contracts are unchanged.

All authenticated product operations already use this wrapper. The three anonymous community reads (standings, exact-slug landing and public directory) now use the same transaction retry owner without actor settings or eligibility calls. Optional-authentication behavior, cache headers, projections and HTTP schemas remain unchanged. Health stays at its existing boundary. Private Auth eligibility/locking, provisioning/maintenance callers, tenant scope, attribution, grants, RLS, G-02, runtime readiness and the privilege manifest are unchanged. No migration or new database function is required.

Existing feature callbacks contain database work and local computation/ID/cursor construction; they do not send external notifications or perform other external effects. The shared callback contract requires external effects after successful commit. Generated workflow IDs may differ between rolled-back attempts; only final committed IDs/events are returned. This preserves one committed outcome without introducing compatibility interfaces or implementing the later policy migrations.

## Verification

The agreed seams are the existing Fastify HTTP harness, real local Auth/HTTP operations and direct restricted-runtime SQL/fixture inspection. No production fault hook, repository abstraction or alternate service interface was added.

The HTTP tracer test first failed with 503 against the old implementation, then passed with a repeated complete authenticated operation. New HTTP cases cover both retryable SQLSTATEs, the three-attempt ceiling and final unavailable response, identical correlation identity, fresh eligibility denial, excluded business/stale/SQL/transport/unconfirmed errors and all three anonymous reads. The original registration fixture is unchanged. The tracer test runs after the established registration test: placing it first caused serializer reuse to mutate shared nullable schema array ordering before the fixture capture. Test ordering was corrected; the fixture was not regenerated.

The new `transaction-retry-local.test.mjs` uses real verified local Auth identities and PostgreSQL connections as `ct_api`. Its test-only pool instrumentation raises PostgreSQL-origin exceptions with the chosen SQLSTATE after actual writes/event-category creation, or immediately before executing COMMIT. These are deliberate server-side fault injections, not evidence that the PostgreSQL engine naturally selected a serialization/deadlock victim. Existing real concurrent-session suites remain the contention/lock-order evidence.

Nine scenarios (ten Node test results including the parent) verify:

- A join succeeds on the third attempt after `40001` and `40P01`; accounts, pending requests, event and category writes roll back together. Exactly one final request/event/category set remains, with the returned request UUID and one operation identity.
- A confirmed error at the commit boundary repeats the complete operation and leaves one configuration event.
- A real owner HTTP permission revocation after rollback makes the second attempt return forbidden, preserving original settings and leaving no event for the denied operation.
- A real Auth ban after rollback repeats the protected eligibility check, returns ineligible and prevents the preference callback/write from repeating. The ban is removed during fixture cleanup.
- An owner approval between a member's withdraw attempts makes the retried request stale. A subsequent explicit stale replay runs only once and preserves the approved state.
- Each transient code exhausts at three attempts with the existing 503/unavailable response, original request ID, unchanged settings and no committed failed events.
- An arbitrary server SQL error runs once and rolls back.
- Simulated loss of the acknowledgement after actual COMMIT returns unavailable without automatic replay; one committed change/event remains. An explicit repeated save is a no-op and does not increase the tenant's event count.
- Public-directory recovery stays anonymous and returns the same audience/projection.

The local full suite now includes the retry suite after the existing nine suites and before the client boundary scan. Fixture mutations and fault injection are confined to the local stack and random synthetic records; cleanup removes those records. Test instrumentation is outside production callbacks, including inter-attempt permission/Auth changes.

## Commands and results

```sh
npm run check -w server
node --test server/tests/http-baseline.test.mjs server/tests/shared-facilities.test.mjs
npm run test:http -w server
npm run test:retry:local -w server
npm run test:local -w server
npm run verify:types
npm run test:types:local -w server
npm run lint
npm test -- --run
npm run build
```

All required checkpoint gates pass:

- Server/compiler fixtures, focused HTTP/shared tests and all 75 backend cases pass; the reviewed registration fixture is unchanged.
- All nine existing real local Auth/HTTP suites plus the new retry suite pass. Existing permission/archive/Auth/sharing races, rollback and protected-runtime assertions remain in place. The exact runtime privilege manifest passes unchanged. The client Auth-only/workspace boundary scan passes across 134 production TypeScript files.
- All 265 pgTAP assertions pass. SQL lint reports no public/private schema errors. All 51 hostile PostgREST checks and concurrent slug claims pass. Clean replay/populated upgrade, backfill/preflight/rollback/provenance checks and both sharing/deactivation lock orders pass in the disposable database.
- Generated-schema verification and both local generation/catalog/driver/drift cases pass without changing checked-in output.
- Root lint, all 279 client tests in 38 files and production build pass. The existing build chunk-size warning remains.

SQL CLI commands followed the [local runbook](../../../supabase/README.md#final-local-access-audit): `test db --remote=<explicit-loopback-URL> --yes` and `db lint --remote=<explicit-loopback-URL> --schema public,app_private --level warning`. `node supabase/tests/direct_data_api.mjs` used the same restricted-runtime process override; `node supabase/tests/direct_data_api_upgrade.mjs` created/removed its disposable database. SQL fixtures ran after the Auth/HTTP fixtures. No required gate remains failed or unavailable.

Target: local API `127.0.0.1:54321`, PostgreSQL `127.0.0.1:54322`, Node 22.22.2. The existing runtime environment still names forwarded port 15422; tests use process-only overrides of the loopback transport endpoints to match CLI status, preserving credentials and environment files. No hosted operation, deployment, working-database reset, schema/grant change, HTTP fixture refresh or UI change is included. Existing uncommitted planning/publication work is preserved separately from this implementation commit.

## Review

Two independent code-review agents inspected `git diff --cached HEAD` against starting revision `d057f75f8dd68677f4f8bdaec6b7e89e05b109c3`, the parent/child requirements and repository standards. Existing unrelated planning edits were excluded from the reviewed checkpoint. All verification gates above subsequently finished successfully.

### Standards

No documented-standard violations or actionable baseline smells. The shared retry owner preserves attribution/eligibility, existing error-translation ownership and anonymous identity. Test fault instrumentation remains outside production callbacks; the reviewed HTTP fixture is unchanged. No speculative framework or compatibility interface was introduced.

### Spec

No findings. Complete bounded retries, genuine PostgreSQL error classification, fresh decisions, one operation identity, anonymous behavior and excluded uncertain commits match the accepted contract. The reviewer inspected Kysely's transaction lifecycle and confirmed that rollback completes before another attempt starts. Deliberate SQLSTATE injection is accurately distinguished from naturally occurring contention.

Review summary: Standards 0 findings; Spec 0 findings. This is an independently verified retry checkpoint; policy/workflow cutovers in issues #8-#15 retain their separate authorization and commit gates.
