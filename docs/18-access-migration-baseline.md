# Access migration — package 1 baseline

**Subsequent decisions, 2026-11-03:** the missing-profile and archive-enforcement questions identified in this dated baseline were resolved in [the migration specification](19-access-migration-specification.md): one-time global display_name/bio copy and owner-only archive RLS. The snapshot and counts below are October 31 evidence.

Verified 2026-10-31 against hosted testing project `fsnipgsrlclbnfepcbvz` and repository HEAD `7a18d7f79c8aeeff73c97322e5754ef76487c0ef`, including the existing uncommitted requirements documents. This is the current-state inventory and change list, not the package 2/3 migration specification or authorization to deploy it. Intended behavior comes from [the access matrix](16-intended-access-matrix.md) and [flag inventory](17-database-flag-inventory.md), not these deployed restrictions.

Historical artifact cleanup (2026-11-10): the detailed captures and one-off replay/probe scripts were removed at the user's request. The counts, outcomes and limits below summarize the original October 31 observations; no new comparison was run by this cleanup. These retired script names are historical descriptions, not current runnable tools.

## Result and evidence

**No application-schema drift was found within the compared scope.** All eight migration versions and their recorded SQL match the repository; an isolated replay also matches the hosted application catalogs and effective privileges. The database still implements the earlier milestone, with substantial differences from the accepted product requirements.

The dashboard's earlier “API disabled” labels do **not** establish that these tables lack authenticated grants. The catalog confirms authenticated SELECT on all nine tables and three views, plus narrow column write grants. RLS supplies the self/owner restrictions. Anonymous REST probes receive permission denials on all twelve relations; the public lookup RPC works. This review does not establish why the dashboard displayed those labels.

| Evidence | Result / boundary |
| --- | --- |
| Hosted catalog | Captured 15:33 UTC; PostgreSQL 17.11; 9 tables, 3 views, 93 columns including 19 view columns, 19 policies, 21 functions, 29 application triggers, 57 constraints and 34 indexes |
| Replay comparison | All 8 source/ledger checks and all 13 catalog comparison categories match; source file hashes included |
| Replayed catalog | Fresh application migrations in a disposable local database; empty minimal Auth stub and explicitly reproduced hosted postgres/public defaults |
| Security Advisor | 4 errors and 11 warnings; original Auth-exposure and three definer-view errors remain |
| Anonymous REST probes | All 12 zero-row relation requests: HTTP 401 / 42501; lookup of random nonexistent slug: 200 / empty; app_private profile: 406 / PGRST106 |
| Deployed Edge Functions | Empty list |
| Transition preflight | Aggregate-only data check, captured 16:06 UTC; identifies one existing community account without its curated profile |

No hosted application rows, schema, grants, policies, Auth settings or migration history were changed. No synthetic hosted users were created. Docker was started; each uniquely named scratch database was removed after comparison, and the preexisting local application database was not reset or migrated. The Supabase CLI used its existing credentials and normal connection setup; no secret values were saved. This is not an incident investigation or proof of historic non-exposure.

### Reproducibility and comparison limits

`catalog.sql` reads catalogs and migration SQL only. `replay.py` applies the repository migrations to a unique local database, compares catalogs and drops that database in cleanup. It checks relations/ownership/options, columns/defaults/ACLs, RLS, function definitions/security/configuration/ACLs, triggers, constraints, indexes, schema privileges, role-effective table/column/function permissions and view dependencies. The initial function-only differences were Windows newline translation in the runner; byte-preserving SQL input fixed the runner and all definitions then matched.

The replay's Auth table/function are minimal empty dependencies, not a full Auth implementation. Hosted postgres/public default grants are explicitly supplied by the replay bootstrap, so their match confirms the observed environment, **not that the migrations establish safe defaults**. Full platform-role/configuration/extension parity is not claimed. No fresh authenticated SDK hostile-role suite, concurrency suite, frontend test suite or clean Supabase-stack reset was run; those belong to implementation verification. Catalog comparison proves schema equivalence, not every behavioral property.

`probe-rest.mjs` uses the existing browser-safe key only in memory and performs anonymous GETs with limit zero. `transition-preflight.sql` returns only counts, not user identities or profile text. Evidence timestamps differ; this is a sequence of read-only observations, not one global transactional snapshot.

## Applied migrations

