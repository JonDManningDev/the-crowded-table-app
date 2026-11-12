# Actor transaction and community authorization query research

Date: 2026-11-11. **B's measured checkpoint is accepted. The separately authorized A+B implementation and four-variant local verification are complete.** The initial research changed no application code, migrations or grants. PostgreSQL 17 documentation matches the configured [local major version](../../supabase/config.toml#L13). The initial connection attempt returned `ECONNREFUSED`; after the user updated/restarted Docker, live local verification succeeded against PostgreSQL **17.11** as `ct_api`, using **Read Committed**. Targeted catalog checks and five existing fixture suites passed; see [original live verification](#live-local-verification--2026-11-11). The subsequent B and A+B checkpoints are recorded below. Fixtures remain local and are cleaned up; no hosted checks or deployment occurred.

**Assignment-presence follow-up - authorized 2026-11-12.** The user approved removing the redundant `s.user_id as assignmentId` projection from `loadCommunityStaffFacts` and detecting an absent assignment with `row.role === null`. Storage requires a non-null role, so this preserves missing/RLS-hidden assignment behavior and assignments whose permission flags are all false. The account identity sentinel, join predicates, lock ordering and fact shape remain unchanged. The identity-sentinel descriptions and measurements below record the original B/A+B checkpoints through `508b6df`; those benchmark artifacts are preserved and were not rerun for this equivalent projection simplification. Verification status is recorded in document 12.

## Recommendation

Evaluate the candidates independently: replace the two client calls for transaction context and actor eligibility with one explicitly ordered PL/pgSQL call, and replace the three community staff-fact reads with one typed join **after the existing tenant lock statement completes**. Keep product decisions in feature policies and preserve whole-transaction retries. The user selected B first, then authorized A+B. B's completed screen and expanded comparison remain historical evidence. A+B now passes the local correctness and measurement gates, including a fresh original/A/B/A+B comparison. Incremental warm benefits support keeping A with B; heavily contended writes gain little beyond B. Cold-request results and saturated history tails remain mixed, and local-loopback measurements do not establish performance on a hosted topology.

