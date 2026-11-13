# Consolidate initial tenant scope into authenticated transaction setup

## Problem Statement

Authenticated community operations currently establish actor and operation context, verify and lock the actor's current Auth eligibility, and then submit a separate database command to establish a tenant that the API already knows. Users wait for that additional sequential database round trip without receiving additional functionality or protection from the separate submission itself.

The investigation identified 25 authenticated operations targeting an existing community that each set their initial tenant separately. Local scope submissions cost about 0.5 ms. Under the requested Virginia-client, California-API and Oregon-database planning scenario, one database round trip is estimated at 15–35 ms, with 25 ms centrally. A current details read is modeled near 258 ms; removing one submission could reduce it to roughly 233 ms. These are planning estimates, not hosted performance measurements.

## Solution

Establish a known initial tenant in the existing ordered authenticated transaction setup submission. Apply this to the 25 existing-tenant community operations, eliminating their redundant standalone scope command while preserving all current authentication, authorization, archive, attribution, transaction and HTTP behavior.

Keep community creation's later tenant assignment and all block-source scope changes at their current workflow points. Continue to perform real eligibility checks. Keep tenant-root locking separate from subsequent authorization-fact reads so decisions remain current after a lock wait.

## User Stories

1. As a community participant, I want eligible community requests to avoid unnecessary database round trips, so that responses arrive sooner over a remote connection.
2. As a community owner, I want configuration reads and writes to use the same consolidated setup, so that management benefits from the latency reduction.
3. As an API consumer, I want existing paths, inputs, responses and error statuses preserved, so that current clients continue to use the intended HTTP contract.
4. As an authenticated user, I want my identity to come from verified authentication, so that a tenant selector cannot impersonate another person.
5. As a community participant, I want a selected tenant to establish query scope without granting permission, so that selecting a community never substitutes for authorization.
6. As an ineligible user, I want protected requests to retain the current denial behavior, so that an existing token cannot bypass a later Auth restriction.
7. As an operator, I want actor eligibility checked and locked before application work, so that concurrent bans and deletions retain their established ordering.
8. As a user whose ban expires during a request, I want the existing transaction-start expiry semantics preserved, so that an optimization does not change eligibility policy.
9. As a community participant, I want requests for missing or inaccessible tenants to preserve their existing outcomes, so that private state is not disclosed.
10. As a community owner, I want my existing archived-community management access preserved, so that consolidation does not prevent authorized administration.
11. As a non-owner, I want archived-community restrictions preserved, so that setup cannot bypass the independent archive fence.
12. As a participant using lifecycle commands, I want the existing standing, request, discipline and staff transitions preserved, so that reduced latency does not change community policy.
13. As an applicant, I want my own request and review results preserved, so that onboarding remains consistent.
14. As an authorized staff member, I want candidate and pending-request lists to preserve their audiences and pagination, so that consolidation does not expose additional people.
15. As a participant viewing a community profile, I want existing profile visibility rules preserved, so that tenant selection cannot widen the profile audience.
16. As a participant editing my own profile, I want its existing independent-save behavior preserved, so that the optimization does not add a tenant-root lock.
17. As a participant editing my community preferences, I want existing account-lock ordering and statement-time lifecycle checks preserved, so that independent updates remain safe and concurrent.
18. As an authorized staff member, I want details, settings and copy operations to re-read authority after the tenant-root lock, so that a concurrent revocation governs the request correctly.
19. As a community owner, I want account lists and exact account facts to preserve their current permissions, so that faster setup does not broaden account access.
20. As a participant, I want member-directory queries to retain their scoped audiences and pagination, so that only eligible records appear.
21. As an authorized staff member, I want staff and participant-permission operations to retain their separate authorities, so that consolidation does not merge distinct permissions.
22. As a history reader, I want category, target, cursor and reason-visibility rules preserved, so that faster history queries reveal no additional information.
23. As a client sending an invalid cursor, I want the same validation outcome, so that internal setup ordering does not alter the public contract.
24. As a user changing community state, I want mutation and audit effects committed atomically with trusted attribution, so that faster requests remain accountable.
25. As a user repeating an already-applied action, I want existing replay, stale-input and no-op outcomes preserved, so that consolidation does not duplicate effects.
26. As a user whose transaction is retried, I want actor and initial tenant context established anew on every attempt, so that retries cannot use stale scope or authority.
27. As an operator, I want only confirmed serialization and deadlock failures retried within the existing limit, so that uncertain commits are not replayed.
28. As a user sharing a pooled database connection with later requests, I want context removed after commit or rollback, so that another request cannot inherit my identity or tenant.
29. As an anonymous visitor, I want public community queries to retain their separate context and access rules, so that authenticated setup does not affect public browsing.
30. As a community creator, I want the new tenant generated and scoped at the existing creation stage, so that this change does not alter creation or retry semantics.
31. As a user blocking another account, I want source validation and all discovered community-root locks preserved, so that a block cannot rely on an unlocked or invalid source.
32. As a user performing a global account operation, I want requests without an initial tenant to retain their current behavior, so that tenant scope remains optional and explicit.
33. As an operator, I want the application role to retain its least-privileged access, so that consolidation grants no raw Auth access or wider data authority.
34. As a maintainer, I want one authoritative transaction setup interface, so that obsolete overloads and compatibility paths cannot diverge.
35. As a maintainer, I want every transaction-level helper caller migrated consistently, so that removing a redundant scope statement cannot leave a caller unscoped.
36. As a maintainer, I want tests through the existing real HTTP and runtime database boundaries, so that verification exercises actual behavior without new production abstractions.
37. As an operator, I want clean replay and populated upgrade checks to preserve application data and audit history, so that the setup migration is safe to adopt locally.
38. As a maintainer, I want current and candidate performance compared with pinned sources and matching workloads, so that improvements cannot be attributed to changed fixtures or response outcomes.
39. As a product owner, I want modeled regional savings distinguished from observed local results, so that deployment decisions are based on accurately described evidence.
40. As a project owner, I want specification publication, implementation and hosted deployment to remain distinct stages, so that composing this spec does not silently start either implementation or deployment.

