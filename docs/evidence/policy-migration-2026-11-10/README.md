# Complete local policy migration: issue #15

Verified locally on 2026-11-10 (America/Guatemala). [Issue #15](https://github.com/JonDManningDev/the-crowded-table-app/issues/15), parent #5, ADR 0001 and document 23 govern this checkpoint. The ticket had zero open blockers and no comments. The full integration review starts at `8b0473f2c33abb555d7d124a13d71a2b7b72f0ce`, before issue #6; issues #6–#14 are independently committed through `00fa188`. This checkpoint changes verification and documentation, with no HTTP fixture, product audience, application implementation or migration change.

## Current result and trust boundary

The complete accounts/communities policy migration is locally verified through migration `20261110000800`. Community and user-account features have routes, JSON schemas, operation types, policies and services. Policies own action facts/decisions and SQL audiences; services coordinate transactions/locks, workflow writes and semantic events/categories. Health remains public and schema-free. Generated Kysely types cover all 16 public/private application relations independently of runtime privileges.

The API is responsible for product authorization and semantic audit correctness/completeness. PostgreSQL independently retains canonical storage, immutable identity/root/staff/sharing invariants, protected Auth primitives, trusted metadata, append-only audit storage and G-02. Runtime scope policies intentionally permit facts/actions that the HTTP policy denies. They do not claim independent database enforcement of product audiences or semantic event completeness. External application grants remain empty.

All required current local gates passed, with no failed, unavailable or owner-waived gate. No hosted operation, working database reset, parent closure or deferred feature implementation occurred. Hosted remains at the earlier `20261103001700` milestone according to the existing deployment record; it was not inspected in this task. Current source requires the explicit local startup commands until a separately authorized hosted migration and verification.

## Function and dependency reconciliation

The [live local catalog](local-catalog.json), captured by `node supabase/tests/policy-catalog.mjs`, contains complete definitions, 47 policies, 30 application-function triggers (including Auth provisioning), 63 column defaults and 89 catalog dependency edges. Catalog edges alone do not expose calls inside string-bodied SQL/PLpgSQL; definitions were reviewed too. All functions have owner `postgres` and fixed empty search paths. No public application function survives. The exact runtime manifest matches without regeneration: seven callable signatures, restricted relation/column privileges, a non-inheriting non-owner `ct_api` login without BYPASSRLS or elevated membership, no raw Auth access and no external application relation/function grant.

All 31 original dispositions reconcile to 17 surviving original functions, 14 removed originals and one narrow replacement (18 final functions):

| Original function | Final disposition and dependency review |
| --- | --- |
| `can_block_from_profile` | Removed in #14 with source business RLS; user-account policy composes community source proof. |
| `can_discover_global_profile` | Removed in #14 with discovery RLS; API SQL predicate filters before pagination. |
| `can_edit_configuration` | Removed in #9 with configuration business policies. |
| `can_inspect_global_profile` | Removed in #14; exact API predicate preserves self/discoverable/shared-community alternatives. |
| `can_manage_account_records` | Removed in #10 with participant business policies. |
| `can_read_account_action` | Removed in #11 with history business RLS; API category audience precedes pagination. |
| `inspect_global_profile` | Removed in #14; authorized API projection replaces it. |
| `community_landing` | Removed in #13; API exact-slug query retains safe projection and root coordination. |
| `public_community_directory` | Removed in #13; API query retains locked-root/post-wait gates and pagination. |
| `guard_configuration_details` | Removed with its trigger in #9; API permission checks and stored constraints replace its mixed role. |
| `append_admin_action` | Removed with all three generic loggers in #11; API writes configuration/archive/restore events. |
| `classify_command` | Removed with its trigger in #11; API inserts reviewed categories atomically. |
| `normalize_editable_text` | Removed with every normalization trigger in #12; API normalizes future writes, constraints reject noncanonical values without rewriting legacy biography bytes. |
| `guard_community_sharing` | Retained, rewritten in #8: preference opt-in locks eligible account; deferred account trigger rejects final inactive sharing. No automatic clearing remains. |
| `is_staff_candidate` | Removed in #8; new `auth_identity_eligible(uuid,boolean)` provides only protected Auth facts/optional identity locking. Product grant/standing checks belong to API. |
| `validate_command_details` | Retained structural JSON fields/types/enums/UUIDs and bounded reason storage. No semantic reason placement/category selection remains. |
| `active_tenant` | Retained for restrictive G-02 archive fences; API loads lifecycle facts directly. |
| `is_approved_owner` | Retained nonrecursive archive-owner fact used by G-02; no general action authorization. |
| `my_community_relationships` | Retained explicit caller-only archived-card projection, community-owned adapter and fixed fields; no raw archived profile/account access. |
| `lock_eligible_actor` | Retained protected Auth eligibility and actor lock for every authenticated transaction attempt. |
| `verified_user` | Retained current verified Auth identity for scope, RLS, block defaults, metadata and narrow functions; no obsolete transport switch remains. |
| `command_scope` | Retained verified transaction-local tenant fact for scoped runtime reads/writes and attribution, without action decisions. |
| `attribute_command` | Retained audit INSERT actor/operation/tenant stamping. Retired action-code interpretation is gone. |
| `stamp_audit` | Retained on ten application tables; user-account provisioning sets its own new identity, runtime writes use verified actor, privileged maintenance uses Auth context. These are genuine callers, not compatibility fallbacks. |
| `stamp_first_approval` | Retained community-account first-approval metadata/immutability. |
| `stamp_community_revision` | Retained community-account stale-state metadata. API chooses workflows; revision changes remain mechanical. |
| `protect_invariants` | Retained tenant identity/timezone and account/profile/content keys; dormant staff/`can_create_admin`/owner-auto-enable branch removed in #8. |
| `protect_staff_assignment` | Retained immutable staff identity and active owner assignment. |
| `require_tenant_roots` | Retained deferred tenant/settings/staff root checks and valid owner, with approved-standing staff FK. |
| `reject_audit_mutation` | Retained on event/category UPDATE/DELETE; append-only storage. |
| `provision_user_account` | Retained explicit atomic platform exception on `auth.users` INSERT. |

The 47 final policies are storage scopes (verified actor/self, tenant command, exact target, caller relationship, anonymous active-root fact reads), lock-only UPDATE USING paths whose WITH CHECK rejects mutation, and independent restrictive G-02 fences. They no longer call retired product authorization functions. The 30 triggers are metadata, immutable stored state/root/sharing validation, structural audit validation, append-only rejection and Auth provisioning; generic event/classification/normalization/permission triggers are absent. The only application-function column defaults are `verified_user()` for block actor/creation attribution; other defaults are literal values, generated standing, timestamps and UUIDs. Application/global default grants expose no new application functions/tables; platform storage defaults remain platform-owned and actual Storage/Realtime denial is tested. Readiness checks require all replaced signatures absent, the new Auth primitive and own-card exception present, key runtime grants/RLS intact and retired external surfaces denied. Full readiness succeeds through real HTTP.

## Current verification

Local target: API `127.0.0.1:54321`, PostgreSQL `127.0.0.1:54322`, Node 22.22.2. Tests use real local Auth and the actual restricted runtime connection. The ignored runtime environment still contains an obsolete forwarded port, so the existing untracked `.scratch/issue-12-local.mjs` runner obtains loopback endpoints from CLI status and changes only process connection host/port. It preserves credentials/files and supplies the explicit local CLI database target. It is a session helper, not an application interface or required new dependency. On a checkout with current local environment endpoints, run the underlying npm/node suites directly. Docker/CLI checks required execution outside the filesystem sandbox. No failed gate was classified as passed from historical evidence.

Executed commands (Windows uses `npm.cmd`):

```sh
npm run check -w server
npm run test:http -w server
node --env-file=server/.env.local .scratch/issue-12-local.mjs npm.cmd run test:local -w server
node --env-file=server/.env.local .scratch/issue-12-local.mjs sql test db --yes
npm run verify:types
npm run test:types:local -w server
node supabase/tests/policy-catalog.mjs
node supabase/tests/direct_data_api_upgrade.mjs
node --env-file=server/.env.local .scratch/issue-12-local.mjs node supabase/tests/direct_data_api.mjs
node --env-file=server/.env.local .scratch/issue-12-local.mjs sql db lint --schema public,app_private --level warning
npm run lint
npm test -- --run
npm run build
```

| Gate | Current result |
| --- | --- |
| Server/compiler + reviewed HTTP baseline | Passed; 75 HTTP cases, fixture unchanged. |
| Real Auth/HTTP foundation | All nine suites passed: preferences, community lifecycle/staff, history, self-service, configuration, records, directory, global profiles/blocks and final access audit. |
| Retry/rollback/semantic audits | 13 assertions passed; full attempt retry, fresh permission/Auth/source denial, exhaustion, one committed event/category set, rollback between write stages, no replay of stale/business/arbitrary/uncertain-commit failures. |
| Cross-feature concurrency | Both-order archive/permission/standing/Auth/sharing/source barriers and bilateral block coordination passed in the foundation suites; replay also tests sharing/inactivity in both orders. |
| Runtime safeguards | G-02/own-card exception, root/owner/staff/sharing constraints, trusted actor/operation/metadata, structural audit validity and append-only denials passed separately from API decisions. |
| External bypass | 51 hostile PostgREST checks passed; foundation suites also prove REST/OpenAPI/GraphQL and private Storage/Realtime denial. Real signup/provisioning/confirmation/recovery passed. |
| Database assertions/lint | 272 assertions across nine pgTAP files; SQL lint reports no schema errors. |
| Replay/populated upgrade | Passed twice, including final strengthened check: all application rows, historical events/categories and attribution compare exactly before/after the eight policy migrations; legacy curated biography bytes retained; invalid future padded biography rejected. Disposable databases removed. |
| Type generation | Drift verification and both schema/driver cases passed, including deliberate drift rejection, all 16 relations/columns, generated/identity inventory and compiler insert/update restrictions. |
| Client boundary/full suite | 134 production TypeScript files audited; all 279 tests across 38 files passed. |
| Root lint/production build | Passed. Existing large-bundle warning remains; Supabase emits an existing Auth config deprecation notice. |

## Review and remaining work

Two fresh code-review agents independently reviewed the complete integration diff against parent #5 and repository standards, then reviewed the nonempty staged #15 verification/catalog/documentation diff. Both reported zero actionable findings through #14 and in the final checkpoint. Reviewers inspected source and recorded live evidence without independently rerunning mutating suites.

### Standards

No findings. All surviving function definitions, policies, triggers, defaults and dependency edges have reviewed purposes. Current guidance distinguishes local completion from the historical hosted milestone and preserves the API/database boundary and earlier verification history. No actionable Fowler smell identified. The initial question about locking SQL inside fact loaders was resolved: services coordinate the documented loader/lock order, so physical placement of the queries does not violate ownership.

### Spec

No findings. Product audiences, HTTP behavior, policy/service ownership, retry/source coordination, workflow normalization, semantic event/category creation and function retirement match parent #5. The final catalog reconciles all 31 originals; the populated upgrade preserves every application table and historical metadata. Required local verification and documentation are complete, with hosted/deferred work outside scope.

Review summary: Standards 0 findings; Spec 0 findings. This completes the verified local implementation record for issue #15 and the local scope of parent #5. Parent closure remains with the owner.

Hosted migration and verification require a separate instruction. Before running current source on hosted data, apply/reconcile the reviewed forward migrations through `20261110000800`, verify the restricted runtime manifest/readiness and repeat the authorized hosted checks with isolated fixtures. Do not point local suites at hosted data, reset the database, rotate credentials implicitly or treat this local result as deployment evidence. Parent #5 remains open for the owner. Deferred activity/messaging/resource work stays deferred. Pre-existing unstaged design/publication edits are preserved separately from this checkpoint commit.
