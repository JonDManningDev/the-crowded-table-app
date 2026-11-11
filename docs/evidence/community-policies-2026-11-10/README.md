# Community action policies - issue #8

Authorized by the user's request to implement [issue #8](https://github.com/JonDManningDev/the-crowded-table-app/issues/8), after closing issue #7 at `de1188c`. Parent #5, ADR 0001, document 23 and the intended access matrix govern this checkpoint. Configuration/archive workflow cutover, record-management policies, semantic-audit cutover, remaining profile/directory/block policies and hosted work remain separate tickets.

## Ownership and operation contract

`communities/policies.ts` owns lifecycle/staff fact loaders, pure decisions, denial requirements and request/review/candidate/queue audience predicates. Policy facts and decisions stay local; operation contracts and staff flag constants remain in `types.ts`. There is no registry, universal permission object, new workflow endpoint or compatibility alias.

Services establish tenant scope, coordinate loader/lock order, invoke requirements and perform mutations/workflow effects. The command sequence is verified actor Auth share lock, tenant root update lock, target account update lock, then target Auth share lock for initial staff grant. Facts are loaded after waits. Candidate listing uses an Auth fact without locking, in the same SQL statement as its audience and projection. This documents these operations' order, not a universal order for every future writer. Actor eligibility, identity/operation binding and full-transaction retry retain their shared owner.

Creation verifies the atomically provisioned application root and keeps explicit name/location/profile normalization before SQL. Its storage-failure branch remains unavailable, not a new audience decision. The HTTP test verifies normalized SQL parameters independently of tenant/profile normalization triggers. Creation roots, owner flags and initial events are unchanged.

The migration preserves current join/request replacement, first approval, revisions, restricted-return review, clearance, owner immunity, combined account/staff discipline, audit-only delegation, paused resumption, owner-only reviewed revoked reappointment and repeated-input outcomes. Returning membership does not restore staff. Approval queues deliberately do not filter applicants by Auth ban. Initial staff grant retains its protected target-Auth eligibility check; resume/reappointment retain their existing documented conditions rather than acquiring a new target-Auth rule. Audiences stay before pagination; queue visibility does not confer action authority. Exact fields/errors and the reviewed HTTP fixture are unchanged.

Common command admission now includes the existing archive-owner decision because archive shares this command boundary. Archive workflow, configuration authorization and SQL loggers remain unchanged for issue #9. Lifecycle/staff semantic event writers and database classification remain in place for issue #11; no event is duplicated or moved in this checkpoint.

## Forward migrations and trust boundary

`20261110000100_community_action_policies.sql` replaces the mixed `is_staff_candidate(uuid,uuid,boolean)` with `auth_identity_eligible(uuid,boolean)`. The new private definer has an empty search path, returns only confirmed/non-anonymous/currently-unbanned identity eligibility, and optionally holds the target Auth row through commit. It has no tenant, membership or staff-authority decision. Only the dedicated runtime receives EXECUTE; no raw Auth grant is added. All application callers, readiness checks, manifest and current SQL tests move together; the old function is absent.

The same migration makes `guard_community_sharing` rejection-only. Preference opt-in locks/checks the account; a deferred account constraint validates the final account/preference state and rejects inactive sharing. It covers INSERT and UPDATE, including changes initiated from either relation. The API's lifecycle helper explicitly clears sharing for every transition to inactive, holding the account before touching preferences. Other private preference values are preserved. The dormant `protect_invariants` staff branch and obsolete `can_create_admin` reference are removed; the actual staff invariant trigger, owner CHECK, active-staff standing FK, required roots/related rows, first-approval/revision metadata, provisioning and attribution remain.

The first runtime test confirmed the former automatic-clearing trigger by failing its new expected-rejection assertion. The subsequent compound final-state test exposed a required row-policy dependency: self-service RLS prevented clearing an already inactive row or another account's preference. `20261110000200_lifecycle_sharing_scope.sql` is a separate forward migration; the already-applied first migration was not rewritten.

The second migration permits the verified runtime to SELECT preference rows within its explicit command tenant and UPDATE them to `show_global_profile=false`. Existing own-preference policies remain for the self-service group, pending its later cutover. Column grants are unchanged. Because PostgreSQL column privileges are role-wide, a trusted runtime with that scope can read the already-granted preference columns and write already-granted fields together with a cleared sharing flag. This checkpoint does not claim independent database product authorization for that scoped trusted writer. HTTP operations still enforce self-only preference edits and authorized lifecycle commands; no endpoint returns another person's private preferences. An unscoped runtime read retains its own-row boundary. The restrictive archive SELECT fence remains, and external roles retain no application access.