## Implementation Decisions

- **Scope inventory:** migrate the existing-tenant command dispatcher; four request/review operations; four community profile/preference operations; seven configuration/copy operations; three directory/account-fact operations; five staff/participant-permission operations; and history. These are 25 HTTP operations; the command dispatcher includes all its existing command kinds.
- **Shared transaction interface:** introduce one optional, narrowly typed initial-tenant option on authenticated transaction execution. Keep it separate from the identity-only authenticated context. When present it carries one tenant UUID; omission means no initial tenant. Do not introduce a general settings bag, universal permission context or eligible-actor flag.
- **Ordered database setup:** replace the existing actor-context invoker signature with one that also accepts a nullable initial tenant UUID. Set actor and operation context in explicit procedural order, invoke the retained Auth eligibility lock, and, only on success, establish the requested initial tenant before returning to application work. No initial tenant must leave an empty/unset transaction-local selector rather than inherited scope. Preserve the existing null actor/operation failure behavior and throwing transaction contract.
- **Validation and privacy:** keep validated HTTP UUID inputs and server-derived identity/correlation IDs. Invalid tenant UUIDs must not reach application work or leave reusable context. Unknown but well-formed tenant IDs are handled by existing operation queries and authorization; setup must not add a new tenant existence lookup or change missing/archived outcomes.
- **One submission:** actor/operation setup, eligibility locking and optional initial scope execute through one client submission on the same transaction connection. Use explicit procedural sequencing, not presumed expression evaluation order or sibling query expressions.
- **Feature ownership:** existing-tenant community entry points supply the initial scope. Remove their redundant standalone assignments. Audit exported transaction-level helpers and every production/test caller; update callers to the single intended pre-scoped contract rather than retaining fallback setup or compatibility wrappers. Creation and block workflows retain their necessary later assignments.
- **Authorization boundaries:** retain named feature policies, all later authorization reads and the separate tenant-root lock then fresh-facts statement boundary. Scope is a selector, not entitlement. Do not add root locks to independent self edits or fuse a locking statement with later facts to save another round trip.
- **Preserved database safeguards:** retain the dedicated runtime role, protected Auth accessor, Auth row-lock strength, transaction-start ban-expiry semantics, `verified_user`, `command_scope`, G-02 archive fences, integrity constraints, trusted stamps and append-only audit protection. The API continues to own semantic audit correctness/completeness; do not claim independent database semantic-event completeness.
- **Lifetime and retries:** all context is transaction-local. Re-establish it for every complete retry and preserve existing correlation identity, retryable SQLSTATEs, three-attempt maximum, denial/stale behavior and uncertain-commit exclusions. No external effects are added to retryable work.
- **Excluded workflow behavior:** global account operations omit initial scope; creation still creates its tenant at the current stage; all community-profile and global-profile block paths retain their existing late and potentially changing scopes. Public slug/public-tenant selectors remain separate. Health and standing operations remain separate.
- **Migration:** add a forward migration replacing the old setup signature and its exact execution grant. Keep the function a restricted volatile security invoker with a fixed safe search path and the Auth lock accessor as the narrowly privileged definer. Remove the obsolete signature; do not retain an overload or alias. Update readiness checks and reviewed runtime/catalog expectations deliberately. No table/data migration or broader privilege change is intended.
- **HTTP compatibility:** preserve the reviewed HTTP baseline without regenerating it to accept a regression. No frontend changes or new transport fields are required.
- **Delivery:** after a separate instruction starts implementation, complete the applicable local architecture/policy gates, diff review, documentation reconciliation and an independent commit. Hosted application rollout and hosted migration remain separate work.

## Testing Decisions

Use the following two existing behavioral boundaries, confirmed for publication on 2026-11-12. No new production test seam is needed.