The governing requirements are [document 20, actor propagation/concurrency](../20-persistent-api-transition-proposal.md#L85), [ADR 0001, accepted ownership](../adr/0001-api-policy-ownership.md#accepted-decisions), [document 22, shared facilities](../22-fastify-architecture-refactoring-plan.md), and [document 23, concurrency/retries](../23-api-policy-implementation-plan.md#concurrency-and-retries). Current completion notices supersede older unstarted milestones. This report does not reopen eligibility, archive, authorization or retry policy. The decision register's [actor-transaction ownership](../08-decisions-and-open-questions.md#L602) and [current throwing eligibility contract](../08-decisions-and-open-questions.md#L23) remain authoritative; the latter supersedes the historical result-envelope convention.

## Baseline execution path and evidence limits

This section records revision `ede7a14f780b61e4a377d8c9cbb134ce015d2463`, before Candidate B. Source links resolve to the current working tree; use the recorded revision for the original three-query loader.

[database.ts:31](../../server/src/database.ts#L31) executes context assignment, then `lock_eligible_actor()`, then the callback, inside Kysely's transaction. Denial throws `IneligibleActorError`; [database.ts:46](../../server/src/database.ts#L46) retries only actual `pg.DatabaseError` instances with `40001` or `40P01`, at most three complete attempts. The operation ID is captured outside the retry loop.

[loadCommunityStaffFacts:58](../../server/src/communities/policies.ts#L58) separately reads tenant status, the actor's community standing, and staff assignment/flags. Configuration, account-record and history fact loaders reuse it. Their services already establish tenant scope and acquire the root lock before those reads: [configuration:501](../../server/src/communities/service.ts#L501), [account facts:591](../../server/src/communities/service.ts#L591), [records:604](../../server/src/communities/service.ts#L604), [history:675](../../server/src/communities/service.ts#L675). Lifecycle commands have a different loader that locks the tenant before reading the assignment: [policies:48](../../server/src/communities/policies.ts#L48).

The earlier recording-adapter observation counted the following successful, single-attempt commands. It did not connect to PostgreSQL or measure network latency, RLS work, planning, execution, waits or throughput. Candidate counts are deductions from replacing those call sites, not observed candidate execution:

| Path | Current recorded commands | Context candidate only | Joined facts only | Both candidates |
| --- | ---: | ---: | ---: | ---: |
| Account preferences read | 5 | 4 | 5 | 4 |
| Community details read | 10 | 9 | 8 | 7 |

Preferences: `BEGIN → context → eligibility → data → COMMIT`. Details: `BEGIN → context → eligibility → tenant scope → tenant SHARE lock → tenant fact → account fact → staff fact → projection → COMMIT`. Three fewer client commands in the latter path do not imply a 30% speedup. The proposed function still executes internal SQL and takes the same Auth lock; retries and denials have different counts.

Installed sources, rather than an assumed library contract, explain these commands:

- [Kysely 0.29.8](../../node_modules/kysely/package.json#L3) reserves one connection, uses a `SingleConnectionProvider`, awaits the callback, then commits or rolls back: [TransactionBuilder:679](../../node_modules/kysely/dist/kysely.js#L679). [PostgresDriver:49](../../node_modules/kysely/dist/dialect/postgres/postgres-driver.js#L49) sends `begin` unless explicitly configured otherwise; the application does not set transaction isolation. Verify the actual session default rather than assuming it.
- The driver calls `client.query(sql, parameters)` for each execution: [driver:129](../../node_modules/kysely/dist/dialect/postgres/postgres-driver.js#L129). [SingleConnectionProvider:9](../../node_modules/kysely/dist/driver/single-connection-provider.js#L9) serializes consumers. `Promise.all` on the same transaction therefore does not remove these commands or make their database execution parallel.
- [pg 8.23.1](../../node_modules/pg/package.json#L3) defaults its pipeline flag from `Boolean(c.pipeline)` ([client:101](../../node_modules/pg/lib/client.js#L101)); the application does not enable it. Ordinary query dispatch waits for ready-for-query ([client:616](../../node_modules/pg/lib/client.js#L616)). Pipeline changes are a separate proposal, not a substitute for this analysis.
- Kysely preserves the error object while extending its stack ([stack utility:3](../../node_modules/kysely/dist/util/stack-trace-utils.js#L3)); pg exposes `DatabaseError` from `pg-protocol` ([index:10](../../node_modules/pg/lib/index.js#L10)). Kysely awaits rollback before rethrowing; if rollback itself fails, that failure can replace the original error ([TransactionBuilder:703](../../node_modules/kysely/dist/kysely.js#L703)). The application must continue failing closed rather than replaying an uncertain transport failure.

These installed `node_modules` links are local primary-source references; they require the lockfile-matched installation and are not tracked repository artifacts.

## Candidate A: ordered context setup and locked eligibility

**Implementation authorized 2026-11-11.** After accepting B, the user requested an implementation incorporating A as well. The new local checkpoint adds the invoker orchestrator below and changes only the authenticated transaction setup call; B, anonymous transactions, HTTP behavior and retry ownership remain intact. Add a forward migration, one runtime EXECUTE grant, readiness/catalog reconciliation and real-role tests of ordering, post-return context lifetime, Auth races and rollback/retry isolation. The existing narrow Auth definer remains an active dependency. Null identifiers fail closed; HTTP identity and operation IDs remain server-verified/generated UUIDs.

Preserve original source `ede7a14` and B source `399e50d` separately. Evaluate baseline, A-only (derived experiment source), B-only and A+B on the same migrated local database, with the existing staged screen and full measurement criteria. Derived experiment sources are confined to ignored artifacts; the application has one implementation. Renew tokens outside timing and retain failed samples. Clean replay, populated forward upgrade, exact function/grant review and the existing correctness gates must pass before adopting and independently committing A+B. No hosted migration or deployment is authorized by this checkpoint. These gates are now complete as recorded below; the earlier B evidence remains historical evidence, not results for A.

The existing [Auth primitive](../../supabase/migrations/20261103000100_preferences_api.sql#L17) is PL/pgSQL `SECURITY DEFINER`, with an empty `search_path`, implicitly `VOLATILE`. It selects the current Auth user with confirmed/non-null email, non-anonymous status and no active ban, takes `FOR SHARE`, and returns `FOUND`. No later migration definition was found. It does not itself verify the application account exists; preserve each operation's existing missing-account behavior rather than silently extending this optimization's scope. The preferences suite explicitly expects missing-account 404 ([test:113](../../server/tests/preferences-local.mjs#L113)).

The original illustrative design below is now implemented by the separately authorized forward migration `20261111000100_actor_context.sql`:

```sql
create function app_private.begin_actor_context(p_actor uuid, p_operation uuid)
returns boolean
language plpgsql volatile security invoker
set search_path = ''
as $$
begin
  if p_actor is null or p_operation is null then
    return false;
  end if;
  perform pg_catalog.set_config('request.jwt.claim.sub', p_actor::text, true);
  perform pg_catalog.set_config('ct.operation_id', p_operation::text, true);
  return app_private.lock_eligible_actor();
end;
$$;
```

The caller would await `select app_private.begin_actor_context($1::uuid,$2::uuid) as allowed`, throw the existing `IneligibleActorError` on false, then run the callback. `BEGIN`, rollback/commit, error mapping and retry ownership stay in `database.ts`. Input types/null handling require parity tests with the existing verified context; no caller-supplied HTTP identity is introduced. The actor argument is still a trusted API assertion, not independent JWT authentication; a compromised runtime already can set actor context under the [accepted trust boundary](../20-persistent-api-transition-proposal.md#L93).

Separate `PERFORM` statements establish the dependency explicitly. PostgreSQL does not promise left-to-right expression evaluation: `SELECT set_config(...), lock_eligible_actor()` is insufficient. A sibling or unused CTE is not procedural sequencing; SELECT CTEs can be demand-driven, and materialization does not create a new statement snapshot. Do not conflate these rules with the separate exactly-once rules for data-modifying CTEs. Sources: [PL/pgSQL statements](https://www.postgresql.org/docs/17/plpgsql-statements.html), [expression evaluation](https://www.postgresql.org/docs/17/sql-expressions.html#SYNTAX-EXPRESS-EVAL), [WITH evaluation/materialization](https://www.postgresql.org/docs/17/queries-with.html#QUERIES-WITH-CTE-MATERIALIZATION).

Prefer an **invoker orchestrator calling the existing narrow definer**: setting custom context needs no new Auth privilege; only the Auth primitive needs elevation. The retained primitive is an active dependency, not a compatibility alias. Do not grant `ct_api` raw `auth.users` SELECT to eliminate it. A single expanded definer could also sequence the work but enlarges the elevated function's responsibility without reducing the client-call count further. If chosen instead, it requires a new privilege/function-disposition review. Function ownership, fixed search paths and exact EXECUTE grants matter independently of volatility. Revoke default PUBLIC execution and external-role execution and grant only the reviewed runtime signature in the same future migration transaction; inspect effective inherited rights. [PostgreSQL function security](https://www.postgresql.org/docs/17/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY) and [current restricted grants](../../supabase/migrations/20261103000100_preferences_api.sql#L25).

`set_config(..., true)` lasts through the current transaction; `false` is session-scoped and unsuitable. The function must run inside the existing explicit transaction on the same checked-out connection. Its `SET search_path` is restored at function exit; do **not** add function `SET` clauses for the actor/operation variables themselves, which would restore those variables on exit. [Configuration functions](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-ADMIN-SET), [function SET semantics](https://www.postgresql.org/docs/17/sql-createfunction.html).

The source-level distinction is concrete: function configuration creates a GUC nesting level and unwinds it on return ([PostgreSQL 17 fmgr.c, 658–719](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/utils/fmgr/fmgr.c#L658)); saved function settings restore, while other transaction-local settings merge/decrease into the enclosing transaction level ([guc.c, 2155–2210](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/utils/misc/guc.c#L2155)). Verify context **after function return**, not just inside the primitive, and after commit, rollback and subsequent pooled users. Pooler compatibility remains a separate gate if the connection topology changes.

## Lock waits and snapshot freshness

At `READ COMMITTED`, a new statement sees a new snapshot. A locking select waits for an already-selected row's concurrent updater and then rechecks the predicate against that updated row. This is why an uncommitted ban that commits before the Auth lock is acquired must deny the operation. Under Repeatable Read/Serializable, conflicting updates can instead require full transaction retry; do not claim the same fresh-snapshot behavior at those isolation levels. [PostgreSQL isolation](https://www.postgresql.org/docs/17/transaction-iso.html#XACT-READ-COMMITTED).

`VOLATILE` PL/pgSQL SQL commands obtain fresh query snapshots at Read Committed; `STABLE`/`IMMUTABLE` functions use the calling query's snapshot. Keep both orchestration and locking primitive volatile. This supports the internal ordered eligibility statement, **not** a claim that an unrelated outer joined query automatically refreshes its snapshot after waiting. [Function volatility](https://www.postgresql.org/docs/17/xfunc-volatility.html).

`FOR SHARE` conflicts with row update/delete locks (`FOR NO KEY UPDATE`/`FOR UPDATE`) and is held until transaction end. An already-authorized operation therefore orders before a later Auth ban; the ban waits. Replacing it with `FOR KEY SHARE` would weaken protection against non-key eligibility changes. A denied predicate or missing row supplies no durable row lock: a user already banned in the statement's snapshot may be denied without waiting for an in-progress unban. This is conservative denial, not proof of globally latest state. [Row-lock conflicts](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS).

The current predicate compares `banned_until` with `now()`, PostgreSQL's transaction-start time. A ban expiring during a wait can remain denied for this attempt. Preserve that existing temporal contract; changing to wall-clock time is a separate behavior decision. [Current date/time semantics](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT).

For community authorization, preserve the boundary `tenant lock statement completes → facts statement begins`. Locking the root in a CTE or adding `FOR SHARE OF t` to a joined fact query does not refresh other tables' statement snapshot after a wait. It can observe updated locked-row state alongside older joined authority. A materialized CTE does not fix snapshot age. This is an inference from the isolation and CTE rules above, and must be protected by deterministic concurrent regression tests.

## Candidate B: consolidate only the post-lock facts

Use a tenant-rooted Kysely query with two LEFT JOINs. Join each relation using **both** tenant ID and actor ID in its `ON` condition, and filter only the root tenant ID in `WHERE`. Select tenant status, account identity/standing and assignment identity/role/status/existing staff flags. Keep the existing action-specific loader exports and pure evaluators; do not create a universal permission context or move decisions into the database.

The two `(tenant_id,user_id)` primary keys make each child at most one row ([original schema:35–55](../../supabase/migrations/20261001000100_identity_tenant_schema.sql#L35)); verify their live catalog presence before benchmarking. `c.user_id` and `s.user_id` are useful non-null row-presence sentinels. Normalize absent joined children to the current `{ account: undefined, assignment: undefined }` shape; absent root yields `site: undefined` (although current services normally reject it before calling). Preserve `false` permission flags; never use truthiness of a permission to infer assignment presence. LEFT JOIN null extension and the difference between predicates in `ON` versus `WHERE` are specified in [PostgreSQL table expressions](https://www.postgresql.org/docs/17/queries-table-expressions.html#QUERIES-JOIN).

RLS still applies to each joined relation as `ct_api`. A hidden account/assignment must become an absent child, not remove the visible tenant root or become a successful default. Existing archive/G-02 fences and operation-specific 403/404 choices must remain intact. Select only already-granted sentinels/fields; confirm the exact runtime manifest rather than broadening grants to fit a query. RLS visibility is not interchangeable with physical existence, and table owners/definers can see different results. [PostgreSQL row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [current decisions:185 onward](../../server/src/communities/policies.ts#L185).

The join yields one coherent facts snapshot and removes two client submissions. Its preservation argument depends on every relevant writer taking the same tenant root lock. Current service/test evidence supports those callers, but future writer paths must preserve this condition. Keep independent preference saves' existing account coordination; do not introduce tenant locking there as part of this change. Do not combine the later protected projection or pagination with the facts query without a separate audience/serialization review.

## Retry and existing verification evidence

PostgreSQL recommends rebuilding the complete transaction and its decision logic for serialization failures; a deadlock can also merit retry. The installed application deliberately bounds this to three actual `40001`/`40P01` database errors. Preserve fresh context, actor check, tenant locks, facts, decisions, mutation and audit per attempt, one correlation ID, and zero external effects within the replayable callback. Keep business/stale/eligibility failures, arbitrary SQL errors, lock timeout and uncertain commits outside automatic replay. [PostgreSQL retry guidance](https://www.postgresql.org/docs/17/mvcc-serialization-failure-handling.html), [application implementation](../../server/src/database.ts#L44).

Regression evidence inspected during research and subsequently exercised by the live local suites below:

| Evidence | Relevant assertion |
| --- | --- |
| [preferences-local:93](../../server/tests/preferences-local.mjs#L93) | Observe actual blocking on an uncommitted Auth ban, commit ban, deny write. |
| [configuration-local:235](../../server/tests/configuration-local.mjs#L235) | Tenant-root wait followed by permission/archive change; fresh authorization after wait. |
| [configuration-local:290](../../server/tests/configuration-local.mjs#L290) | Opposite ordering and archive/copy coordination. |
| [records-local](../../server/tests/records-local.mjs) | Record authority and coordinated concurrent changes. |
| [transaction-retry-local:172](../../server/tests/transaction-retry-local.test.mjs#L172) | Revocation/ban between attempts, stale request, exhaustion, arbitrary-error exclusion. |
| [transaction-retry-local:235](../../server/tests/transaction-retry-local.test.mjs#L235) | Lost commit acknowledgement is not replayed; committed event remains singular. |

The retry suite induces genuine PostgreSQL errors with `DO ... RAISE ... ERRCODE` around real runtime-role database work ([FaultPool:16](../../server/tests/transaction-retry-local.test.mjs#L16)); distinguish this from independently provoking a naturally occurring deadlock/serialization conflict. Both forms belong in later verification.

## Live local verification — 2026-11-11

After the user's Docker restart, the local stack was healthy at database `127.0.0.1:54322` and Auth `127.0.0.1:54321`. The runner loaded `server/.env.local`, required a loopback `ct_api` URL for `/postgres`, and aligned its transport host/port in memory with `localStack()`/Supabase CLI status. It preserved the saved runtime credential and used the local stack's issuer and Auth configuration without printing secrets or editing environment files. An initial sandbox restriction on the npm cache was resolved by running the CLI-dependent checks with approved expanded permissions.

Read-only catalog queries confirmed:

- `current_user = session_user = ct_api`, PostgreSQL `17.11`, and transaction isolation `read committed`. The catalog probes used `BEGIN READ ONLY`; application fixture transactions used their normal read/write mode.
- `lock_eligible_actor`: owner `postgres`, security definer, volatile, fixed empty search path, executable by `ct_api`.
- `verified_user`: owner `postgres`, security definer, stable, fixed empty search path; `command_scope`: owner `postgres`, security invoker, stable, fixed empty search path. Both are executable by `ct_api`.
- The existing `checkRuntime(db)` readiness checks passed. Additional targeted checks confirmed no `ct_api` Auth-schema USAGE or Auth-user column SELECT and no `lock_eligible_actor()` EXECUTE for `anon`, `authenticated` or `service_role`. A first name-based Auth-table privilege probe correctly failed with `42501`; using the relation OID from `pg_class`/`pg_namespace` allowed inspection without granting access.
- Both `community_accounts` and `tenant_staff_assignments` have `PRIMARY KEY (tenant_id, user_id)`, confirming the proposed join's at-most-one-child assumption. This did not execute or validate the proposed joined query.

The following commands ran sequentially from the repository root through that environment-normalizing runner. Every suite exited successfully and completed its normal fixture cleanup:

| Command | Result and relevant coverage |
| --- | --- |
| `node server/tests/preferences-local.mjs` | PASS: real Auth/HTTP, current eligibility, actual blocking on a concurrent Auth ban, rollback, missing-account behavior and direct REST/GraphQL denial. |
| `node server/tests/configuration-local.mjs` | PASS: configuration audiences, archive restrictions, permission changes around root-lock waits, both serialization orders, trusted attribution and audit rollback. |
| `node server/tests/records-local.mjs` | PASS: staff/participant permissions, standing/archive/Auth restrictions, scoped pagination, bypass cases and both serialization orders. |
| `node server/tests/history-local.mjs` | PASS: history audiences/categories, reason isolation, pagination, current eligibility, bypass cases and both serialization orders. |
| `node --test server/tests/transaction-retry-local.test.mjs` | PASS: all 12 child scenarios (13 TAP tests including the parent); genuine server-injected `40001`/`40P01`, fresh authorization after revocation/ban, stale requests, exhaustion, atomic audits, anonymous retries, block retries and no replay after lost COMMIT acknowledgement. |

Expected error logs in the retry suite corresponded to its deliberate fault cases; no assertions failed. These results validate the **existing implementation**, not candidate A or B. They are not a new full migration/grant-manifest audit, proof of naturally generated deadlock/serialization failures, or a performance benchmark. No proposed function, joined loader, or production instrumentation was installed. The earlier local connectivity blocker is resolved; candidate implementation and measurement remain separate work.

## Reproducible measurement and acceptance plan

The original four-variant experiment follows; the authorized staged baseline/B subset is specified below. Candidate A still requires separate authorization. Do not run fixture-mutating suites against hosted data. Use a disposable, locally replayed PostgreSQL 17 database and the existing local Auth setup; fixture/admin clients may prepare data or coordinate Auth changes, but **every measured application query and authorization decision must use the real `ct_api` login**. No `SET ROLE` approximation, owner-role application timings, disabled RLS or widened runtime monitoring rights.

1. **Freeze the comparison.** Record git revision, lockfile hash, Node/installed package versions, database major/minor, migration head, CPU/memory, topology/RTT, pool maximum and all timeouts. Compare four variants: baseline, A only, B only, A+B. Use identical fixtures, response bodies, random seed, pool settings and isolation. Never compare a fresh pool baseline with a warm candidate. Keep the current HTTP baseline unchanged.
2. **Verify the runtime.** Read `current_user`, `session_user`, `current_setting('server_version')`, `current_setting('transaction_isolation')` and `pg_roles` flags on the actual pooled connection. Inspect `pg_proc.prosecdef`, `provolatile`, `proconfig`, owner and effective EXECUTE rights for both functions; inspect relation grants, primary keys and retained RLS. Verify no Auth-table grants were added and external roles still cannot invoke setup. Reject the run if the role/configuration differs. The current transaction builder inherits the database default, so pin benchmark sessions to recorded `read committed`; exercise higher isolation separately as correctness tests.
3. **Build a disposable harness.** Invoke the actual service path through the installed Kysely/pg stack, then measure the same endpoint through a listening Fastify server with real bearer verification. Obtain tokens before timing; do not count sign-in as request authorization. Capture pool acquisition start/end, `BEGIN`/commit/rollback timestamps, each `client.query` submission/completion, attempt number and final HTTP status. Use monotonic clocks and sanitized SQL fingerprints, never token/parameter logging. Correlate with backend PID and request ID. Existing [token verification](../../server/src/token-verifier.ts#L5) calls Supabase `getClaims`; record signing algorithm and actual JWKS/Auth requests rather than assuming verification is offline.
4. **Run a fixed matrix.** For each variant, test account-preference GET, community-details GET, authorized configuration PATCH with a real state change, and one history/records read. Use owner, authorized admin, ordinary member, missing assignment, pending/suspended/inactive account, archived owner/non-owner and missing tenant fixtures. Test production-shaped data volumes with a fixed seed, plus a small fixture for plan clarity. For warmed runs: 200 untimed requests, then 2,000 measured requests per endpoint at concurrency 1, 4 and 16 with pool max 4; repeat five times in alternating baseline/candidate order. Also use pool max 1 for context isolation. Report totals and failed requests, not success-only percentiles.
   Separate low-contention requests distributed across seeded tenants from requests contending on one tenant. Keep reads, genuine writes and successful no-op writes as distinct workloads; repeatedly saving the same value does not measure the mutation/audit path. Report allowed and denied fixture classes separately so a changing outcome mix cannot appear as a latency improvement. Use the same request schedule for each variant.
5. **Separate cold dimensions.** Measure 30 independent first-request runs for each of: new verifier with warmed pool; warmed verifier with new pool; both new; both warm. Use a new process where necessary to reset library/global caches, and report actual key-fetch/Auth network observations. A new process or pool is not a cold database buffer cache. Keep normal database-cache runs separate from any explicitly controlled disposable-database cold-cache experiment. Report HTTP and database-only results independently.
6. **Report metrics with attribution.** For each cell report p50/p95/p99 HTTP latency, verification time, acquisition wait, transaction duration, per-query duration, throughput, error/denial rate, retry counts and command counts. Distinguish client query duration (network + server + wait) from server execution and lock wait. Use a separate permitted observer for `pg_stat_activity`, wait events and `pg_blocking_pids`; sampling can miss short waits. Where already available, take per-variant `pg_stat_statements` deltas and record whether nested statements are tracked. Do not reset shared statistics. Explain internal function statements separately from one client submission. Sources: [activity/wait monitoring](https://www.postgresql.org/docs/17/monitoring-stats.html), [pg_stat_statements](https://www.postgresql.org/docs/17/pgstatstatements.html).
7. **Inspect plans.** Under the same `ct_api` context and root-lock sequence, capture `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` for old fact queries and the proposed join. Compare actual rows, estimates, loops, buffer hits/reads, RLS/subplan repetition, planning and execution cost. Keep instrumented plans outside timed samples; EXPLAIN ANALYZE executes the statement and has overhead. Use local read fixtures and roll back context transactions. [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/17/using-explain.html).

For deterministic concurrency tests, use two actors/connections plus an observer. Acquire the blocker lock first, launch the application request, wait until the observer confirms its backend is blocked, then commit or roll back the blocker. Do not substitute sleeps for observing the lock. Use a bounded 1.5-second observation deadline with the current two-second lock timeout; treat timeout before the intended release as invalid test setup, not successful authorization denial.

| Scenario | Required outcome |
| --- | --- |
| Auth ban/delete/unconfirmation wins, then request | Wait where the old eligible row is visible; deny after committed change; no callback mutation/audit. |
| Request's Auth SHARE lock wins, then ban | Existing authorized transaction finishes; ban waits until transaction ends. |
| Auth updater rolls back; ban expires/unban is pending | Preserve existing predicate/time behavior; never infer that missing predicate rows were locked. |
| Tenant writer revokes permission, changes standing/assignment or archives before reader/writer acquires root | Post-wait joined facts reflect committed change and preserve existing denial/projection. |
| Reader acquires SHARE root first; permission/archive writer follows | Reader's authorized projection completes before writer; writer waits. |
| Missing/RLS-hidden account or assignment | Exact old fact shape and 403/404 behavior; no accidental inner join or false-positive permission. |
| Real deadlock and serialization failure, plus controlled injected errors | At most three complete attempts; fresh eligibility/authority; exactly one committed semantic event set. |
| Revocation/ban between retries, stale inputs, arbitrary SQL errors and lock timeout | Correct denial/exhaustion; no inappropriate retry or retained facts. |
| Lost COMMIT acknowledgement | Report uncertain outcome without automatic replay. |
| Pool max 1: user A success/denial/error, then user B and anonymous request | Context persists after setup return but never leaks after commit/rollback; anonymous paths never inherit identity. |

**Correctness gates:** unchanged HTTP contract and projection/order/pagination; all nearest denials/direct-bypass cases; unchanged runtime/external grants and G-02; unchanged trusted attribution and audit cardinality; lock ordering and both commit orders; context lifetime; full retry behavior; clean migration replay/forward upgrade and exact function manifest if A adds a function. Run the applicable existing local suites plus `npm run check -w server`, `npm run test:http -w server`, `npm run test:local -w server`, lint/build and documented database gates after an authorized implementation. Review the diff independently before accepting an implementation checkpoint.

**Performance gates proposed for the experiment:** no statistically credible p95 regression above 5% in any warmed authorized endpoint/concurrency cell; no increased error/timeout/retry rate or material tail/lock-hold regression under contention; demonstrate the expected successful-path client-command reductions; and show a repeatable latency or capacity benefit with confidence intervals on the representative deployment topology. Report absolute milliseconds and uncertainty. These are experiment criteria, not newly accepted product SLOs. If benefits are within measurement noise, keep the simpler current path or accept only the independently useful candidate; do not justify new database surface using command counts alone.

## Candidate B checkpoint — authorized 2026-11-11

**Authorized 2026-11-11.** The user approved this Candidate B checkpoint and explicitly required measuring the unchanged baseline as well. The staged baseline/B experiment and correctness gates below now define execution scope. Candidate A and deployment remain separate. Preserve an exact baseline source snapshot before the loader edit and measure both variants against the same fixtures and environment.

**Proposal history.** The initial documentation-only continuation confirmed HEAD `ede7a14f780b61e4a377d8c9cbb134ce015d2463` and the three-read staff-facts loader; the report was then the only untracked work. The user subsequently approved execution, including the explicit baseline measurement requirement above.

Start with **Candidate B alone**. It removes two client submissions on affected community paths while keeping the current database interface and shared actor transaction unchanged. Candidate A removes one submission from every eligible-actor transaction, but adds a function, privilege review and context-lifetime verification. Its broader reach can be evaluated separately after the first comparison; neither candidate's benefit is established by these counts.

The authorized implementation scope is:

- Replace only the three reads inside private `loadCommunityStaffFacts` in `server/src/communities/policies.ts` with the tenant-rooted typed LEFT JOIN described above. Preserve the existing fact shape, absent-child normalization and every current staff flag. Keep `loadConfigurationFacts`, `loadAccountRecordFacts` and `loadHistoryFacts` as the operation-specific interfaces. The separate `loadStaffAssignmentFacts` still serves lifecycle operations and remains an active dependency.
- Keep tenant scope and the completed root-lock statement in the services before invoking the loader. Configuration, account-record and history callers currently establish this ordering. Preserve their decisions, subsequent projections, pagination and error behavior; introduce no shared permission context or production switch between implementations.
- Extend existing real-role coverage only where needed to establish joined-row parity and post-wait freshness. Cover visible/missing/hidden children, false flags, cross-tenant identities, standing and assignment changes, permission revocation and archive in both lock orders. Exercise mutation/audit rollback and retries through the existing operation interfaces. Keep Auth eligibility and pooled-context regression gates even though this candidate does not change their implementation.

**First measurement stage:** compare baseline with B only, using the harness/environment rules above. Start with community-details GET at concurrency 1 and 4, and account-preferences GET as an unaffected control; use the existing warmup, sample size, five alternating repeats and pool max 4. Record end-to-end and database timing separately, outcome mix and observed command counts. Inspect the old and joined query plans outside timed samples. Expected successful-path counts are 10 → 8 for details and 5 → 5 for preferences, subject to measurement confirmation. This is a screening experiment, not completion of the full acceptance matrix.

If the screen finds a correctness failure, unstable plans or no repeatable benefit, report that result before expanding the experiment. If it supports further evaluation, complete the baseline/B workload, denial, contention, cold-start and concurrency matrix above, together with applicable repository verification gates. A-only and A+B cells remain deferred until Candidate A is separately authorized. The user's approval accepts this staged narrowing and the experimental performance thresholds, without making them product SLOs. Local-loopback findings alone cannot establish benefit on a different deployment topology.

**Checkpoint deliverable:** the reviewed loader/test diff, reproducible measurement procedure and results added to this report, applicable verification evidence and reconciled implementation status. Commit an adopted implementation independently only after its gates and diff review pass. No migrations, grant changes, issue publication or deployment are included.

## Candidate B implementation and screening evidence

The private staff-facts loader now uses one typed tenant-rooted LEFT JOIN. Its operation-specific interfaces and fact shape remain unchanged. Identity sentinels distinguish absent/RLS-hidden children from existing assignments whose permissions are all false. Services still finish the tenant lock statement before loading facts. The lifecycle assignment loader remains an active dependency; shared actor transactions, schemas, HTTP contract fixture, migrations and privileges are unchanged.

The measured baseline is the original source at `ede7a14f780b61e4a377d8c9cbb134ce015d2463`, preserved before the application edit. All 22 source files were subsequently compared with that revision, normalizing only line endings. Both variants use the same installed packages, real local `ct_api` login, Read Committed sessions, pool maximum 4, synthetic owner/tenant, real ES256 bearer verification and workload order. The run used Node 22.22.2, PostgreSQL 17.11, an AMD Ryzen 7 9700X with 16 logical CPUs and approximately 61.7 GiB RAM, and Windows-to-Docker loopback. The migration head was `20261110000800`; lockfile SHA-256 was `e51894db5ade695eb0da31617735a093f1c501d65c513661b3c8791be0753745`.

The completed screen contains **160,000 measured requests**, plus 200 untimed warmups per cell: 2 variants × 2 endpoints × 2 transports × 2 concurrency levels × 5 repeats × 2,000 requests. Baseline/B order alternates by repeat. An earlier 16,000-request baseline-only preflight also completed; it is excluded from the paired results because its authentication timing hook ran too late. The paired screen instruments the native request listener before authentication and measures both service-only calls and a listening HTTP server. No measured request failed or retried, and every measured successful command count matched the prediction.

| Transport / endpoint | Concurrency | Baseline p95 (ms) | B p95 (ms) | Paired p95 change | Descriptive 95% interval |
| --- | ---: | ---: | ---: | ---: | --- |
| Service / details | 1 | 8.20 | 6.72 | -18.0% | -19.3% to -16.9% |
| Service / details | 4 | 8.88 | 7.64 | -14.0% | -18.2% to -9.5% |
| HTTP / details | 1 | 8.86 | 7.80 | -12.0% | -14.9% to -8.8% |
| HTTP / details | 4 | 9.68 | 8.52 | -12.0% | -18.5% to -5.4% |
| HTTP / preferences (control) | 1 | 4.65 | 4.66 | +0.4% | -1.3% to +1.5% |
| HTTP / preferences (control) | 4 | 4.83 | 4.93 | +2.1% | -1.9% to +6.3% |

The table averages the five run-level p95 values. Percentage estimates and intervals use paired log ratios, with 10,000 deterministic bootstrap resamples of the five paired runs. These small-sample intervals are descriptive, with no multiple-comparison correction; individual requests are not treated as independent experimental repeats. Details used **10 → 8** client commands; preferences stayed **5 → 5**. The unchanged control does not support attributing its small fluctuations to Candidate B.

Verification passed: server type checks; all 76 HTTP tests against the unchanged reviewed contract fixture; 279 frontend tests; lint and build; all nine local API fixture suites; 13 existing retry-suite tests; 272 pgTAP assertions in nine files; local SQL lint; generated database-type reproduction/drift and driver checks; the 134-file browser-boundary scan; and the direct Data API suite. The extended configuration suite passed against both baseline and B, covering absent/hidden children, all-false flags, cross-tenant identities, post-wait assignment/standing changes, natural deadlock and Repeatable Read serialization retries with singular audit events, and one-connection-pool context cleanup after success/denial/error followed by another actor and an anonymous operation. Test doubles were updated for the joined query result; the HTTP fixture was not regenerated.

Initial verification caught and resolved a generated `string` versus checked role/status-union type mismatch, obsolete three-read result queues in HTTP test doubles, and a test fixture incorrectly restoring approved standing while retaining a disciplinary restriction. The baseline failed that fixture too; the corrected test restores its prior suspended standing. The direct Data API suite also required the existing in-memory local transport normalization (saved port 15422 versus actual 54322). Saved environment files were not edited. Build output retains the pre-existing large-chunk warning.

Independent Standards and Spec reviews found no production defect. Review follow-ups added the all-false assignment assertion, retained failed benchmark samples before rejecting a cell, and removed a transient-observation false failure from the natural deadlock test. Source review is distinct from the executed runtime gates.

### Completed expanded comparison and acceptance

**Accepted locally on 2026-11-11.** The expanded result contains 180 authorized-workload cells (360,000 requests), 18 audience cells (36,000 requests), and 240 independent first requests. Each of the 18 authorized workload/concurrency combinations has exactly five valid baseline/B pairs. All accepted cells have the expected outcomes and command counts, with zero unexpected failures, timeouts or retries. Together with the earlier screen, this provides **556,000 valid paired warm/outcome requests**, plus the separate first-request observations. The preflight and rejected original-run cell are excluded, as documented separately.

The following are means of five run-level percentiles, not percentiles pooled across all requests. Intervals use the same paired-run descriptive bootstrap as the screen. Distributed cases rotate across 16 tenants; one-tenant cases isolate contention. Every real write changes data and produces its audit effects; no-ops are separate.

| Workload | Clients | Baseline p50 / p95 / p99 (ms) | B p50 / p95 / p99 (ms) | Paired p95 change | 95% interval |
| --- | ---: | --- | --- | ---: | --- |
| details / distributed | 1 | 7.68 / 8.88 / 10.18 | 6.47 / 7.49 / 8.57 | -15.6% | -19.0% to -12.1% |
| details / distributed | 4 | 8.19 / 9.62 / 11.23 | 7.03 / 8.57 / 10.61 | -10.9% | -15.3% to -5.9% |
| details / distributed | 16 | 31.08 / 35.48 / 38.92 | 26.82 / 33.15 / 38.84 | -6.6% | -13.8% to 0.4% |
| preferences / distributed | 1 | 3.93 / 4.59 / 5.36 | 4.02 / 4.61 / 5.39 | 0.5% | -2.0% to 3.1% |
| preferences / distributed | 4 | 4.14 / 5.18 / 6.27 | 4.12 / 5.10 / 7.08 | -1.5% | -5.5% to 3.2% |
| preferences / distributed | 16 | 14.89 / 17.58 / 20.52 | 14.81 / 18.07 / 20.68 | 3.0% | -8.4% to 13.6% |
| write / distributed | 1 | 30.57 / 34.25 / 38.37 | 29.17 / 32.85 / 36.74 | -4.1% | -5.5% to -2.8% |
| write / distributed | 4 | 32.67 / 39.34 / 45.65 | 31.40 / 36.80 / 42.39 | -6.3% | -10.4% to -3.4% |
| write / distributed | 16 | 128.83 / 141.91 / 155.12 | 122.93 / 133.94 / 150.21 | -5.6% | -7.6% to -2.5% |
| history / distributed | 1 | 8.72 / 10.13 / 12.23 | 7.70 / 9.14 / 11.72 | -9.8% | -12.4% to -7.1% |
| history / distributed | 4 | 9.50 / 11.98 / 15.44 | 8.26 / 10.45 / 13.08 | -12.4% | -18.0% to -7.3% |
| history / distributed | 16 | 37.25 / 44.12 / 58.12 | 31.91 / 39.71 / 49.10 | -9.5% | -17.4% to -2.3% |
| write / one-tenant | 1 | 30.45 / 34.28 / 38.53 | 29.39 / 33.21 / 38.19 | -3.2% | -5.1% to 0.3% |
| noop / one-tenant | 1 | 8.40 / 9.71 / 11.13 | 7.24 / 8.41 / 10.01 | -13.4% | -14.2% to -12.6% |
| write / one-tenant | 4 | 109.86 / 120.22 / 133.76 | 104.98 / 115.45 / 128.41 | -4.0% | -4.7% to -3.2% |
| noop / one-tenant | 4 | 20.73 / 23.03 / 26.20 | 15.96 / 18.95 / 21.95 | -17.7% | -19.6% to -15.5% |
| write / one-tenant | 16 | 440.19 / 472.20 / 490.47 | 421.84 / 451.79 / 469.89 | -4.3% | -5.3% to -3.3% |
| noop / one-tenant | 16 | 82.25 / 91.50 / 99.07 | 63.76 / 73.84 / 88.16 | -19.5% | -23.1% to -13.2% |

Successful details/history reads use **10 to 8** client commands, real writes **12 to 10**, no-ops **11 to 9**, and preferences **5 to 5**. At concurrency 1, details transaction p95 fell from 8.07 to 6.70 ms while verifier p95 stayed approximately 0.31 ms and pool acquisition p95 stayed below 0.02 ms. Details throughput increased from 127.7 to 151.7 requests/second at concurrency 1 and from 477.6 to 552.9 at concurrency 4. At concurrency 16, details pool-wait p95 fell from 25.88 to 23.98 ms. These observations locate the warm benefit in the application/database transaction path rather than reduced authentication work; five Auth network requests were observed across 360,000 warmed workload requests (four in candidate cells and one in baseline cells), plus one in a baseline audience probe. Token renewal itself occurred outside timing. The verifier therefore was mostly, but not entirely, local during these runs.

For contended real writes at concurrency 16, transaction p95 was 119.68 to 115.34 ms, pool-wait p95 354.40 to 339.73 ms, throughput 36.08 to 37.64 requests/second and HTTP p99 490.47 to 469.89 ms. Both variants reached three sampled blocked connections with pool max 4. Affected-path p99 values did not increase in the completed matrix. This supports the absence of a material tail/contention regression here; sampled waits and transaction duration are not exact isolated lock-hold measurements.

The unchanged preferences control fluctuated: at concurrency 16 its p95 estimate was +3.0%, with a wide -8.4% to +13.6% interval; at concurrency 4 its p99 rose from 6.27 to 7.08 ms despite a lower p95. **No warmed cell has a statistically credible p95 regression above 5%, but this does not prove a 5% non-inferiority bound or universal tail improvement.** Details at concurrency 16 and single-client contended writes also have intervals crossing zero. The repeated, clearly separated benefits in other affected cells satisfy the local benefit gate without claiming every cell improves.

Audience probes each produced exactly 2,000 expected responses per variant: admin, member without assignment, suspended account and archived owner returned 200; pending account, inactive account, outsider, missing tenant and archived non-owner returned 404. These one-repeat probes establish the observed outcome mix, not confidence intervals for audience-specific performance. Wider permissions, retries, stale inputs, writes, audit cardinality and bypass behavior are covered by the real-runtime suites above.

The resumed-run plans remained bounded: three baseline root results of one row each versus one joined result of one row, with indexed/nested-loop access and no row multiplication. The small fixture used 26 combined buffer hits for each variant; the seeded fixture used 24 each, with zero physical reads. Seeded EXPLAIN planning/execution totals were 0.399/0.247 ms for the three baseline statements and 0.313/0.243 ms for the join. These single instrumented observations establish plan shape, not a database CPU speedup. The original-run plans are also retained; their execution timings vary. Top-level statement deltas and per-command client durations are retained in the raw artifacts with the tracking limitations below.

First-request observations use the archived-owner details fixture left by the audience matrix, 30 independent processes per variant/configuration, with alternating order:

| Pool / verifier | Baseline p50 / p95 (ms) | B p50 / p95 (ms) | Auth requests per observation |
| --- | --- | --- | ---: |
| New / new | 51.37 / 57.56 | 50.61 / 66.20 | 1 |
| New / warm | 39.89 / 45.13 | 39.06 / 45.11 | 0 |
| Warm / new | 41.21 / 48.23 | 40.14 / 43.48 | 1 |
| Warm / warm | 31.50 / 37.34 | 30.69 / 37.83 | 0 |

All 240 first requests returned 200 with 10 baseline or 8 candidate commands. Cold evidence is mixed: the both-new p95 increased by 8.64 ms despite a slightly lower median. These small descriptive samples do not establish a cold-start benefit. The accepted p95 threshold applies to warmed authorized workloads; the cold results remain an explicit limitation, not omitted evidence. No database cold-cache or hosted-topology experiment was performed.

The local correctness, command-count, repeatable warm-benefit and contention gates pass. Independent source review and completed runtime verification support adopting B within this checkpoint. No migration, privilege change, HTTP contract change or deployment is included. Candidate A still requires separate authorization and evaluation.

### Expanded-run integrity and interruption

The original expanded run crossed local Auth's one-hour token lifetime during repeat five, baseline real writes against one tenant at concurrency 1. That 2,000-request cell contained 1,742 successes and 258 failed samples. An early authentication response exposed a benchmark-only `onSend` assumption that the later request hook had run; its missing measurement record obscured the response as synthetic status 599. The harness rejected the cell and preserved it in `full-run1.json`. A focused listening-server check with the real verifier confirmed that an expired token returns 401 before database work and that the corrected hook retains the pre-authentication measurement. No application-source change was needed.

The resumed run renews tokens before each workload pair, outside warmup/timing. It retains only the 168 complete, successful original cells (336,000 requests), reruns both variants of the rejected pair, and completes the remaining matrix. Resume rejects duplicate/incomplete/failed pairs and validates source, lockfile, runtime and migration identity. The original run predates candidate-manifest recording at startup: its candidate hashes were captured at 22:04 UTC **during** that run, with source unchanged since launch. All 22 hashes were rechecked before resuming. A separate annotated `full-resume.json` supplies that provenance; the original `full-run1.json` is unchanged. These are not claimed to be start-time candidate-hash evidence. The rejected cell is excluded from latency comparisons, not counted as an optimization benefit.

### Reproducing the comparison

The opt-in [benchmark](../../server/tests/auth-optimization-benchmark.mjs), [cold worker](../../server/tests/auth-optimization-cold-worker.mjs) and [summary tool](../../server/tests/auth-optimization-summary.mjs) use existing dependencies. Run from the repository root against the local stack, with the existing local `ct_api` credential in `server/.env.local`:

```powershell
node server/tests/auth-optimization-benchmark.mjs snapshot ede7a14f780b61e4a377d8c9cbb134ce015d2463
node server/tests/auth-optimization-benchmark.mjs compare
node server/tests/auth-optimization-benchmark.mjs full
node server/tests/auth-optimization-summary.mjs server/test-results/auth-optimization/compare.json
node server/tests/auth-optimization-summary.mjs server/test-results/auth-optimization/full.json
```

`snapshot` verifies an existing baseline directory or materializes the pinned Git source; it refuses to overwrite differing source. Each run verifies the baseline bytes before importing them and records candidate source hashes, migration head, package/lockfile versions, role, isolation, pool limits and timeouts. The runner checks loopback/database/runtime identity and normalizes only the in-memory transport host/port to local CLI status. It does not edit saved credentials. Keep tests, other benchmarks and application writes separate from timed runs.

The full run seeds 16 tenants, 51 accounts per tenant and 1,000 historical action rows per tenant, then measures details, preferences, real detail PATCHes and history at concurrency 1/4/16. It separately measures real writes and no-op PATCHes against one contended tenant. Each authorized-workload cell has five alternating baseline/B repeats, 200 warmups and 2,000 timed requests. Named audience/denial probes use 200 warmups and 2,000 timed requests per variant at concurrency 1; they check outcome mix and are not five-repeat performance estimates. Existing real-role suites provide the wider operation-by-audience correctness matrix. The seeded sizes are a synthetic scale scenario, not a forecast of production volume.

The cold worker measures 30 independent first requests per variant for each pool/verifier warm/cold combination, using a fresh process for each observation. Module loading and application construction occur before timing; these are first-request measurements on the archived-owner fixture after the full audience matrix, not total process-startup latency or a cold PostgreSQL buffer-cache experiment. Tokens are obtained/refreshed before timing. Current harness revisions renew before full workload pairs to avoid the local Auth server's one-hour token lifetime becoming an authorization-outcome confound.

Raw samples, per-command timings, runtime metadata, plans, statement-statistics deltas and summaries live in ignored `server/test-results/auth-optimization/`. No tokens, credentials or query parameters are logged. A separate privileged observer samples lock waits without adding runtime grants. Plans are captured outside timing. `pg_stat_statements` is available with `track=top` and planning tracking off; deltas include top-level execution, not a separate breakdown of nested function statements. Shared statistics are not reset. Short lock waits can escape sampling.

If a run is interrupted, preserve its original JSON and pass its path as the final argument to `full` to resume only complete valid pairs. Both members of incomplete/failed pairs are rerun. Resume requires matching baseline/candidate source manifests, lockfile, runtime and migration head. Never infer a latency benefit from a changed denial mix or silently drop a failed pair; the summary tool lists excluded pairs and emits confidence intervals only for five valid repeats. Each invocation cleans up only its own synthetic fixtures in `finally`.

Candidate B implementation and local verification are complete. The checkpoint includes the independently reviewed loader/test changes and opt-in measurement utilities. If Candidate A is later authorized, review its function ownership/grants, context lifetime and migration/function-manifest changes independently. Hosted-topology measurement and deployment remain separate work; no deployment recommendation follows from local-loopback measurements alone.

## Candidate A implementation and verification - 2026-11-11

This follow-up supersedes B's historical "A deferred" status. The implementation and its local verification are complete. `database.ts` replaces two setup submissions with one call to `begin_actor_context(uuid,uuid)`. The function is owned by `postgres`, explicitly volatile/security-invoker, has an empty search path, and grants EXECUTE only to `ct_api` (in addition to owner rights). PUBLIC, anonymous, authenticated and service-role execution are revoked. The existing volatile Auth definer, predicate, SHARE lock and transaction-start `now()` behavior are unchanged. Context identifiers are verified/generated UUIDs; null inputs deny and malformed internal identifiers fail UUID conversion. No HTTP identity input, anonymous setup, product permission or feature API changes were introduced.

Migration `20261111000100` was applied only to the local stack. Before/after catalog and application-table checksum evidence establishes unchanged data, existing function definitions, relation/column privileges, RLS, triggers, defaults and external grants. There is exactly one new runtime EXECUTE signature and 19 application functions. The reviewed catalog fixture adds that function and migration while preserving earlier evidence formatting. A clean disposable replay and populated forward upgrade passed; the latter separately checks that this migration preserves every populated application table and the original Auth-definer body.

Verification passed before measurement: server type checking; all 76 HTTP tests against the unchanged contract fixture; all nine real Auth/HTTP feature suites; 13 retry tests; two database-type/generation/driver tests; the browser boundary scan; 272 pgTAP assertions; SQL lint; direct PostgREST/retired-interface/concurrent-slug checks; exact runtime and local catalog checks; 279 frontend tests; lint and build. The new actor-context suite has five child scenarios plus its parent and verifies real `ct_api` identity, grants/no raw Auth access, post-return settings and restored search path, trusted attribution, commit/rollback cleanup with one pooled connection, next-actor reuse, null/unknown/malformed IDs, committed/rolled-back Auth changes, deletion, both Auth-lock orders, pending unban and transaction-start ban expiry. Existing tests continue to cover anonymous reuse, natural deadlock/serialization, fresh eligibility on retries and exactly-once committed audit effects. The pre-existing bundle-size warning remains. A root npm argument-forwarding failure was resolved by running the same frontend suite directly with `npm.cmd test -w client -- --run`.

Independent Standards and Spec reviews found no production-boundary defect. Before timing, they prompted immutable derived-A source verification and retention of failed cold observations, including their variant/repeat/pool/verifier dimensions and available measurements. A focused expired-token cold-worker check returned a retained 401, zero database commands and positive request duration before rejection. Failed observations are not silently removed from evidence.

The four-variant harness verifies the original 22-file source snapshot at `ede7a14f780b61e4a377d8c9cbb134ce015d2463`, a separate 22-file B snapshot at `399e50dddf1262df789dc5113f69968816cc188b`, and current A+B source hashes. A-only is derived solely by replacing the original snapshot's `database.ts` with the current version; it is an ignored experiment artifact, not an application switch or compatibility interface. Existing snapshot bytes must match before reuse. All four variants use the same migrated database/runtime role and fixtures. The run records the two setup-function definitions, ownership, configuration and volatility, together with the source manifests and environment. Resume requires complete valid groups of all four variants and matching source/function/migration provenance.

Reproduction uses the same local-only prerequisites as the B procedure:

```powershell
node server/tests/auth-optimization-benchmark.mjs snapshot ede7a14f780b61e4a377d8c9cbb134ce015d2463
node server/tests/auth-optimization-benchmark.mjs snapshot 399e50dddf1262df789dc5113f69968816cc188b b
node server/tests/auth-optimization-benchmark.mjs compare-a
node server/tests/auth-optimization-benchmark.mjs full-a
node server/tests/auth-optimization-summary.mjs server/test-results/auth-optimization/compare-a.json baseline ab
node server/tests/auth-optimization-summary.mjs server/test-results/auth-optimization/compare-a.json b ab
node server/tests/auth-optimization-summary.mjs server/test-results/auth-optimization/full-a.json baseline ab
node server/tests/auth-optimization-summary.mjs server/test-results/auth-optimization/full-a.json b ab
```

Use `baseline a` and `baseline b` for the independent effects. `compare-a` preserves the original service/HTTP screening matrix across all four variants (320,000 completed timed requests); `full-a` preserves the 18 workload/concurrency combinations, five alternating repeats, nine outcome classes and four independent first-request configurations across all four variants (792,000 completed timed warm/outcome requests and 480 first requests). Warmups, sample sizes, synthetic scale, pool/timeouts, root-lock order and interpretation limits remain as documented above. Token renewal occurs between comparison groups, outside timing. The `-a` artifact names preserve the earlier B results. Completed results and adoption follow.

### Candidate A four-variant screen

The screen completed all 160 cells and **320,000 timed requests**, with five alternating repeats, no excluded groups, no unexpected errors or retries, and every expected command count. Both original and B source were measured again on the same migrated local database as A and A+B. The following p95 values are milliseconds and average the five run-level percentiles. Paired percentage intervals retain the earlier descriptive bootstrap limitations.

| Transport / endpoint | Clients | Original p95 | A p95 | B p95 | A+B p95 | A+B vs B change (95% interval) |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| service / details | 1 | 8.22 | 7.66 | 6.69 | 6.11 | -8.6% (-10.3% to -6.9%) |
| service / details | 4 | 8.91 | 7.81 | 7.92 | 6.67 | -15.7% (-18.8% to -12.2%) |
| service / preferences | 1 | 4.00 | 3.36 | 3.97 | 3.36 | -15.5% (-16.4% to -14.4%) |
| service / preferences | 4 | 4.05 | 3.41 | 3.98 | 3.53 | -11.4% (-14.3% to -7.6%) |
| http / details | 1 | 8.99 | 8.27 | 7.40 | 6.90 | -6.8% (-9.4% to -4.1%) |
| http / details | 4 | 9.57 | 9.27 | 8.39 | 7.99 | -4.8% (-9.9% to 1.7%) |
| http / preferences | 1 | 4.70 | 3.95 | 4.60 | 3.94 | -14.3% (-14.8% to -13.7%) |
| http / preferences | 4 | 5.39 | 4.32 | 5.01 | 4.81 | -5.3% (-15.8% to 9.8%) |

Adding A to B shows a repeatable single-client benefit: details HTTP p95 7.40 to 6.90 ms (-6.8%, interval -9.4% to -4.1%) and preferences 4.60 to 3.94 ms (-14.3%, interval -14.8% to -13.7%). Against the original, A+B details HTTP p95 is 8.99 to 6.90 ms (-23.3%, interval -24.5% to -22.1%). Four-client incremental HTTP intervals cross zero, so the screen does not establish improvement in every cell. B-only preferences uses unchanged source on that path yet also fluctuates relative to the original, reinforcing that these small-sample intervals and local timings are not a universal performance guarantee. The screen supports proceeding to the full matrix; it is not final A+B acceptance.


### Completed A+B expanded comparison and acceptance

**Accepted locally on 2026-11-11.** The uninterrupted four-variant run completed 360 authorized-workload cells (720,000 requests), 36 audience cells (72,000 requests) and 480 independent first requests. Each of the 18 workload/concurrency combinations has exactly five valid repeats for every variant; each audience has one complete four-variant group. No cell was excluded or resumed. Every measured response and command count matched its expectation, with zero unexpected errors, timeouts or retries. Including the screen, this checkpoint measured **1,112,000 warm/outcome requests**, plus 480 first requests. Warmups are additional and excluded from those totals.

Original source remains pinned to `ede7a14`, B to `399e50d`, A to the documented single-file derivation, and A+B to the current source manifest recorded at run start. All four 22-file manifests and the lockfile hash were rechecked after completion. PostgreSQL 17.11, Node 22.22.2, runtime role, pool maximum 4, fixture sizes and Windows-to-Docker loopback topology match the procedure above; migration head is now `20261111000100`. Both setup-function definitions and their owner/security/configuration metadata were recorded before timing. Final application checksums, function definitions, policies, grants, triggers, defaults and runtime metadata match the post-migration snapshot. A whole-catalog comparison initially also detected its capture timestamp and automatic Realtime date-partition rotation (November 8 removed, November 15 added); these infrastructure differences do not involve application tables or grants. The original and final snapshots are retained.

The following p95 values are milliseconds, averaged across five run-level percentiles. Percentage estimates use paired log ratios and the same 10,000-resample descriptive bootstrap as the screen. Five repeats and unadjusted intervals do not establish a universal 5% non-inferiority bound.

| Workload | Clients | Original p95 | A p95 | B p95 | A+B p95 | A+B vs original (95% interval) | A+B vs B (95% interval) |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| details / distributed | 1 | 8.91 | 8.21 | 7.54 | 6.96 | -21.8% (-24.4% to -19.2%) | -7.6% (-12.2% to -3.9%) |
| details / distributed | 4 | 10.18 | 9.11 | 8.18 | 7.66 | -24.4% (-32.0% to -17.5%) | -6.3% (-9.5% to -3.2%) |
| details / distributed | 16 | 36.34 | 34.39 | 30.93 | 29.66 | -18.4% (-24.3% to -10.0%) | -4.2% (-8.6% to 0.8%) |
| preferences / distributed | 1 | 4.60 | 4.01 | 4.61 | 3.97 | -13.9% (-16.3% to -11.3%) | -14.0% (-15.2% to -12.6%) |
| preferences / distributed | 4 | 4.96 | 4.33 | 4.94 | 4.47 | -9.8% (-13.0% to -7.0%) | -9.5% (-11.6% to -7.4%) |
| preferences / distributed | 16 | 17.12 | 15.40 | 17.08 | 14.48 | -15.3% (-23.1% to -8.2%) | -15.2% (-19.4% to -10.1%) |
| write / distributed | 1 | 34.38 | 33.89 | 33.05 | 32.36 | -5.9% (-6.7% to -5.1%) | -2.1% (-2.7% to -1.4%) |
| write / distributed | 4 | 37.67 | 38.20 | 37.09 | 36.17 | -4.0% (-5.8% to -1.9%) | -2.5% (-4.8% to 0.9%) |
| write / distributed | 16 | 145.77 | 151.35 | 138.26 | 135.67 | -7.0% (-9.4% to -4.5%) | -1.9% (-4.8% to 1.1%) |
| history / distributed | 1 | 10.19 | 9.61 | 8.80 | 8.17 | -19.9% (-21.1% to -18.7%) | -7.2% (-10.1% to -4.6%) |
| history / distributed | 4 | 11.45 | 11.02 | 10.56 | 9.67 | -15.6% (-19.5% to -11.3%) | -8.4% (-15.5% to -0.7%) |
| history / distributed | 16 | 44.10 | 42.30 | 39.47 | 41.37 | -6.9% (-21.2% to 12.8%) | 3.6% (-8.2% to 21.6%) |
| write / one-tenant | 1 | 34.82 | 33.70 | 33.42 | 32.32 | -7.2% (-9.6% to -5.8%) | -3.3% (-5.3% to -1.9%) |
| noop / one-tenant | 1 | 9.91 | 9.07 | 8.34 | 7.96 | -19.7% (-21.0% to -18.2%) | -4.6% (-7.9% to -1.3%) |
| write / one-tenant | 4 | 121.64 | 121.92 | 116.19 | 115.74 | -4.8% (-5.7% to -4.3%) | -0.4% (-1.3% to 0.2%) |
| noop / one-tenant | 4 | 23.05 | 23.15 | 18.81 | 17.94 | -22.2% (-23.7% to -20.4%) | -4.6% (-6.4% to -3.3%) |
| write / one-tenant | 16 | 470.09 | 471.94 | 450.08 | 447.63 | -4.8% (-5.6% to -4.2%) | -0.5% (-1.13% to -0.02%) |
| noop / one-tenant | 16 | 93.64 | 91.00 | 72.08 | 71.47 | -23.7% (-25.7% to -21.2%) | -0.8% (-2.4% to 0.6%) |

Adding A to B provides a repeatable warm benefit on details (one and four clients), preferences (all three concurrency levels), single-client writes, and history (one and four clients). For example, details HTTP p95 is **7.54 to 6.96 ms**, an incremental -7.6% (interval -12.2% to -3.9%), while the original-to-combined change is **8.91 to 6.96 ms**, -21.8% (interval -24.4% to -19.2%). Preferences p95 is **4.61 to 3.97 ms** versus B, -14.0% (interval -15.2% to -12.6%). A-only also improves single-client details/preferences versus the original; B-only preferences remains an unchanged-path control, with p95 estimates +0.2%, -0.3% and -0.1% and intervals crossing zero. A-only distributed writes at 16 clients are +3.4% with an interval of -2.5% to +12.2%; this experiment does not establish that A independently improves every workload.

Successful command counts for original / A / B / A+B are **10 / 9 / 8 / 7** for details/history, **5 / 4 / 5 / 4** for preferences, **12 / 11 / 10 / 9** for real writes and **11 / 10 / 9 / 8** for no-ops. Counts include transaction boundaries. Details transaction p95 at one client is 8.15 / 7.50 / 6.80 / 6.20 ms; verifier p95 stays approximately 0.29 ms and pool acquisition below 0.02 ms. Details throughput is 125.6 / 135.5 / 148.6 / 162.1 requests/second at one client, and 472.1 / 511.8 / 561.6 / 609.0 at four clients. These measurements place the incremental benefit in the transaction path, without claiming zero Auth network work: 12 Auth requests occurred during the 720,000 warmed workload requests (original 1, A 4, B 4, A+B 3), plus one original-variant archived-owner probe. Token renewal itself remained outside timing.

Under single-tenant contention, A adds little to B's real-write throughput: at 16 clients, original / B / A+B are 35.79 / 37.41 / 37.50 requests/second. Their transaction p95 is 120.96 / 116.38 / 115.57 ms, pool-wait p95 353.55 / 338.27 / 336.52 ms, and HTTP p99 486.75 / 475.46 / 471.58 ms. All variants reached three sampled blocked connections. Across the four- and sixteen-client single-tenant write/no-op cells, A+B p99 changes versus B range from -4.8% to +2.1%, with lower p95 and comparable or lower transaction/pool-wait values. No material contention-tail or sampled-lock regression is demonstrated. This fits A removing setup before the tenant lock while B removes reads within that critical section; it does not measure exact isolated lock-hold duration.

**Saturated history is an explicit limitation.** At 16 clients A+B p95 is 41.37 ms versus B's 39.47 ms: +3.6%, with a wide -8.2% to +21.6% interval. Mean run-level p99 rises from 46.42 to 55.90 ms (+20.4%), compared with original 55.39 ms. A+B's fourth repeat has p95/p99 55.41/103.79 ms; its other four p99 values are 41.66 to 46.27 ms. The original also has a separate 89.93 ms p99 repeat. All samples remain included; the cause of these spikes is not established. No blocked database connection or Auth network request was sampled in those history cells, but pool wait and transaction tails increased during the spike. This is not evidence of universal tail improvement. Other small A+B-versus-B p99 increases remain visible in raw summaries, including distributed writes at 16 clients (147.74 to 147.95 ms) and history at four (12.72 to 12.83 ms).

No warmed authorized cell shows a statistically credible p95 regression above 5% for A+B versus either the original or B. The repeatable benefits, zero unexpected outcomes/retries, exact command reductions and unchanged correctness boundary satisfy the agreed local acceptance gates. Wide intervals, the history tail spike and small contention increments constrain the claim; they are not removed or treated as proof of non-inferiority.

Audience probes each produced exactly 2,000 expected responses per variant. Admin, member without assignment, suspended account and archived owner returned 200; pending account, inactive account, outsider, missing tenant and archived non-owner returned 404. These are outcome checks, not five-repeat audience-specific performance estimates. Staff-fact plans remain bounded: three one-row results for original/A versus one one-row joined result for B/A+B, indexed/nested-loop access, no row multiplication and no physical reads. All variants used 20 combined buffer hits on the small fixture and 24 on the seeded fixture. Seeded planning/execution totals were 0.386/0.299 ms (original), 0.392/0.294 (A), 0.334/0.246 (B) and 0.302/0.240 (A+B). These single instrumented plan observations establish shape, not a CPU-speedup estimate; top-level statement deltas retain the earlier tracking limitations.

All 480 first requests returned 200 with expected command counts. Each pool/verifier combination has 30 independent processes per variant, using the archived-owner details fixture. New verifiers made exactly one Auth network request per observation; warmed verifiers made none. Values below are p50 / p95 milliseconds across those 30 observations, not means of workload repeats.

| Pool / verifier | Original p50 / p95 | A p50 / p95 | B p50 / p95 | A+B p50 / p95 |
| --- | --- | --- | --- | --- |
| New / new | 52.14 / 58.47 | 51.47 / 54.65 | 51.09 / 55.80 | 50.34 / 57.94 |
| New / warm | 40.56 / 48.45 | 40.03 / 48.12 | 39.44 / 46.09 | 38.44 / 43.61 |
| Warm / new | 41.69 / 43.29 | 41.10 / 48.11 | 40.04 / 46.19 | 40.27 / 50.49 |
| Warm / warm | 32.17 / 37.80 | 31.39 / 33.42 | 31.61 / 38.18 | 30.73 / 38.79 |

First-request results are mixed. A+B improves the new-pool/warm-verifier p95 versus B, but its warm-pool/new-verifier p95 is 50.49 ms versus 46.19 ms for B and 43.29 ms for the original. Both-new A+B p95 is 57.94 ms versus B's 55.80 ms; warm/warm is 38.79 versus 38.18 ms. Lower medians do not establish lower cold tails. Module loading/application construction precede timing, and PostgreSQL buffers remain warm; these observations do not establish total startup, database cold-cache or hosted performance.

The reviewed local implementation keeps A with B. The migration is applied locally only; the hosted database remains outside this checkpoint. No HTTP contract fixture, frontend, saved credentials, existing Auth-definer body or product policy changed. The required local correctness/replay/grant suites, full measurement matrix and independent diff reviews support this checkpoint. Deployment and measurement on a representative hosted topology remain separate work.
