# Secondary authorization investigation

**Follow-up specification published 2026-11-12:** the user approved [issue #18](https://github.com/JonDManningDev/the-crowded-table-app/issues/18), with the [local specification](../24-tenant-setup-consolidation-spec.md), for the initial-scope consolidation proposed here. Its test boundaries are confirmed and the issue is `ready-for-agent`; implementation and hosted work remain separate. The measurements and research conclusions below remain unchanged.

Date: 2026-11-12. Scope: investigation and local profiling requested through the secondary-authorization handoff. No optimization implementation or deployment is authorized. Existing A/B evidence remains in [the original experiment](auth-transaction-optimization.md).

**Investigation complete.** Recommend a separately authorized initial-tenant-scope change for the 25 existing-tenant community operations, followed by a small paired comparison and the required correctness gates. Keep `verified_user()` and its retained callers unchanged: repeated work is measurable, but a transaction-wide eligibility cache is not justified by this screen and would require a broader integrity design. No performance improvement from either proposed optimization has been measured. Source, migrations, grants and HTTP contracts are unchanged.

## Measurement plan

Pin the current source and lockfile; inspect the live local PostgreSQL catalog and real `ct_api` session. Inventory initial, discovered and changing tenant scopes. Measure current account-preference reads, community-details reads, genuine detail writes and history reads through current services, sequentially with one pooled runtime connection. Use three alternating instrumentation-off/on repeats, 50 warmups and 300 samples per cell; assess a small history and a separate 1,000-row synthetic history fixture. This is a bounded diagnostic screen, not the earlier acceptance matrix or a production-capacity claim.

Record actual function calls/time with `track_functions=all` and per-transaction statistics. Enable it only on the diagnostic runtime connection using a temporary local role/database default, restore that default immediately after connection startup, and verify restoration. This changes diagnostic configuration, not grants or function bodies. Keep instrumentation off for latency interpretation. Use a separate observer/fixture administrator; all workload queries use actual `ct_api` login. Record SQL templates and metadata only, never parameter values, credentials or application rows. Do not reset shared statistics. Preserve old artifacts and create a separately named evidence directory. Remove only owned synthetic fixtures.

Report command timing as an opportunity estimate, not a measured optimization benefit. Retained caller inventory, PostgreSQL evaluation semantics, trusted attribution, direct-runtime bypasses, transaction retries, archive/root visibility and changing-scope workflows govern any recommendation. Any proposed implementation needs its own correctness and comparison checkpoint.

## Tenant-scope inventory and proposed boundary

The current [community service](../../server/src/communities/service.ts) has 26 authenticated HTTP operations. Creation generates its tenant after loading creation facts. The other **25** already know an existing tenant from the validated operation input and issue exactly one standalone scope statement before scoped application queries:

| Operations | Count | Current scope owner and ordering |
| --- | ---: | --- |
| Lifecycle command dispatcher (all command kinds) | 1 | `communityCommand` → `scope` → action-fact root locks/reads |
| Own request, account review, staff candidates, pending requests | 4 | Each operation sets scope before its query |
| Exact community profile, own profile save, preference read/save | 4 | `scope`; preserve independent edits' existing statement-time checks and absence of a tenant-root lock |
| Details read/save, settings read/save, copy read/save/delete | 7 | `authorizeConfiguration` → scope → root lock → fresh facts |
| Member directory, owner accounts, exact account facts | 3 | `scope` or `lockAccountFacts` → root lock → fresh facts |
| Staff list/exact, participant-permission list/exact/save | 5 | `authorizeRecords` → scope → root lock → fresh facts |
| History | 1 | Cursor validation → scope → root lock → fresh facts |

For these 25 operations, one successful attempt can remove **one client submission**, not a lock, facts query or transaction boundary. A retry repeats the same opportunity per attempt. An actor rejected by setup never reaches the existing scope command, so it saves zero. Invalid history cursors also currently fail before the scope command; empty/missing/archive outcomes must retain their existing results. This is a source inventory, not a timed sample of every operation or every denial.

Exceptions and other owners:

- `createCommunity`: generates a new UUID inside the callback after creation facts. Keep its late scope assignment; moving ID generation across retries is unnecessary scope expansion.
- [User-account operations](../../server/src/user-accounts/service.ts): preferences, own profile, summaries, discovery, exact global profiles, block lists and unblock have no initial tenant command to remove. Summaries use the retained archive-safe projection; global-profile selectors use a separate `ct.profile_target`.
- `blockAccount` from `community_profile`: the source tenant is known at entry, but scope is currently set after advisory locks, duplicate detection and profile-target setup. Only a new eligible block reaches it. It is a conditional one-command opportunity, excluded from the proposed first change because it shares the multi-source workflow.
- `blockAccount` from `global_profile`: a discoverable target needs no community scope. Otherwise it discovers shared roots, locks them in the existing order and sets scope for each root. Preserve all dynamic assignments; do not replace them with a single initial tenant. The returned locked-root list remains part of the later mutation predicate.
- Anonymous landing/directory use `ct.public_slug`/`ct.public_tenant`, not authenticated scope. Standing and health paths are separate.

**Reviewable proposal, not an accepted implementation:** add an optional, narrow transaction option such as `{ tenantId: string }`, separate from identity-only `AuthenticatedContext`; pass it only from the 25 existing-tenant community entry points. Extend the existing ordered invoker to accept a nullable initial tenant UUID, set actor/operation, retain the Auth lock/eligibility check, then establish transaction-local tenant scope before returning success. A missing option represents no initial tenant scope. Replace the old SQL signature rather than retaining a compatibility overload. Do not introduce a settings bag or a caller-set eligibility flag. Remove the corresponding redundant service scope submissions only after auditing exported transaction-level helpers and test callers. Retain late scope setters for creation and multi-scope block work.

Setting a selector is not product authorization. Keep all root-lock and later-facts statements separate. Scope must exist before RLS-protected root selection; moving it after that selection would break visibility. Earlier scope must not create a new pre-authorization query. Keep UUID validation, current missing/archive behavior, G-02, dynamic scope changes, transaction-local lifetime and whole-transaction retry ownership.

## Retained eligibility caller inventory

The live local catalog contains 19 `app_private` functions, 47 application policies, 63 column defaults and 29 noninternal triggers. Its application policy rows and function definitions match the checked-in [catalog fixture](../../server/tests/fixtures/policy-catalog.json). The diagnostic saves definitions/ACLs/owners, policies, defaults, triggers, column grants and role flags; counts below refer to current objects, not historical migrations or runtime execution frequency.

| Caller | Use and integrity consequence |
| --- | --- |
| `command_scope()` | Calls `verified_user()` before returning the transaction tenant; used by 16 distinct policies spanning scoped community reads/writes and private requests/categories |
| Direct RLS expressions | 14 distinct policies invoke `verified_user()` directly: account/profile facts and self writes; community profile/preferences; related block facts, insert/delete; profile-target locking/sharing facts |
| `is_approved_owner(uuid)` | Invokes it for the owner exception in G-02; changing it affects archive fences even where an API audience allows access |
| `my_community_relationships()` | Invokes it in the protected caller-only archived relationship projection |
| `stamp_audit()` | Runtime writes require a currently verified actor; account provisioning derives the new account's user ID, while non-runtime maintenance uses `auth.uid()` |
| `attribute_command()` | Runtime audit insertion derives actor and operation, rejects missing attribution and mismatched `command_scope`; this includes another indirect eligibility call |
| `user_account_blocks` defaults | Both `blocker_user_id` and `created_by` default to `verified_user()` |

The five direct function callers above are body references; dependency-catalog edges alone do not enumerate all calls inside string-defined function bodies. `begin_actor_context()` calls `lock_eligible_actor()`, which reads/locks Auth directly; neither calls `verified_user()`. Retained `active_tenant()` checks tenant activity, not Auth eligibility. RLS alternative branches and planner evaluation can skip or repeat references. See [PostgreSQL 17 research](secondary-auth-postgresql-notes.md) for primary-source evaluation, instrumentation and snapshot details.

## Integrity assessment for eligibility caching

A successful Auth `FOR SHARE` lock protects the selected identity against concurrent eligibility updates/deletion until transaction end; current ban expiry uses transaction-start `now()`. This supports investigating redundant reads *inside that proven path*. It does not prove every retained caller arrived through it. Direct `ct_api` SQL can set custom context without invoking the orchestrator. It currently still encounters real eligibility checks in scopes, RLS, defaults and stamps. Replacing those with a freely caller-set boolean would let a direct runtime caller claim an ineligible identity is eligible and would weaken that retained safeguard, even though the API remains trusted to assert identity and decide product permissions.

Before any cache design could replace the existing helper, it must account for actor/tenant changes, failed/null setup, savepoint rollback and lock lifetime, complete retries, pooled reuse, anonymous and provisioning/maintenance paths, owner archive checks, both block defaults, and all stamping callers. A stale cached UUID must never attribute the next actor's writes. No cache mechanism or direct-bypass equivalence has been implemented or proved here. Do not widen raw Auth privileges, remove the lock, change `now()` semantics, or weaken G-02 in exchange for fewer calls.

## Reproducible measurements

Run from the repository root with this project's local Docker stack and existing local runtime credential available:

```powershell
node server/tests/secondary-auth-profile.mjs run
```

The [opt-in profiler](../../server/tests/secondary-auth-profile.mjs) checks loopback endpoints, database name and actual runtime login, normalizes only the in-memory runtime transport to CLI local status, and rejects existing `ct_api` sessions before starting. It creates fresh output names rather than overwriting A/B snapshots. It temporarily sets the local role/database `track_functions` default only while opening each diagnostic connection, immediately restores it and verifies exact restoration. No runtime monitoring privilege is granted. These connections are held without idle expiry. Normal service transactions and retained authorization functions execute unchanged.

Accepted evidence: `server/test-results/secondary-auth/1794498319399-1cae9e35/profile.json`, with a copy of the executed profiler alongside it. Source is **`d38872eb1050e58153a2d5e9d37a06b850cd510c`**, with hashes for every server source file, the lockfile and profiler. PostgreSQL **17.11**, Node **22.22.2**, Read Committed, real `current_user = session_user = ct_api`, migration **20261111000100**, local Windows-to-Docker transport at database 54322/API 54321. One owner, one tenant, one connection per instrumentation mode, concurrency one. Existing unrelated local data was not cleared or treated as a production dataset. The write uses a different name every time and verifies the returned value; it includes real mutation/audit work. History is separately reseeded with 10 and 1,000 owned synthetic events.

All **9,000 timed operations** completed (4,500 instrumentation off, 4,500 on), plus 1,500 warmups and four statement-level probes. Each of the five workload/fixture cells has three repeats of 300 measured samples per mode, after 50 warmups; mode order alternates. There were no sample failures or retries; every measured attempt had exactly one setup and the expected 4/7/9 commands. Timings include service execution, pool acquisition and commit, but **exclude HTTP, token verification and browser/network time**. This is not an end-to-end user-latency benchmark.

Ranges below are the minimum/maximum of the three repeat summaries, in milliseconds. Function time is the *instrumented* sum of `verified_user` execution within one transaction, not exclusive CPU time or proven removable request latency.

| Current operation | Commands | Uninstrumented mean | Uninstrumented p95 | Scope-command mean | Actual secondary eligibility calls | Instrumented eligibility total mean |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Account preferences read | 4 | 2.727–2.908 | 3.029–3.272 | — | 1 | 0.068–0.072 |
| Community details read | 7 | 5.227–5.418 | 5.677–6.233 | 0.492–0.510 | 12 | 0.527–0.545 |
| Genuine details write | 9 | 27.335–28.379 | 30.399–31.926 | 0.522–0.535 | 22 | 1.101–1.106 |
| History, 10 events | 7 | 5.440–5.725 | 5.870–6.327 | 0.491–0.516 | 13 | 0.562–0.595 |
| History, 1,000 events | 7 | 6.063–6.285 | 6.608–7.340 | 0.514–0.530 | 13 | 0.573–0.640 |

The scope submission represents roughly 8–10% of the measured read-service time and 2% of the write time. An initial-scope implementation would still execute `set_config` in PostgreSQL; the table is an opportunity estimate, not a promised saving. It does not establish production RTT, contention, cold-start or HTTP effects.

### What executes after the lock

The statement probes distinguish setup from secondary work:

- Setup executes `begin_actor_context` once and `lock_eligible_actor` once, with **zero** `verified_user` calls.
- Preferences execute `verified_user` once in the application read's RLS.
- Details execute 4 calls through `command_scope` in the root-lock statement, 6 in the joined facts statement, then 2 in the returned-details projection: **12** total.
- A genuine details write adds 7 in UPDATE (6 through scope and 1 through `stamp_audit`) and 3 in audit INSERT (scope RLS plus direct/indirect attribution checks): **22** overall, including the final projection.
- The initial tiny history probe had 14 calls; the separately measured 10/1,000-event fixtures each had **13** in every sample. In both measured sizes the count stayed bounded despite more stored events. This does not establish row-independent behavior for every policy/query, archive branch, category predicate or audience. Source-reference counts and one plan shape cannot substitute for measurement.

`command_scope` times include its child `verified_user` time, so they are not additive. The write's `protect_invariants` function alone measured **19.685–19.937 ms** per call under instrumentation, far above its secondary Auth total. This is an out-of-scope observation, not a diagnosed defect or authorization to change that safeguard. Function counters are read before COMMIT; deferred commit-time functions are excluded from those counters. The current deferred root-check body does not invoke `verified_user`; service timings still include COMMIT.

### Instrumentation and discarded evidence

PostgreSQL 17's `pg_stat_xact_user_functions` exposes backend pending counters that can span commits until a flush. The profiler takes a baseline **after BEGIN** and subtracts it from the sample **before COMMIT**, on the same physical connection; normal statistics flushing cannot occur inside that explicit transaction. It asserts exactly one actor-context call per tracked sample. The [primary-source note](secondary-auth-postgresql-notes.md#postgresql-17-pending-counter-correction) explains the implementation detail.

The instrumentation-on path adds two statistics queries per timed service operation as well as function tracking. Compared with the paired off runs, its mean was **1.379–2.289 ms higher**, depending on workload/repeat. That difference is the combined diagnostic effect, not the isolated overhead of `track_functions`. Only off-run values are used for baseline service latency. Instrumented function time is useful for attribution and ranking, but cannot be subtracted from uninstrumented service latency to promise a speedup. Shared statistics were never reset. `pg_stat_statements` remained `track=top`, planning off; no nested statement-cost claim is made from that extension.

The earlier artifact `1794498192811-39a310fd/profile.json` is **excluded in full**, including its latency cells: it sampled raw pending function totals and allowed the initially wrapped pool connections to idle out, losing both query capture and tracking on replacement connections. Its successful completion flag describes harness execution only, not valid evidence. Cleanup completed. Corrected counter deltas, connection lifetime and exact setup/command-count assertions were in place before the accepted rerun. Old artifacts are preserved without relabeling their numbers.

## Recommendations and next checkpoint

**Initial tenant scope: proceed only as a separately authorized implementation.** The opportunity is frequent and narrow: one submission in 25 community operations, around 0.5 ms in the measured local read/write paths, with no reason to alter eligibility semantics. Use the typed boundary and exclusions above. A paired current/candidate screen should measure details reads, genuine writes and history, with preferences as the unaffected control; include both service and HTTP timing at concurrency one and pool-sized concurrency. No new acceptance threshold has been agreed. Review paired repeat variation, latency tails and absolute gains before adopting; expand measurement only if the screen exposes uncertainty or a regression.

Required correctness work for that implementation remains:

1. Extend [actor-context tests](../../server/tests/actor-context-local.test.mjs) for the replacement signature, null/invalid tenant, post-return settings, success/denial/error rollback and commit cleanup; one pooled connection followed by another actor and an anonymous request; retained Auth wait/ban/expiry behavior and restricted grants.
2. Preserve configuration/record/history missing and archived tenant results, owner versus non-owner fences, and the separate root-lock → fresh-facts boundary. Pair allowed operations with nearest denials and real-runtime bypass checks. Do not regenerate the reviewed HTTP fixture.
3. Verify complete retries establish the intended scope anew after genuine deadlock/serialization failures, with fresh authorization and singular committed audits. Preserve creation's late assignment, changing block roots and unrelated global/anonymous operations.
4. Audit all transaction-level helper callers, remove replaced interfaces, update exact runtime/catalog expectations, and pass the applicable document 22/23 integration, concurrency, replay/upgrade and diff-review gates before committing. No hosted work follows implicitly.

**Repeated eligibility reads: keep the current safeguards.** The measured secondary work is real (about 0.53–0.64 ms for the measured community reads and 1.10 ms for a write), but no growing call count was observed between the two history sizes, and no user latency target or production bottleneck is established. A global eligibility cache changes more integrity boundaries than the initial-scope change for an unmeasured gain. If future measurements justify another optimization, investigate narrowly scoped statement-local reuse in the exact RLS expressions first; it can retain real eligibility evaluation rather than assert a transaction-wide flag. That is a research option, not a proved-safe rewrite or approved migration.

## Verification and limits

The accepted profiler run passed all 30 cells, expected outcomes/counts, exact before/after application catalog comparison, unchanged server-source hashes, exact restoration of local monitoring defaults, and removal of its owned tenant/Auth fixtures. Live function definitions and policies match the reviewed fixture. `node --check server/tests/secondary-auth-profile.mjs`, root `npm.cmd run lint` and `git diff --check` pass. No application, migration, grant, saved credential or HTTP-fixture edits occurred; no deployment or external publication occurred.

This investigation did not rerun the full authorization/concurrency suite because it implements neither optimization. It does not newly prove denied/archived behavior, candidate safety, production scale, cold performance, higher concurrency or full HTTP gains. Existing historical gates remain historical; the proposed checkpoint must perform the applicable current checks. No accepted business rule or completed A/B benchmark has been rewritten.

## Regional latency projection — requested 2026-11-12

The user requested a planning estimate before hosting the API: Virginia user, California API (Railway approximation), Oregon Supabase database, stable client connection. This section models that topology using the measured command counts and local service timings. It is **not a remote benchmark** and does not relabel the local evidence as hosted performance.

Railway documents US West Metal in California as `us-west2`; Supabase documents Oregon as AWS `us-west-2`. These similar region identifiers belong to different providers. [Railway regions](https://docs.railway.com/deployments/regions), [Supabase regions](https://supabase.com/docs/guides/platform/regions).

Public measurements support a useful order of magnitude: Azure's July 2026 P50 backbone measurements put Virginia (East US) to California (West US) around 69 ms; CloudPing's observed AWS Northern California/Oregon TCP-connect measurements are roughly 20–30 ms. CloudPing measures new TCP connections from Lambda to regional DynamoDB endpoints, including name resolution; it is a geographic proxy, not a measurement of our persistent PostgreSQL connection. Neither source measures a Virginia residential user reaching Railway or Railway reaching Supabase. The following allowances are **inferred planning assumptions**, not provider promises, p95 values or confidence intervals. [Azure latency data](https://learn.microsoft.com/en-us/azure/networking/azure-network-latency), [CloudPing measurements](https://www.cloudping.co/), [CloudPing measurement implementation](https://github.com/mda590/cloudping.co/blob/master/ping_from_region/app.py). The [regional source note](regional-latency-sources.md) records methodology and location qualifications.

| Path | Central round-trip assumption | Sensitivity range |
| --- | ---: | ---: |
| Virginia client ↔ California API | 80 ms | 65–100 ms |
| California API ↔ Oregon database | 25 ms | 15–35 ms |

All values are **round-trip times**: do not double them. The client path includes travel to the service region even if the provider terminates TLS at a nearer edge. Stable/reused client connections remove handshake costs, not that request/response travel.

### Model and assumptions

For the low-concurrency, warmed workload:

```text
T ≈ C + L + N × (D − d_local) + H

C       client/API round-trip assumption
D       API/database round-trip assumption
N       sequential database submissions, including BEGIN and COMMIT
L       measured uninstrumented local service mean
d_local 0.5 ms approximate local per-submission transport/driver allowance
H       1 ms modeling allowance for warmed HTTP/verification/serialization
```

`L` is the average of the three repeat means, not a percentile. The 0.5 ms correction prevents counting both the old local transport and its remote replacement; it is a rounded proxy informed by the small scope submissions, **not a separately isolated network measurement**. Keeping all local overhead instead would add only 2–4.5 ms to these estimates. `H` is an explicit assumption, not a new measured wrapper cost. Changing it from 1 to 5 ms adds 4 ms to every row and does not change the savings from removing submissions.

Assume the API also reuses established database connections, has warm signing keys/local token verification, processes small responses, and sees comparable application execution cost without material queueing, lock contention, retries or instance startup. The user specified only stable client connectivity; warm database pooling is an additional stated modeling assumption. The current verifier can instead contact Auth for legacy HS256 or key retrieval; those calls, pool creation/TLS/authentication, CORS preflight where applicable, large-payload transfer and rendering are additional costs. They are not hidden inside the estimates. [Current verifier](../../server/src/token-verifier.ts), [historical HTTP/verifier observations](auth-transaction-optimization.md#completed-ab-expanded-comparison-and-acceptance).

### Current operation estimates

| Operation | Submissions N | Local service mean L | Central client-visible estimate | Sensitivity envelope | If initial scope removes one submission |
| --- | ---: | ---: | ---: | ---: | ---: |
| Account preferences read | 4 | 2.833 ms | 182 ms | 127–242 ms | 182 ms (not applicable) |
| Community details read | 7 | 5.341 ms | 258 ms | 173–348 ms | 233 ms |
| Genuine details write | 9 | 27.781 ms | 329 ms | 224–439 ms | 304 ms |
| History, 10 stored events | 7 | 5.548 ms | 258 ms | 173–348 ms | 233 ms |
| History, 1,000 stored events | 7 | 6.157 ms | 259 ms | 174–349 ms | 234 ms |

The envelope uses `(C,D)=(65,15)` and `(100,35)` with the same measured mean and other assumptions. It describes alternative typical-network scenarios, **not a statistical latency distribution or a bound on real requests**. Rounded estimates are more usefully read as about **180 ms for preferences, 260 ms for details/history and 330 ms for a write**. Local p95 values cannot be turned into hosted p95s merely by adding median network RTT; network and contention distributions have not been measured.

### Consequences for consolidation

If equivalent database work is retained and one sequential submission is removed, the principal gain is approximately **one API/database RTT**: **15–35 ms**, centrally **25 ms**. The proposed combined initial scope therefore reduces a modeled 258 ms details read to about 233 ms (roughly 10%), and a 329 ms write to about 304 ms (roughly 8%). It does not remove a client/API round trip. The numbers assume the replacement function introduces no material new work or waits; this is a conditional saving, not an implemented or measured result.

Two safely eliminated submissions plausibly save 30–70 ms (50 ms centrally); three save 45–105 ms (75 ms centrally). The completed A+B command reductions were 10→7 for details/history, 12→9 for genuine writes and 5→4 for preferences. Their corresponding **network component alone** is therefore about 75 ms for details/history/writes and 25 ms for preferences in the central scenario. Their pinned local performance remains separate evidence; these are modeled network savings, not new benchmark results or an exact comparison against current source.

At the central assumptions, current details spend about 175 ms on seven database round trips versus 80 ms on the client/API path. Even the low 15 ms database scenario spends 105 ms on those submissions. Thus consolidation is a meaningful design priority now; it need not await remote deployment to justify the narrow initial-scope checkpoint. Avoid fusing the tenant lock and subsequent fresh-facts statement into one stale snapshot just to remove a round trip. The previously identified correctness gates remain mandatory.

This projection does **not** strengthen the case for replacing `verified_user()` with an eligibility flag: those repeated function calls happen within PostgreSQL and incur no California/Oregon trips. Their measured sub-millisecond/read and approximately 1.1 ms/write work remains a much smaller opportunity than removing a network submission. Prefer safe round-trip reduction over a broad eligibility-cache redesign.

Longer database waits also keep transactions, locks and pool slots occupied longer, so saturated performance cannot be inferred by shifting the old local concurrency curves. Separately, if the future API can be placed closer to the database, every retained submission benefits; for illustration only, reducing D from 25 to 5 ms saves 140 ms on a seven-submission request, holding C fixed. Five milliseconds is a hypothetical sensitivity case, not a supported claim about a Railway region or a proposed hosting change. Keep the user's California/Oregon topology as the planning baseline.

Arithmetic was reproduced from the accepted raw artifact's uninstrumented cells. Regional-source research and this modeled projection changed documentation only; no hosted requests to the user's infrastructure, new workload, application change or deployment occurred.