1. **Primary boundary: real authenticated HTTP requests against the local API and database.** Exercise the migrated community operations using real identity verification and the actual runtime connection. Assert HTTP status, projection, audience, persisted state, attribution and audit effects. Pair allowed paths with their nearest denials, cross-tenant inputs, missing/archived tenants, owner/non-owner behavior, invalid cursors, no-op/replay/stale requests and current Auth restrictions. Use existing community lifecycle, configuration, records, history, self-service, directory and global-profile suites as prior art. Injection tests additionally protect wiring and the unchanged HTTP baseline; they do not prove database correctness.
2. **Necessary infrastructure boundary: real runtime-role database transactions.** Extend the existing actor-context and retry coverage for the new setup contract, restricted signature/grants, absent/null/invalid inputs, context visibility after function return, unchanged search path and callback denial. Verify commit/rollback/error cleanup, one-connection-pool reuse by another actor and tenant, and subsequent anonymous and unscoped requests. Exercise direct bypass attempts against retained integrity, attribution and archive safeguards. These properties cannot all be demonstrated through an HTTP projection alone.

Good tests assert observable outcomes and retained security contracts, not private helper call order or exact SQL formatting. Use the existing database/test harnesses and deterministic concurrency coordination. Do not replace real-role checks with privileged application execution or mocked eligibility. Administrative connections may prepare/observe owned synthetic fixtures only.

Concurrency and retry acceptance includes both Auth-update serialization orders; current ban-expiry behavior; tenant archive and permission changes while a request waits for its root lock; genuine deadlock/serialization retries with fresh initial scope, eligibility and facts; correct exhaustion; no replay of arbitrary errors or uncertain commits; and one committed set of semantic effects. Verify independent self edits preserve their existing lock behavior. Creation, multi-root blocks and anonymous operations receive regression coverage even though they are excluded from consolidation.

Migration acceptance includes clean replay, populated forward upgrade, preserved application data/history, exact setup-function ownership/configuration/execution privileges, old-signature absence, unchanged retained function bodies and unrelated grants/policies, and external Data API denial. Update expected manifests only for reviewed intended differences. Complete the applicable server type, HTTP, integration, database, client-boundary, lint/build and review gates required by the existing architecture and policy plans; an unavailable required gate must be resolved or explicitly adjudicated.

Performance verification uses the existing measurement facilities rather than a new behavioral boundary:

- Preserve immutable current-source and candidate manifests and distinct artifact names. Do not overwrite historical A/B snapshots or weaken their provenance checks to accept new source.
- Demonstrate exactly one fewer client submission per migrated attempt that previously reached its initial scope statement. Current successful details/history counts should fall from seven to six, and genuine details writes from nine to eight, including transaction boundaries. Preferences remain four. Actor rejection and invalid-cursor paths that previously stopped before scope are not expected to save a submission.
- Compare current/candidate details reads, genuine writes and history, with account preferences as the unaffected control. Use the same fixtures, outcomes, pool configuration and warmed state, at concurrency one and pool-sized concurrency, through the existing service and HTTP measurement paths. Keep writes distinct from no-ops and diagnostic instrumentation separate from latency samples.
- Use a proportionate repeated, alternating-order screen and record its sample counts, warmups and environment before running it. Report absolute time, latency tails, failures, retries and submission counts; preserve failed samples. No numerical performance acceptance threshold has been agreed, and the earlier million-request matrix is not automatically required. Investigate unexplained regressions or inconclusive evidence before declaring completion rather than introducing a post-hoc passing threshold.
- Retain the Virginia/California/Oregon estimate as sensitivity analysis: roughly 15–35 ms per avoided database round trip, 25 ms centrally. Do not claim this saving was measured locally or remotely, or derive hosted p95 by adding regional median RTTs to local p95.

## Out of Scope

- Caching eligibility, replacing real Auth checks with a flag, changing retained eligibility helpers or widening Auth access.
- Additional query consolidation, changing product audiences, merging the root-lock and later-facts statements, or redesigning transaction retry behavior.
- Moving tenant creation, consolidating block-source setup, changing multi-root lock order, changing public/global selectors, or frontend reorganization.
- Altering HTTP contracts, the reviewed HTTP baseline, semantic-audit ownership, G-02 or development-only compatibility policy.
- Optimizing the separate invariant-trigger cost observed in profiling.
- Deploying or benchmarking the user's hosted infrastructure, selecting/changing hosting regions, adding replicas, or making production latency/capacity guarantees.
- Repeating the entire earlier A/B benchmark matrix without a concrete need, or adding compatibility overloads, aliases, parallel legacy interfaces or generic context infrastructure.

## Further Notes

The authoritative starting point for the investigation was commit `d38872e`, after the completed actor-context and joined-facts optimizations and the assignment-presence simplification. Revalidate the current checkout before implementation; do not redo completed work or relabel prior measurements as current.

The secondary authorization investigation records the 25-operation inventory, real local call counts, retained caller integrity analysis and the regional model. The existing policy-ownership ADR and architecture/policy implementation plans remain authoritative. This specification narrows the next optimization to initial scope setup; it does not reopen accepted product-policy decisions.

The user approved publication with these testing boundaries on 2026-11-12. This specification is ready for the `ready-for-agent` triage label. Publication specifies the work and does not itself start implementation or authorize hosted deployment.
