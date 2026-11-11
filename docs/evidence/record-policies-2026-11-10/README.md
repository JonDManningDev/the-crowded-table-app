# Account-record and participant policies - issue #10

Authorized by the user's request to close issue #9 and implement [issue #10](https://github.com/JonDManningDev/the-crowded-table-app/issues/10), starting at `135f4fa`. Issue #9 was closed with the completed checkpoint/verification explanation before this work; prerequisite #8 was already closed. Parent #5, ADR 0001, document 23 and the intended access matrix govern this checkpoint. Semantic-audit cutover, remaining profile/directory/block policies and hosted work retain their separate tickets.

## Ownership and operation contract

Community policies now own owner account-list and exact account-fact access, staff/participant record-read audiences and participant-management authority. Action-named loaders share a private reader of current tenant lifecycle, actor standing and the established staff-assignment loader after service-coordinated root locking. Requirements preserve hidden-read 404 and forbidden-write 403 outcomes; absent communities/targets retain 404. Services retain scope setup, SHARE locks for reads, UPDATE locks for mutations, target permission-row locks, explicit projections and transactional event writes. Facts do not survive an operation. Actor Auth locking and bounded full-transaction retries retain their shared owner.

Owners retain all account facts, including archived management. In active communities self can read its own account facts; approved/suspended peers can inspect approved/suspended/inactive exact targets, while pending peer facts stay hidden. The target predicate remains in SQL. Only owners enumerate all accounts; this checkpoint does not move member/public directories or profile audiences. Staff-assignment holders retain full own rows, including paused/revoked status. Effective approved/active staff need `can_grant_staff` for other staff records/lists and the independent `can_manage_community_permissions` for participant records/lists/edits. Participant holders retain own stored permission reads across pending/suspended/inactive standing in an active community. Non-owner management requires an active community; owners retain archived management. Cross-community linkage, page ordering/cursor scope and field projections remain unchanged.

Participant saves load the full locked permission row once. An unchanged save returns it without a mutation/event or repeated authorization. A change uses `UPDATE ... RETURNING` with the explicit existing projection, checks the affected row, writes the existing boolean before/after event and returns the changed row. It no longer invokes the read operation merely to format its response. The action identifier, target, trusted actor/operation, null reason and community-history classification are unchanged. Request identities, account revisions and staff flags are unaffected. Existing audit validation/classification remain until issue #11.

## Forward migration and runtime boundary

`20261110000400_account_record_policies.sql` replaces the participant business SELECT/UPDATE policies with verified-command tenant scope and removes `can_manage_account_records(uuid,text)`. Creation retains its scoped INSERT policy. Staff runtime command reads already have the scope needed by lifecycle/discipline operations. Independent staff/participant archive SELECT fences, G-02 account/profile RLS, required roots and FKs, immutable identities, protected metadata and append-only history remain. There is no new definer, privileged workflow function or external role grant.

Relation/column privileges are unchanged; the reviewed manifest removes exactly the retired function's EXECUTE signature. Readiness requires its absence. The now-unused service `AuthorizationResult` contract is removed. No compatibility path is introduced.

Product permission enforcement belongs to the API. A scoped trusted runtime can read same-community permission rows and update the granted participant flag without the actor's API management permission. Tests demonstrate that breadth in a rolled-back probe rather than claiming the former SQL business denial remains. Wrong-scope updates remain zero-row, protected identity/audit fields remain unwritable, and archived non-owner raw staff/participant reads remain empty. PostgreSQL does not independently prove API semantic event completeness/correspondence.

## Catalog evidence

[Before catalog](before-catalog.json) and [after catalog](after-catalog.json) capture metadata only: application functions, affected definitions, policies/triggers, grants, role/membership flags, defaults and migrations. Comparison confirms identical relation/column privileges and affected trigger definitions, exactly one removed runtime EXECUTE signature and empty external relation/function grants. The retired function and business policies are absent; creation scope and both archive fences remain.

## Verification

The existing agreed seams are HTTP contracts, real local Auth/HTTP, restricted-runtime SQL/concurrent sessions, external surfaces and compiler/schema checks. No private-policy unit seam was added.

