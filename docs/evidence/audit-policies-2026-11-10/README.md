# Semantic audit ownership and history policies - issue #11

Authorized by the user invoking the implement skill for [issue #11](https://github.com/JonDManningDev/the-crowded-table-app/issues/11), starting at `13b01c45d441423bd19974df4dd78bc3a58d7640`. Its two prerequisite blockers were closed. Parent #5, ADR 0001, document 23 and the intended access matrix govern the work. Scope ends at local verification; issues #12-#15 and hosted migration/verification remain separate. Pre-existing unstaged planning/publication work is excluded from this checkpoint's commit.

## Writer inventory and semantic contract

| Mutation/writer | API semantic events and classification |
| --- | --- |
| Community creation | `tenants.insert`, `tenant_settings.insert` with no categories/target; `community_approved` with community category; `staff_created` with community and staff categories. One operation identity covers all four events. |
| Join/return and request creation/withdrawal/approval | Existing community action codes, request UUID/details shapes and community category. Stale/replayed inputs retain their existing outcomes without an extra successful event. |
| Deactivate/suspend/remove/clear | Existing community events derive standing/restriction/request details from locked account state. A linked staff pause/revocation uses locked assignment status and carries no community discipline reason. |
| Staff create/resume/revoke/reappoint/permission edits | Existing staff events have staff category; creation/reappointment and revocation from active also have community category. Revocation from paused remains staff-only. An independently requested staff revocation retains its own reason. |
| Participant-permission save | `community_permissions_changed` uses locked before and returned after booleans, null reason and community-only category. Unchanged saves emit nothing. |
| Community detail/settings save | `tenants.update` / `tenant_settings.update` only for affected rows, empty details, null target/reason, no categories. |
| Copy insert/update/delete | Existing `tenant_website_content_overrides.*` codes, content key, empty details, null target/reason, no categories. Root/row locks establish insert versus update; unchanged text emits nothing and missing deletion remains 404. |
| Archive/restore | `tenants.archive` / `tenants.restore` only for an actual locked lifecycle change, empty details, null target/reason and no categories. |
| Global/community profile and preference edits, global blocks | Retain their existing storage attribution/history behavior; they had no semantic command-event writer to migrate. This checkpoint does not invent action codes for them or implement deferred domains. |
| Legacy history/setup and Auth provisioning | Existing historical rows/categories remain unchanged; Auth provisioning retains its accepted platform exception. Trusted migration/test setup is not an API product writer. |

The service's single event writer inserts the event and its selected categories in the mutation transaction. Services own action selection and reason placement; no transport-supplied action/category reaches it. API no-op checks precede writes. The shared bounded transaction retry repeats locks, current eligibility/facts and authorization, and rolls back unsuccessful event/category sets. No new HTTP surface or compatibility interface is introduced.

## History ownership

Community policies load current lifecycle/account/assignment facts after the service acquires the existing tenant SHARE lock. Their SQL audience predicate precedes exact-ID/target/category selection, cursor ordering and limits. An approved active owner sees all history, including archived communities and uncategorized configuration events. In an active community an approved active staff assignment sees events matching either independent audit flag. Paused/revoked/inactive/suspended or unauthorized readers receive the existing successful empty page. Archived non-owners have no API history. Dual-category events appear once; community discipline text remains solely on the community event. Following target/profile links still requires that endpoint's separate authorization. Existing cursors, microsecond timestamps, projections and error privacy remain intact.

## Forward migration and database trust boundary

`20261110000500_semantic_audit_api.sql` retires all three surviving `log_admin_action` triggers (tenants/settings/copy), `append_admin_action`, the classification trigger/function and `can_read_account_action` together with its business history policy. Verified-command tenant scope replaces the history audience policy. Category reads retain their event-reference policy; new category inserts require a visible event in the current verified scope. Existing action/category FKs, category values, unique keys, immutable rows/categories and lack of UPDATE/DELETE/TRUNCATE privileges remain. G-02 account/profile archive RLS, configuration archive fences, protected Auth access, required roots and all unrelated safeguards remain.

Exactly three insert fields are newly granted: event `content_key` and category `action_id,category`. The reviewed runtime manifest removes exactly the retired audience function's EXECUTE signature. Startup readiness requires all three retired functions to be absent and the new category privilege to exist. No external role receives an application privilege.

`attribute_command` still stamps the verified actor and operation identity and requires matching tenant scope. Its action-code/legacy-usage branch is retired because action selection is API semantics; the action-code FK remains. `validate_command_details` retains the closed per-action field allowlists/required JSON shape, boolean types, standing/status enum values, request UUID syntax, permission-key and before/after boolean shape, empty details for dotted system/legacy shapes, and the 2000-character reason bound. It no longer decides which action may carry a reason. Neither function classifies events or proves that a stored event corresponds to a mutation.

A scoped verified runtime writer can read all same-community history, including reasons, independently of its API staff permissions and community lifecycle; API predicates supply that product boundary. Tests explicitly demonstrate this breadth, as well as the ability of a defective trusted writer to insert a structurally valid wrong reason/category or omit categories. PostgreSQL does not certify semantic completeness/correctness. HTTP tests establish the intended privacy and completeness contract. Missing identity/scope and current Auth bans still deny raw reads, and other-community event/category access remains fenced.

[Before catalog](before-catalog.json) and [after catalog](after-catalog.json) contain metadata only. They identify every attached logger/classifier, confirm their removal, record retained validators/policies/triggers and show the exact reviewed privilege delta. External relation/function grants remain empty; role ownership/membership is unchanged. Historical migrations and the reviewed HTTP fixture are unchanged.

## Verification

Agreed seams: existing HTTP injection contract, real local Auth/HTTP operations, actual ct_api SQL/concurrent sessions, external Data API/GraphQL, and compiler/schema checks. No private-policy unit seam was introduced.

The scoped-runtime history probe first failed against the previous business RLS, then passed after the forward migration. New category fault tests caught the separately written participant event missing API classification; routing it through the common event writer made the tests pass. A genuine PostgreSQL fault after the event insert verifies rollback before category writes; a serialization fault after category insertion verifies complete rollback and exactly one successful event/category set. Repeated permission saves emit no event. Existing configuration mutation-stage/commit failures, exhausted retries, revoked authority, Auth bans and uncertain-commit behavior remain verified.

History tests separately verify allowed/nearest-denied API audiences, exact IDs, historical categories/rows, independent reasons and flags, pages/cursors, invalid inputs, ban/archive/revocation waits and both serialization orders. Direct-runtime probes verify invalid payloads/types/UUIDs/action/target references, protected attribution fields, cross-scope category writes and denied event/category UPDATE/DELETE/TRUNCATE. The former raw-runtime product audience denials are explicitly replaced with scope/broader-access checks. The former database semantic reason-placement assertion is replaced with the retained reason storage-length bound; API participant writes still verify a null reason.

Creation/configuration tests read events through authorized HTTP history: exactly four creation events share one operation, copy writes preserve the complete event shape, and staff lacking audit authority get an empty page. Existing configuration/record/lifecycle suites verify no-ops, before/after state, rollback and concurrency. Injection result doubles were updated for policy fact reads and explicit event/category inserts; the HTTP contract fixture was not regenerated.

Executed commands (Windows uses npm.cmd; the untracked local runner only substitutes the CLI-resolved loopback transport for the obsolete forwarded port in server/.env.local):

```sh
npm run check -w server
node --test server/tests/community-http.test.mjs
node --test server/tests/http-baseline.test.mjs
node --env-file=server/.env.local .scratch/issue-11-local.mjs node server/tests/history-local.mjs
node --env-file=server/.env.local .scratch/issue-11-local.mjs node server/tests/configuration-local.mjs
node --env-file=server/.env.local .scratch/issue-11-local.mjs node --test server/tests/transaction-retry-local.test.mjs
npm run test:http -w server
node --env-file=server/.env.local .scratch/issue-11-local.mjs npm.cmd run test:local -w server
npm run verify:types
npm run test:types:local -w server
node --env-file=server/.env.local .scratch/issue-11-local.mjs sql test db --yes
node --env-file=server/.env.local .scratch/issue-11-local.mjs sql db lint --schema public,app_private --level warning
node --env-file=server/.env.local .scratch/issue-11-local.mjs node supabase/tests/direct_data_api.mjs
node supabase/tests/direct_data_api_upgrade.mjs
npm run lint
npm test -- --run
npm run build
```

Passed: all 75 HTTP cases, all nine local foundation suites, 12 retry assertions, 134-file client boundary scan, 279 pgTAP assertions, generated-type drift and two schema/driver tests, all 279 client cases, compiler, lint and production build. SQL lint reports no schema errors. All 51 hostile PostgREST checks and clean replay/populated upgrade passed. Final compiler/lint checks and staged whitespace checks also passed. No required gate remains failed or unavailable. The existing bundle-size warning remains. Native exit statuses were checked; PowerShell's redirected npm notice formatting is not a failed test.

Local target: API 127.0.0.1:54321 and PostgreSQL 127.0.0.1:54322, Node 22.22.2. Docker checks required execution outside the filesystem sandbox. Applied only the forward migration using `supabase migration up --local`; SQL CLI checks use the explicit verified loopback URL. The initial bare hostile-suite invocation rejected the stale forwarded port before work; the loopback runner corrects transport. No working-database reset, hosted mutation/deployment or UI change is included.

## Review

Two independent code-review agents reviewed the nonempty staged checkpoint against starting revision `13b01c45d441423bd19974df4dd78bc3a58d7640`, excluding pre-existing unstaged planning/publication changes. They assessed code, tests and recorded evidence without independently rerunning suites.

### Standards

No findings. The change respects the accepted ownership boundary: community policies own history audiences before pagination; services own semantic events/categories; PostgreSQL retains scoped storage, provenance, structure/reference checks and append-only protection. Classification matches the retired classifier and configuration events preserve their shapes. The action-named history loader follows the expressly approved shared-fact-reader convention. No CONTRIBUTING.md or CODING_STANDARDS.md exists. The HTTP fixture is unchanged.

### Spec

No findings. All surviving automatic writers move into mutation transactions, historical rows and categories remain, and policy-owned history audiences apply before pagination with independent linked-resource authorization. Reviewed tests cover reason privacy, owner/archive and separate flag audiences, no-op suppression, actual PostgreSQL faults after event/category insertion, rollback and one committed retry set. Runtime storage safeguards are explicitly distinguished from API semantic guarantees. No scope creep was identified.

Review summary: Standards 0 findings; Spec 0 findings. This completes the locally verified issue #11 checkpoint. Issues #12-#15 and hosted work retain their separate scope and gates.