| Version | Migration | Verified status |
| --- | --- | --- |
| 20261001000100 | identity_tenant_schema | Repository SQL matches hosted ledger; replayed |
| 20261001000200 | identity_tenant_access | Same |
| 20261015000100 | user_account_profiles | Same |
| 20261016000100 | align_global_profile_contract | Same |
| 20261016000200 | community_profile_preference_lifecycle | Same |
| 20261024000100 | my_community_summaries | Same |
| 20261024000200 | direct_data_api | Same |
| 20261024000300 | account_communication_preferences | Same |

Source-to-ledger comparison ignores outer SQL whitespace/comments and statement separators while preserving quoted content. The replay independently compares the resulting definitions. No additional/missing hosted version was found.

## Existing table access

All nine tables are owned by postgres, have RLS enabled (not FORCE RLS), and grant authenticated SELECT on every current column. All ordinary identity/audit writes below remain subject to grants and triggers. “Self” means the caller returned by app_private.verified_user(), not merely any supplied UUID or JWT subject. All policies are permissive policies addressed to authenticated.

| Table | Current SELECT row audience | Current authenticated direct INSERT / UPDATE / DELETE | Required change toward accepted use |
| --- | --- | --- | --- |
| user_accounts | Self | INSERT none; UPDATE user_is_discoverable, enable_matchmaking, allow_direct_messages; DELETE none | Preserve private raw preference rows and trusted provisioning; add private helper evaluation for new authorized peer operations without exposing others' settings |
| user_account_profiles | Self | INSERT/UPDATE display_name, bio; DELETE none | Add authenticated profile readers through independent discovery, qualifying community sharing and global-activity paths, with bilateral block denial; keep anonymous full profiles denied |
| community_accounts | Self, including retained/archived association | INSERT none; UPDATE show_global_profile; DELETE none | Split public-to-community account facts from private preferences; add standing/restriction/first-approval/participant permissions and lifecycle behavior |
| community_account_profiles | Self, active tenant, standing pending or approved | INSERT/UPDATE tenant_id, display_name, bio; DELETE none | Mandatory intra-community profile reads, history paths and suspended own edits; atomic join/profile creation; remove tenant_id UPDATE grant |
| tenants | Owner, including archived | INSERT none; UPDATE name, country_code, state_province, city, timezone; DELETE none | Add full approved/suspended member reads for active communities; preserve public seven-field lookup and owner archived access; ownership must create approved participation |
| tenant_settings | Owner | No direct writes | Public joining/exploration subset, full eligible member reads, can_manage_settings flag edits, new settings and trusted row creation |
| tenant_staff_assignments | Self or owner, including retained assignments | No direct writes | Add can_grant_staff full assignment reads; approved-standing effective authority, paused state, new permissions, audit-flag delegation and controlled discipline/restoration |
| tenant_website_content_overrides | can_modify_content helper: active assignment with flag; active tenant or owner | INSERT/UPDATE tenant_id, content_key, text_value; DELETE allowed under same helper | Add destination-page projections/member reads; UPDATE text_value only; preserve trusted identity, approved keys and reset-by-delete |
| tenant_admin_actions | Owner | No direct writes | Category-authorized audit reads; structured transition data and dual-history membership; preserve append-only attribution |

UPDATE column grants are not table-wide UPDATE grants. In particular, the catalog reports table-level UPDATE false while has_column_privilege reports the listed columns true. Identity changes to community-profile tenant_id and override tenant_id/content_key are currently rejected by protect_invariants, but the grants themselves are broader than the accepted UPDATE contract. Upsert callers and tests must be updated together when narrowing these grants.

Community preference/profile INSERT and UPDATE policies currently permit pending/approved, require an active tenant and reject suspended. Ordinary tenant-detail UPDATE is owner-only, including archived ownership. Content policies cover SELECT/INSERT/UPDATE/DELETE using can_modify_content. Settings, staff and audit have only SELECT policies. The exact nineteen expressions are retained in the catalog; none is being silently promoted to a product requirement.

### Columns and flags

Eight of the nine tables have created_at, updated_at, created_by and updated_by. tenant_admin_actions is append-only with created_at/created_by only. All column types, nullability, defaults, generated/identity properties and per-column ACLs are retained in the catalog.