The new runtime-boundary probe first failed against the previous policy (one visible permission row instead of the intended scoped five), then passed after the forward migration. The record suite covers closest owner/self/staff denials, independent flags, cross-community targets, full response fields, pagination, missing targets without events, rollback, protected fields and external REST/GraphQL denial. Added checks verify staff authority revoked during a root wait, cursor reuse after revocation, unchanged request/revision behavior and concurrent opposite participant updates whose two events use the actual locked before/after values. Existing participant revocation/archive barriers and admitted-read/write serialization checks remain. The directory/account suite verifies the newly extracted owner/exact fact decisions, including pending/inactive/archived rules and stable pages.

The initial broad HTTP run exposed a transport double still supplying the retired SQL permission result. It was updated to queue the actual policy facts; the focused 15-case community suite and final full HTTP run pass. The reviewed HTTP contract fixture was not regenerated. This test double verifies HTTP wiring/projection; real-runtime suites establish authorization and database correctness.

Executed commands (Windows uses `npm.cmd`; local runtime processes use the scratch runner to replace the obsolete forwarded transport port with the CLI-resolved loopback endpoint):

```sh
npm run check -w server
node --test server/tests/community-http.test.mjs
node --env-file=server/.env.local .scratch/issue-10-local.mjs node server/tests/records-local.mjs
node --env-file=server/.env.local .scratch/issue-10-local.mjs node server/tests/directory-local.mjs
npm run test:http -w server
npm run test:local -w server
npm run verify:types
npm run test:types:local -w server
supabase test db --remote=<verified-loopback-database-url> --yes
supabase db lint --remote=<verified-loopback-database-url> --schema public,app_private --level warning
node supabase/tests/direct_data_api.mjs
node supabase/tests/direct_data_api_upgrade.mjs
npm run lint
npm test -- --run
npm run build
```

All 75 HTTP cases, nine local foundation suites, 10 retry assertions, the 134-file client boundary scan, 279 pgTAP assertions, 51 hostile PostgREST checks, clean replay/populated upgrade, generated-type drift and two schema/driver tests, all 279 client cases, compiler and lint/build passed. After extracting owner/exact account-fact policies, the affected real directory/account suite, server compiler, full HTTP suite, lint and build were rechecked successfully. After the review's shared-reader extraction, all three affected real configuration/record/directory suites, all 75 HTTP cases, compiler/build and lint passed again. SQL lint reports no schema errors. PowerShell's redirected native stderr includes npm update notices; explicit native exit codes and runner summaries were checked. The existing bundle-size warning remains. No required gate remains failed or unavailable.

Local target: API `127.0.0.1:54321`, PostgreSQL `127.0.0.1:54322`, Node 22.22.2. Local Docker access required execution outside the sandbox. Migration used `supabase migration up --local`; SQL CLI checks used the explicit verified loopback URL, never a bare remote selector. SQL fixtures followed the real HTTP fixtures; replay used its disposable database. No working-database reset, hosted migration/verification, frontend/API hosting or UI change occurred. Hosted readiness requires the separately scoped migration deployment. Pre-existing uncommitted design/publication work is preserved separately.

## Review

Two independent code-review agents inspected the staged checkpoint against starting revision `135f4fa`, the parent/child requirements and repository standards. Pre-existing unstaged planning/publication work was excluded. The reviews were read-only and assessed recorded verification evidence without independently executing tests.

### Standards

No hard documented-standard breaches. The first review identified one possible Duplicated Code heuristic: the new account-record loader repeated configuration's fact-query sequence. A private `loadCommunityStaffFacts` reader now owns that sequence, preserving action-named public loaders. The reviewer verified the staged correction: 0 remaining findings.

### Spec

No findings. The checkpoint implements the assigned authorization boundary, preserves owner/self/staff audiences and separate flags, retires the SQL function/business policies together, and returns locked/updated participant rows without repeated authorization. Scope, projections, errors, semantic events and archive/integrity safeguards match the requirements. The reviewer also confirmed that the shared-reader correction preserves queries, sequence, facts and decisions.

Review summary: Standards 1 heuristic resolved, 0 outstanding; Spec 0 findings. This completes the locally verified issue #10 checkpoint. Issues #11-#15 and hosted work retain their separate scope and gates.
