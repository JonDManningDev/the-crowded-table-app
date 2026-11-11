# Configuration and archive policies - issue #9

Authorized by the user's request to implement [issue #9](https://github.com/JonDManningDev/the-crowded-table-app/issues/9), starting at `af06b04` after issue #8 (closed). Parent #5, ADR 0001, document 23 and the intended access matrix govern this checkpoint. Account-record policies, semantic-audit cutover, remaining profile/directory/block policies and hosted work remain separate tickets.

## Ownership and operation contract

Community policies now load current lifecycle, account standing and staff facts and decide configuration reads, detail/settings/copy writes and archive/restore authority. Configuration services set tenant scope and take the existing root SHARE lock for management reads or UPDATE lock for writes, then invoke named requirements on facts loaded after any wait. Archive uses the existing command UPDATE lock and named archive decision through command admission. Actor Auth eligibility remains locked by shared transaction infrastructure; bounded whole-transaction retries reload the operation. There is no cross-request authorization cache or new HTTP interface.

Approved/suspended accounts retain full configuration reads in active communities; pending, inactive and unrelated callers retain hidden 404 reads. Writes require an approved account and active staff assignment: owner for details/archive, `can_manage_settings` for settings and `can_modify_content` for copy. Non-owner staff require an active community. Owners retain archived-community management. Existing missing-target 404, forbidden-write 403, rejected mixed patches, public exact-slug fields, copy value semantics and no-op behavior are unchanged. All configuration settings share the same settings authority; an extra forbidden field rejects the whole patch through the unchanged transport schema.

Creation and detail edits already normalize name/location values explicitly in the API. The tenant normalization trigger and its obsolete function branch are removed; both global/community profile normalization callers remain. CHECKs continue to reject noncanonical tenant text and invalid country codes. Timezone validation, immutable identities/slugs/content keys, protected metadata, required roots/owner state and G-02 remain database responsibilities.

## Forward migration and trust boundary

`20261110000300_configuration_policies.sql` removes `can_edit_configuration`, `guard_configuration_details`, the permission trigger and all dependent configuration business policies. Copy retains a tenant-scoped runtime policy; settings/tenant scope policies already serve coordinated creation and commands. Independent settings/copy archive SELECT fences remain. No relation/column grants change. The reviewed runtime manifest removes exactly the retired permission function's EXECUTE signature, and readiness requires both retired functions to be absent. The tenant normalization trigger is removed without dropping profile normalization support.

This intentionally moves product authority to the API. A scoped trusted runtime writer can edit canonical tenant/settings/copy values without the caller's product permissions. Direct runtime tests demonstrate this breadth and roll back the probe. PostgreSQL still enforces scope where applicable, protected columns, canonical storage, Auth isolation, archive fences and audit integrity. No external browser role receives access. This checkpoint does not claim independent database enforcement of API product permissions or semantic completeness.

Automatic configuration/copy/archive semantic loggers and category classification remain unchanged for issue #11. Existing action identifiers, details/reason privacy, historical rows and transaction rollback remain intact. Changed operations emit exactly the existing event set; no-op writes and repeated archive/restore emit no duplicate events.

## Catalog evidence

[Before catalog](before-catalog.json) and [after catalog](after-catalog.json) contain metadata only: function inventory/affected definitions, policies, triggers, grants, roles, defaults and migration versions. Comparison confirms identical relation/column privileges, exactly one removed runtime EXECUTE signature and empty external application grants. Both retired functions, their dependent business policies and both tenant triggers are absent. Retained archive fences, generic semantic loggers and profile normalization remain visible in the catalog and SQL assertions.

## Verification

The pre-agreed seams are the reviewed HTTP contract, real local Auth/HTTP, restricted-runtime SQL and concurrent sessions, external surfaces and compiler/schema checks. No private-policy unit seam was introduced.

The first new runtime rejection test failed against the old tenant normalization trigger (missing expected rejection), then passed after the forward migration. The configuration suite verifies normalization, the actor/permission/lifecycle matrix, rejected mixed patches, protected fields, rollback, no-op and archive/restore event counts. Settings/content revocation and archive checks reload after root waits. Real runtime plus HTTP barriers verify both copy/archive commit orders and the existing admitted-settings-write/permission-revocation order. Raw probes separately prove the trusted-writer boundary, wrong-scope denial, canonical/timezone/identity protection and archived non-owner settings/copy isolation. The full local suite retains G-02 account/profile, provisioning, Auth locking, retry and append-only checks.

Executed commands (Windows uses `npm.cmd`):

```sh
npm run check -w server
node --env-file=server/.env.local .scratch/issue-9-local.mjs node server/tests/configuration-local.mjs
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

All 75 HTTP cases, nine real local foundation suites, 10 retry assertions, the 134-file client boundary scan, 277 pgTAP assertions, 51 hostile PostgREST checks, clean replay/populated upgrade, generated-type drift and two schema/driver tests, all 279 client cases, TypeScript and lint/build passed. SQL lint reports no errors. The reviewed HTTP fixture is unchanged. PowerShell initially reported native stderr npm notices as shell errors in redirected commands; the test runners' complete success summaries establish their results, and lint was rerun with an explicit native exit code. The existing bundle-size warning remains. No required verification gate remains failed or unavailable.

The explicit local target is API `127.0.0.1:54321`, PostgreSQL `127.0.0.1:54322`, Node 22.22.2. The scratch runner resolves local CLI status, adjusts the inherited runtime URL's transport to that loopback endpoint and never prints credentials. Local Docker access required execution outside the filesystem sandbox. Migration used `supabase migration up --local`; SQL CLI checks used the verified explicit loopback URL under the local runbook. SQL fixtures ran after HTTP fixtures; replay used its disposable database. No working-database reset or hosted execution occurred. Hosted readiness now requires the separately authorized local-only migration to be deployed later. Existing uncommitted design/publication changes are preserved separately from this implementation commit.

## Review

Two independent code-review agents inspected the staged checkpoint against starting revision `af06b04`, the parent/child requirements and repository standards. Unrelated unstaged design/publication work was excluded. Reviews were read-only; reviewers inspected recorded verification evidence without rerunning mutation tests.

### Standards

The first review found one P2 documentation gap: the Supabase runbook still described retired configuration write guards as an independent database boundary and omitted migration/readiness requirements. The runbook now records migration `20261110000300`, both retired functions, API-owned product authorization, scoped trusted-runtime breadth and retained database safeguards. The reviewer rechecked the staged correction: Standards pass, no remaining documented-standard violations or actionable baseline smells.

### Spec

No findings. The staged checkpoint preserves the documented configuration/archive audiences, permission independence, normalization, root locking, hidden-read/forbidden-write behavior, no-op semantics, retained safeguards and automatic semantic loggers. SQL permission dependencies, runtime manifest and readiness checks cut over together.

Review summary: Standards 1 finding resolved, 0 outstanding; Spec 0 findings. This completes the locally verified issue #9 checkpoint. Issues #10-#15 and hosted work retain their separate scope and verification gates.