| Table | Current non-audit columns |
| --- | --- |
| user_accounts | user_id uuid; user_is_discoverable, enable_matchmaking, allow_direct_messages boolean NOT NULL DEFAULT true |
| user_account_profiles | user_id uuid DEFAULT auth.uid(); display_name text; bio text nullable |
| community_accounts | tenant_id/user_id uuid; standing text DEFAULT pending; show_global_profile boolean NOT NULL DEFAULT false |
| community_account_profiles | tenant_id uuid; user_id uuid DEFAULT auth.uid(); display_name text; bio text nullable |
| tenants | id uuid DEFAULT gen_random_uuid(); slug/name/country_code/timezone text; state_province/city nullable text; operational_status text DEFAULT active |
| tenant_settings | tenant_id uuid; auto_approve_users boolean NOT NULL DEFAULT false |
| tenant_staff_assignments | tenant_id/user_id uuid; role text; status text DEFAULT active; can_approve_users, can_create_admin, can_modify_content boolean NOT NULL DEFAULT false (owners forced true) |
| tenant_website_content_overrides | tenant_id uuid; content_key/text_value text |
| tenant_admin_actions | id uuid DEFAULT gen_random_uuid(); tenant_id uuid; action text; target_user_id uuid and content_key text nullable |

There are exactly eight stored boolean flags. Neither community_accounts.is_active nor the proposed community_standing table exists. Current standing permits pending/approved/suspended/removed; staff status permits active/revoked only. There is no first_approved_at, has_disciplinary_restriction, user_account_blocks table, separate request/discipline/report table or global deactivation state. The three summary-view booleans are derived, not stored flags. Accepted additions and renamed targets are in [the flag inventory](17-database-flag-inventory.md), including thirteen target staff flags and no separate can_handle_reports.

## Schema privileges and defaults

- Public schema is owned by pg_database_owner. PUBLIC and API roles have USAGE; API roles have no schema CREATE grant. app_private is postgres-owned, grants authenticated USAGE, and does not grant anon USAGE.
- Authenticated can EXECUTE only four app_private helpers directly: verified_user, is_owner, active_tenant and can_modify_content. app_private is rejected as a REST schema. Private schema placement alone does not make arbitrary helper execution safe; function ACLs and outputs remain part of the contract.
- Anon has no SELECT/INSERT/UPDATE/DELETE grant on the twelve application relations. Its sole application RPC EXECUTE grant is lookup_tenant. All eight public application functions grant authenticated EXECUTE and enforce their internal operation checks.
- service_role retains broad table privileges and BYPASSRLS; postgres also has BYPASSRLS. Those are trusted infrastructure identities, not browser authorities. anon/authenticated lack BYPASSRLS and superuser status. Snapshot includes effective privileges and role memberships, not passwords.
- **Existing postgres/public default privileges are broad:** new tables and sequences receive all privileges for anon/authenticated/service_role, and new functions receive EXECUTE grants for those roles. PostgreSQL's global default PUBLIC function execution also needs explicit consideration. Current migrations explicitly revoke/regrant existing application objects but do not redefine future-object defaults. A future object missing its explicit restriction step can inherit unwanted API rights.

Package 3 must explicitly scope future-object default privileges and per-object grants for the intended creator role/schema, preserving trusted platform requirements. Do not interpret baseline parity as approval of broad defaults, and do not indiscriminately rewrite unrelated platform schemas/roles.

## Views and original Security Advisor findings

All three views are postgres-owned, security_barrier=true and security_invoker=false, with authenticated SELECT and no anon SELECT. They bypass underlying caller RLS through the view owner, so their internal predicates are the present security boundary. A security barrier does not make them invoker views.

| View | Current output and predicate | Dependencies / caller / next design obligation |
| --- | --- | --- |
| tenant_admin_candidates | tenant_id, user_id, standing, staff_status, staff_role, display_name. Active tenant; verified caller has active can_create_admin assignment; target Auth account confirmed/non-anonymous/not banned. No target approved-standing restriction | community_accounts, tenants, auth.users, staff assignments, community profiles, verified_user. No application consumer beyond generated types. Isolate authoritative Auth eligibility from the exposed view, align target/caller standing, rename grant, retain narrow candidate output |
| tenant_pending_community_accounts | tenant_id, user_id, display_name. Active tenant; active approval assignment; pending target. Does not inspect target Auth ban/verification | Accounts, tenants, profiles, staff and verified_user; no application consumer beyond generated types. Preserve accepted no-extra-target-ban-check rule; represent withdrawals/reactivation and current effective authority |
| my_community_summaries | id, name, city, state_province, country_code, operational_status, created_at, is_owned/is_managed/is_member. Caller-bound association; removed excludes; active staff or pending/approved/suspended membership qualifies | Tenants, own accounts/assignments, verified_user. Live readMyCommunities caller; all/managed/owned filters, created_at DESC/id ASC, 1,000-row pagination. Reconcile inactive membership/effective staff without losing accepted archived personal summaries |