This is the explicitly required lifecycle effect boundary, not a new privileged workflow RPC or an elevated role. The new invariant rejects invalid stored state without silently correcting it. Product authority remains at the API boundary, while PostgreSQL retains archive, integrity, Auth, provenance and append-only safeguards.

## Catalog and privilege evidence

[Before catalog](before-catalog.json) captures the pre-change runtime grants, migrations, affected function definitions/dependencies and external grants. [After catalog](after-catalog.json) captures the final runtime manifest, full function inventory, affected definitions, triggers, policies, role/membership metadata and external grants. These are metadata only.

Live comparison verifies identical relation/column privileges and external grants. The reviewed manifest changes exactly one EXECUTE signature: remove the mixed staff-candidate function and add the narrow Auth fact primitive. The exact final runtime manifest passes. The live trigger/policy catalog records the new deferred invariant and command-scoped clearing policies; no Auth or platform schema enters the generated query model. Historical migrations and verification evidence remain intact.

## Verification and commands

The pre-agreed seams are HTTP contracts, real local Auth/HTTP, direct restricted-runtime SQL/concurrent sessions, external surfaces and compiler/schema checks. No unit tests of private helper organization were added.

The lifecycle suite now verifies both appointment/Auth-ban orderings with real locks: an earlier ban causes fresh grant denial; an earlier grant holds Auth until commit and the ban waits. A direct restricted-role probe proves the primitive returns only the identity fact even without staff authority, while HTTP grant remains denied and raw Auth SELECT remains denied. Existing authority/archive races, request replacement/staleness, restrictions, delegation, no automatic restoration, rollback and event assertions remain.

Sharing tests prove that a raw inactive transition omitting cleanup fails and rolls back without changing the preference; an explicit compound write can clear consent after its standing statement before the deferred final-state check; enabling sharing for an inactive account is rejected; and real API sharing/deactivation races retain both orderings. Another staff actor's removal explicitly clears only sharing and preserves both communication flags. Replay/upgrade races now use an explicit account-before-preference compound writer; they no longer depend on the removed corrective trigger.

SQL assertions verify retirement/private grants, deferred final-state validation, removal of the obsolete branch/corrective workflow and retention of first-approval/revision/root/staff/provisioning guards. Existing real Auth signup/provisioning, privilege, archive, audit and external-denial checks remain part of the full local suite.

```sh
npm run check -w server
node --test server/tests/http-baseline.test.mjs
npm run test:http -w server
npm run test:local -w server
npm run verify:types
npm run test:types:local -w server
npm run lint
npm test -- --run
npm run build
```

All 75 HTTP cases, the nine foundation local suites plus retry suite, the 134-file client boundary scan, 274 pgTAP assertions, SQL lint, 51 hostile PostgREST checks, clean replay/populated upgrade, generation/drift/driver checks, all 279 client cases, compiler and lint/build have passed. The final extracted entry-decision path also passed an affected real lifecycle/staff/Auth concurrency suite recheck. SQL CLI checks use the explicit loopback URL under the [local runbook](../../../supabase/README.md#final-local-access-audit), never a bare remote selector. SQL fixtures run after HTTP fixtures; replay uses its own disposable database. No required gate remains failed or unavailable. The existing bundle-size warning remains.

Local target: API `127.0.0.1:54321`, database `127.0.0.1:54322`, Node 22.22.2. Local migrations were applied using `supabase migration up --local`. Runtime test processes override the old forwarded port 15422 to the current loopback endpoint, preserving credentials/environment files. No working-database reset, hosted migration, hosted verification, application hosting or UI change occurred. Current source expects the new local schema; hosted readiness remains pending a separately authorized migration. Existing uncommitted design/publication work is preserved separately from this implementation commit.

## Review

Two independent code-review agents inspected the staged checkpoint against starting revision `de1188c`, the issue/parent requirements and repository standards. Unrelated unstaged design/publication changes were excluded. Both reviews were read-only; verification results were assessed from the tests and evidence rather than independently rerun by the reviewers.

### Standards

No findings. Feature-local facts/decisions, invoked requirements, service workflow coordination and pre-pagination audiences match the accepted ownership. The Auth primitive contains no product authority. Explicit sharing cleanup and rejection-only validation preserve the archive fence. Requirement wrappers and dispatch branches have concrete documented responsibilities; no actionable baseline smell was identified.

### Spec

No findings. Actors/targets/errors/replays, lifecycle/staff effects, Auth splitting/callers/readiness/grants, creation normalization and retained integrity/provisioning/audit boundaries match the checkpoint. The scoped preference policies are necessary for cross-account/inactive cleanup, and their trusted-runtime breadth is accurately documented without adding HTTP disclosure.

Review summary: Standards 0 findings; Spec 0 findings. This completes the locally verified issue #8 checkpoint; issues #9-#15 and hosted work retain their separate gates.
