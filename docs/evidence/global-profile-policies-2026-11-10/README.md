# Global profile and block policies: issue #14

Local checkpoint, 2026-11-10. Spec: [issue #14](https://github.com/JonDManningDev/the-crowded-table-app/issues/14), parent #5, ADR 0001 and document 23. Baseline: `5fe94808359cfc610ce57a216038f3e17d146ff5`. Issue #13 was closed with its verification summary before this work began. Issue #14 had zero open blockers and no comments. No hosted work is included.

## Ownership and audience

User-account policies own global discovery, exact global-profile access, bilateral-block enforcement, outgoing caller scope and block-source admission. Community policies own the shared-community sharing predicate and exact community-profile source proof. The latter composes the existing community profile audience; ordinary community profiles remain independent of personal blocks. Services coordinate transactions/selectors, the existing caller advisory lock, mutations, projections and cursors. Routes, HTTP schemas and the reviewed contract fixture are unchanged.

Discovery requires discoverability and no block in either direction, including discoverability for self. Exact lookup permits self or an unblocked target with discoverability or sharing in any qualifying active shared community. Both participants must be approved/suspended for sharing; one qualifying true sharing preference suffices. No affiliation or raw preference is returned. A missing/hidden profile remains the same 404. Global fields retain the existing seven-field projection, Date serialization and UUID cursor order. Every list filters its authorized audience before ordering/cursor/limit.

Block creation excludes self and validates one of the two existing source variants: readable global profile, or an exactly linked community profile in the supplied tenant. Active community sources include inactive targets for eligible viewers; archived sources require the approved owner. A prior outgoing block remains a successful repeat even after source revocation. Unblock remains caller-only and idempotent. Incoming enforcement facts are never outgoing-list rows.

## Database cutover

Migration `20261110000800` retires `can_discover_global_profile`, `can_inspect_global_profile`, `can_block_from_profile` and `inspect_global_profile`, without CASCADE. It drops the discovery policy and source-proof INSERT policy dependency in the same cutover. Readiness requires all four signatures absent; the runtime manifest removes exactly their four EXECUTE entries. Relation/column grants, Auth access, attribution defaults, immutable identifiers, block self-exclusion/FKs and all restrictive G-02 fences remain unchanged. A lock-only target UPDATE USING policy permits FOR SHARE on the selected target account root; WITH CHECK false rejects peer mutations, verified by actual runtime SQL. External application grants remain empty. There is no new database function, compatibility alias or parallel legacy interface.

Runtime RLS now permits verified-context SELECT of the granted global profile/account fact columns. Existing self-only INSERT/UPDATE scopes remain. Blocks permit reading rows involving the verified actor in either direction, retain only `blocked_user_id` as an INSERT column, require the stored blocker to be the verified actor, and retain caller-only DELETE/no UPDATE. Target community sharing preferences are readable through a transaction-local exact-user selector; this is trusted runtime fact scope, not product authorization. Tenant visibility uses the existing own-relationship/exact-command paths, and existing community account/profile fact reads remain in place. Scoped sharing reads still pass independent archive RLS.

The API is now the sole product authorization owner for these operations. A trusted runtime can read hidden/blocked global facts and insert its own block without product source proof; tests explicitly distinguish this deliberate boundary from HTTP denial. It cannot forge another blocker's identity/attribution, edit peer global profiles/account settings, delete someone else's blocks, read raw Auth or bypass archived account content. The reviewed [before catalog](before-catalog.json) and after-catalog record grants, functions, definitions, policies and relevant triggers.

## Snapshot and coordination contract

Global discovery/exact admission and projection occur in a single statement snapshot. The exact target selector is established before the statement; no authorization result is cached across statements/requests. An admitted read may finish after a later block or sharing revocation commits; the next statement observes the new state.

Block/unblock retain the existing transaction-scoped advisory root `ct.profile-block:<actor>`, serializing one actor's commands, retries and conflict readback. They additionally acquire one canonical, case-normalized pair advisory root to coordinate both directions of block/unblock. Self comparison is UUID-case-insensitive too. Existing outgoing blocks return their idempotent result under these locks without requiring a source that may since have been revoked.

A new block from a global profile locks the target user-account row FOR SHARE, coordinating with discoverability UPDATE and identity deletion. If discoverability is false, community-owned facts identify the shared community roots; the service locks each tenant and its actor/target account rows FOR SHARE in tenant/user-ID order. The final INSERT predicate considers only the locked sharing roots. A path created beyond that candidate snapshot cannot become an unlocked authorization source. Any qualifying locked community suffices; the final predicate rechecks active lifecycle, both standings, sharing, profile presence and bilateral blocks. A discoverable target needs no community locks. Community-profile sources use the supplied tenant root then actor/target account rows, with fresh exact source proof after waiting. Profile presence is checked in the mutation; supported API writers do not delete profile rows.

These are the same roots used by actual source writers: global preference UPDATE locks the target user-account row; lifecycle/archive/staff commands lock tenant then account; independent sharing saves lock account then preference. Locks remain until block commit. A source revocation that holds a root first governs the post-wait INSERT; an admitted block makes the source transition wait. Pair coordination prevents an opposite-direction block from changing global-source eligibility mid-write. Actor Auth eligibility remains locked by shared infrastructure. The concrete block order is actor Auth, caller advisory, canonical pair advisory, global target account (global sources), then sorted tenant/account roots where needed. Confirmed deadlocks/serialization failures still retry the entire transaction. This does not claim a universal cross-domain lock order.

The first Spec review identified the missing shared-source coordination in an intermediate snapshot-only version. It was corrected without changing accepted requirements; the earlier permissive concurrency assertion was replaced by both-order lock barriers. Read-only snapshot admission remains unchanged.

## Verification

The ticket confirms the existing HTTP, actual Auth/runtime SQL, concurrency and compiler seams. A function-retirement assertion failed against the old catalog before implementation. Focused global-profile and retry suites then passed. Added cases cover repeated blocking after sharing revocation, discoverability/sharing/viewer-standing/archive changes during a caller lock wait, inactive-target source access, archived-owner source access, source-first and block-first barriers on discoverability, sharing, viewer standing and archive roots, opposite-direction pair coordination, and fresh authorization after a retry. Ordinary SQL errors/business denials and lost COMMIT acknowledgement are not replayed; uncertain committed blocks are handled by explicit idempotent repeats. Failed attempts/explicit rollback leave no block behind.

Existing coverage retains both block directions, global versus community independence, OR sharing, target/viewer standing, forged/cross-tenant/unsupported sources, confirmation validation, hidden/absent privacy, outgoing attribution, UUID pagination/scope/tampering, large default/max pages, filtering after a block, Auth ban and external REST/GraphQL denials. Direct-runtime assertions were changed only where the assigned product boundary moved. A preferences probe now explicitly selects its own row instead of depending on the old self-only SELECT policy; peer UPDATE and anonymous SELECT denials remain tested.

Executed commands (npm.cmd on Windows):

```sh
npm run check -w server
node --test server/tests/user-accounts-http.test.mjs server/tests/http-baseline.test.mjs
node --env-file=server/.env.local .scratch/issue-12-local.mjs node server/tests/global-profiles-local.mjs
node --env-file=server/.env.local .scratch/issue-12-local.mjs npm.cmd run test:retry:local -w server
npm run test:http -w server
node --env-file=server/.env.local .scratch/issue-12-local.mjs npm.cmd run test:local -w server
node --env-file=server/.env.local .scratch/issue-12-local.mjs sql test db --yes
node --env-file=server/.env.local .scratch/issue-12-local.mjs sql db lint --schema public,app_private --level warning
npm run verify:types
npm run test:types:local -w server
node --env-file=server/.env.local .scratch/issue-12-local.mjs node supabase/tests/direct_data_api.mjs
node supabase/tests/direct_data_api_upgrade.mjs
npm run lint
npm test -- --run
npm run build
```

Local target: API 127.0.0.1:54321, PostgreSQL 127.0.0.1:54322, Node 22.22.2. The existing untracked runner replaces obsolete forwarded transport ports with CLI-verified loopback endpoints. Docker checks run outside the sandbox. The forward migration was applied to the working local database; its lock-only target policy correction was applied from a SQL file and folded into the uncommitted migration before isolated replay/upgrade; no reset or hosted mutation/deployment occurred. CLI GraphQL issue reads lacked authentication; connected GitHub tools supplied the issue/comments and closed #13. Dependency metadata came from the CLI REST path.

Passed: all 75 HTTP cases, nine local Auth/runtime foundation suites, 13 retry assertions, the 134-file client boundary scan, all 279 client cases, 272 pgTAP assertions, SQL lint, compiler, root lint, production build, generated-type drift and both schema/driver tests, all 51 hostile PostgREST checks and isolated clean replay/populated upgrade. Native exit statuses were checked. The corrected source-lock implementation passed focused global-profile/retry/compiler/lint checks, including explicit selector/archive, unrelated-actor block facts, lock-only peer-write denial and UUID-case handling. All listed full gates were then rerun successfully against the corrected implementation and migration; no required gate remains failed or unavailable. The existing bundle-size warning remains. One intermediate assertion used the wrong application-error property and was corrected to `statusCode`; the intended 404 was already returned.

## Review

Initial Standards review reported no findings; initial Spec review identified the blocking source-lock gap described above. Two fresh independent review agents then reviewed the corrected nonempty staged checkpoint against `5fe94808359cfc610ce57a216038f3e17d146ff5`. They inspected source, tests and recorded evidence without rerunning mutating database suites. Final full verification and catalog refresh completed successfully before commit.

### Standards

No actionable findings or Fowler smells. The feature policy/service split follows ADR 0001 and document 23. Source locks and the locked-root predicate protect write authorization facts through commit. Replacement RLS removes product predicates while retaining storage safeguards. Tests distinguish HTTP authorization, trusted-runtime facts, identity/write restrictions, concurrency and transaction retries.

### Spec

No findings in the corrected implementation. Source locks coordinate with actual discoverability, sharing, standing and archive writers. Canonical bilateral coordination protects opposing blocks; repeats retain their successful outcome after source revocation. Function/business-policy retirement, community-owned source proof, independent community identity, projections, pre-pagination filtering, privacy, mutation scope and G-02 match the accepted contract. The initial source-lock finding is resolved, with both-order barriers and full corrected-suite verification.

Review summary: final Standards 0 findings; final Spec 0 findings. This completes the locally verified issue #14 checkpoint. Pre-existing unstaged planning/publication changes are excluded from the checkpoint commit. Issue #15 and hosted migration/verification retain separate scope.