The auth_users_exposed error concerns tenant_admin_candidates; the other three errors are security_definer_view for all three views. Candidate output does not include email, tokens or the raw Auth row, but the dependency remains and the advisor still flags it. Anonymous denial does not prove every authenticated path safe; no breach/no-breach conclusion follows from this baseline.

The October 27 three-RPC proposal remains a comparison option, not an accepted requirement. Do not change these to invoker views while retaining incompatible owner/self-only base policies, or select RPCs merely to preserve those milestone policies. Decide against the target grants/RLS/projection contracts in package 3 and coordinate current callers/types with whichever objects replace these views.

The other eleven advisor findings are nine deliberate-call-surface warnings (anonymous lookup_tenant and authenticated execution of the eight public definer functions), plus leaked-password protection and insufficient MFA options. Callable privileged functions require review of their checks, not automatic removal. Auth configuration warnings are a separate operations follow-up; no settings were changed, and no new configuration policy is chosen here. See [Auth operations](11-auth-operations.md).

## Function inventory

All 21 application functions pin search_path to the empty string; all are postgres-owned. The eight public functions below are SECURITY DEFINER. These descriptions are current behavior, including gaps.

| Public function | Current operation and guard | Required reconciliation |
| --- | --- | --- |
| lookup_tenant(text) | Stable, anonymous-safe seven-field active-slug lookup | Preserve intended public contract; transport evaluated with projections |
| create_tenant(...) | Verified caller; creates tenant/settings/owner assignment; optional p_join_community default false inserts approved account | Require approved owner account, curated profile creation contract and first approval in one transaction; remove optional-participation interface |
| join_community(uuid) | Verified caller and active-tenant lock; inserts pending/approved under auto_approve_users; existing association returned unchanged | Atomic profile submission, inactivity/discipline/return handling, first approval and withdrawn-request semantics |
| approve_community_account(uuid,uuid) | Active tenant; approval helper; pending to approved only | Current effective staff checks, first approval, request races/reactivation; no target Auth-ban check added |
| create_tenant_admin(uuid,uuid) | Active tenant; create_admin permission; verified target with any community account; inserts admin assignment | can_grant_staff, approved target prerequisite and new flags; distinguish creation, paused resumption and owner-only revoked reappointment |
| set_admin_permissions(uuid,uuid,boolean,boolean,boolean) | Owner; active admin target; three nullable flags allow partial changes; archived owner management allowed | Expanded permission set; narrow delegated audit-flag editing; preserve owner-only authority for other grants. Remove any obligation to support the old four-argument calling convention; retain partial edits only if the new contract needs them |
| set_auto_approve_users(uuid,boolean) | Owner, including archived; changes one setting | Expanded can_manage_settings scope; evaluate ordinary Data API edit instead of preserving owner-only RPC necessity |
| set_tenant_archived(uuid,boolean) | Owner, permits archived; updates operational status | Reconcile accepted account-content/API archival boundary and transactional downstream lifecycle effects |

Only create_tenant has a production frontend RPC call. The other seven are current backend interfaces exercised by SQL/API tests or available to clients, not evidence their consuming UI is complete. Eight superseded read/edit RPCs dropped by the direct Data API migration are absent; do not restore compatibility wrappers.

| app_private function | Security / execution | Current role |
| --- | --- | --- |
| verified_user() | Definer, authenticated EXECUTE | Reads caller Auth identity: email present/confirmed, not anonymous, no current ban; returns UUID or null |
| active_tenant(uuid) | Definer, authenticated EXECUTE | Active operational status only |
| is_owner(uuid) | Definer, authenticated EXECUTE | Verified caller, active owner assignment; no community-standing requirement |
| can_modify_content(uuid) | Definer, authenticated EXECUTE | Verified active flagged assignment; active tenant or owner; no approved-account requirement |
| has_permission(uuid,text) | Definer, owner-only EXECUTE | Active tenant/assignment; only approve and create_admin switches; no approved-account requirement |
| lock_tenant(uuid,boolean,boolean) | Definer, owner-only EXECUTE | Verified caller; tenant row lock; optional owner check and owner archived exception |
| provision_user_account() | Definer, trigger-only entry | Auth INSERT creates global account; does not create curated profiles |
| require_tenant_roots() | Definer, trigger-only entry | Deferred exactly-one-active-owner and settings existence; no approved-owner-account requirement |
| append_admin_action() | Definer, trigger-only entry | Generic table.operation action, actor/target/key metadata; no before/after transition or audit category |
| stamp_audit() | Invoker, trigger-only entry | Trusted created/updated time and auth.uid attribution; preserves original creation fields |
| protect_invariants() | Invoker, trigger-only entry | Identity/slug immutability, valid timezone, owner immutability and three owner grants true |
| normalize_editable_text() | Invoker, trigger-only entry | Trims editable tenant/profile fields and normalizes nullable text |
| reject_audit_mutation() | Invoker, trigger-only entry | Rejects UPDATE/DELETE on audit records |

“Trigger-only entry” means API roles lack direct EXECUTE grants, not that SQL exposes no internal owner privilege. Current private helper execution does not grant general Auth-row access. Helper internals, RLS and command checks must be revised together to prevent stale staff authority or recursive policy problems when audiences expand.

## Triggers, constraints and indexes

The 29 application triggers comprise eight invariant guards, eight audit stampers, three text normalizers, three deferred tenant-root checks, five administrative-action loggers, one append-only audit guard and the Auth-user provisioning trigger. All are enabled. Complete attachment/function/event definitions are in the evidence.

Fifty-seven constraints include PKs/composite tenant-account FKs, restricted deletion of referenced identities, profile text checks, standing/status checks, owner permission checks, slug/geographic/content-key validation and deferred root triggers. Thirty-four indexes include unique tenant slug and one owner per tenant, per-user community/staff/profile lookup, the tenant/standing approval queue and audit actor/target/time indexes. No app sequences or app-defined enum types are required by these migrations; current statuses use text CHECK constraints. New audience and lifecycle predicates need their own index review; the current index set is not evidence of adequate future query performance.

The generic audit logger records inserts/updates/deletes of tenants, settings, staff assignments, community accounts and website overrides. It cannot reconstruct all historical standing transitions or role changes: old/new values, category membership and structured disciplinary action/resolution are not stored. Current trusted actor UUID reads are already allowed by table grants where RLS admits the row.

## Application and test dependencies

| Source | Current database use | Change impact |
| --- | --- | --- |
| src/features/user-accounts/api.ts:45–87; hooks.ts | Own global profile read/upsert; three preference fields read/update; explicit affected-row checks | Preserve working self contracts and one settings save; new peer read paths require separate authorization |
| src/features/user-accounts/api.ts:99–114; hooks.ts; AccountCommunitiesTab.tsx | my_community_summaries read with filters and stable paged order | Update transport/types together if replacing view; preserve output/filter/history behavior |
| src/features/communities/api.ts:24–41; hooks.ts; CommunityCreationForm.tsx | create_tenant and p_join_community; default false and optional checkbox | Accepted required approved owner account supersedes this API/UI option; relevant creation API/hook/page tests explicitly assert old behavior |
| src/features/communities/api.ts:48–66 | Exported community preference UPDATE and profile upsert | No current production UI consumers found; do not infer optional backend access. Upsert currently sends tenant_id and relies on its UPDATE grant |
| src/lib/database.types.ts | Nine table types, three views, eight public functions, generated relationship links | Regenerate against final schema; view dependency references also change |
| src/lib/supabase.ts; src/features/auth/api.ts | Browser-safe key guard; Supabase Auth initialization/session operations | Auth identity is distinct from app standing; preserve verified caller checks and avoid privileged browser keys |

Repository search found no application Edge Function invoke, database Realtime subscription or Storage operation; community content/event/table/discussion/competition screens still use mock APIs. No deployed Edge Functions were listed. These are implementation facts, not reasons to exclude accepted future audiences.

Existing test assets: identity_tenant.test.sql, user_account_profiles.test.sql, community_summaries.test.sql, direct_data_api.test.sql; direct_data_api.mjs, direct_data_api_upgrade.mjs, hosted_direct_data_api.mjs and concurrency.mjs; associated frontend feature tests. They cover earlier milestone contracts and contain assertions that now need deliberate replacement: optional owner participation, owner-only tenant/settings/audit reads, self-only profiles, legacy staff eligibility and the three old view interfaces. Do not keep those expectations merely to keep tests green. No behavioral test pass is claimed in this package.

## Backfill evidence

The aggregate preflight found one approved community account and one active staff assignment. No owner lacks an approved account and no active non-owner staff lacks approved standing in this snapshot. One community account lacks a community profile; no global account lacks a global profile. Therefore the new invariant is a real contract change even though current owners need no membership repair at this moment.

Under the accepted legacy first_approved_at rule, one row receives its created_at; zero pending rows remain null and zero removed rows currently need conversion. There are zero suspended/removed rows requiring a restriction backfill in this snapshot. Revalidate at migration time; these counts are not constraints on future data.

The missing curated community profile needs an explicit backfill/content-source choice in package 2. Do not invent a name/bio or introduce ongoing global-profile fallback/synchronization. Current generic audit history cannot supply truthful historical transition reasons or actual first-approval dates; use only the user-approved created_at approximation and explicit migration provenance where needed.

## Required change list for packages 2 and 3

| ID | Change / deliverable | Evidence and boundary |
| --- | --- | --- |
| B-01 | Finalize standing lookup/capabilities, inactive conversion, restriction flag, first approval and paused staff DDL/backfills | Current CHECKs and absent columns verified. Preserve suspended private activity/DM exceptions and authoritative restriction flag; do not revive is_active or removed as parallel current-state flags |
| B-02 | Require approved owner participation and effective approved staff; revise creation/grant/root checks and current UI | Current owner option and missing membership checks verified; permission reads remain distinct from effective authority |
| B-03 | Add accepted preference/settings/participant/staff flags and can_create_admin → can_grant_staff rename | Eight booleans deployed; inventory17 is target. Report handling folds into can_discipline_users; no legacy aliases |
| B-04 | Design independent global/community profile audiences, public identity projections and blocks | Current self-only RLS and absent block relations cannot implement intended peer visibility; raw settings stay private |
| B-05 | Expand tenant/settings/copy/account/staff readers and audit categories to accepted contracts | Keep public subsets, private preferences, category histories and owner archived management distinct; decide row/column separation and projection interfaces |
| B-06 | Replace or redesign three flagged views together with target RLS/helpers | All four original errors persist. Candidate Auth dependency needs isolation; do not force all reads into RPCs to preserve old restrictions |
| B-07 | Narrow UPDATE identity grants and settle upsert/creation interfaces | tenant_id and override keys currently UPDATE-granted but trigger-protected; trusted insertion context and scalar edits require different contracts |
| B-08 | Define future-object defaults and explicit table/column/function grants | Broad inherited public defaults verified; scope changes to intended creators/schemas and keep trusted platform requirements |
| B-09 | Design transactional approval/withdrawal/reactivation/discipline/staff/archive transitions and structured audit records | Current commands lack profile atomicity, withdrawal/return logic, restriction/paused handling and category events. Direct discipline must not require a report |
| B-10 | Specify the archived-community API boundary and direct REST enforcement | No Edge Functions exist; decide a reachable enforcement design consistent with the accepted UI/API rule, without silently adding archive DB rules or leaving a bypass |
| B-11 | Coordinate callers, generated types and replacement tests; remove compatibility obligations | Existing owner checkbox and nullable legacy permission signature are concrete review targets; no new wrappers or parallel legacy APIs |
| B-12 | Specify permission/lifecycle predicates for accepted future domains and explicit dependency boundaries | Activities/chats/reports/competitions are not migrated. Foundation helpers must support intended use; full future domain implementation is not silently included here |

The next deliverable is the combined package 2/3 specification: exact target tables/columns/backfills, action catalogue and transitions, grants/default privileges, policy/helper interfaces, safe projections/RPC choices and coordinated caller changes. Remaining physical design decisions include profile backfill input, withdrawal/reactivation request representation, structured history/category storage and archive API reachability. These do not reopen accepted audience or disciplinary authority rules. Feature-specific unresolved decisions in matrix16 block only their dependent operations.

The two Auth-configuration advisor warnings remain a separate operational item, not an excuse to broaden this migration. Comprehensive hosted deployment, role/column/row tests and post-migration advisor verification are later packages.
