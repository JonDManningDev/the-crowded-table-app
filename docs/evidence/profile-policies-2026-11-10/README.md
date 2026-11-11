# Profile, self-service and relationship policies - issue #12

Authorized by the user's request to close issue #11 and invoke the implement skill for [issue #12](https://github.com/JonDManningDev/the-crowded-table-app/issues/12), starting at `8cf4bb3abe4491f46080bd66650fee04839ccec3`. Issue #11 was closed with its checkpoint and verification explanation before starting; #12's open blocker count is zero. Parent #5, ADR 0001, document 23 and the intended access matrix govern this checkpoint. Issues #13-#15 and hosted work remain separate. Pre-existing unstaged planning/publication work is excluded from the commit.

## Entitlements and ownership

User-account policies now own the exact caller predicates for global preference reads/writes and own global-profile reads/upsert updates, plus personal All/Managed/Owned relationship filtering. Existing verified identity, current Auth eligibility locking, default profile identity, caller-scoped RLS, narrow column grants and trusted attribution remain. There is no new caller/target selector. An absent global profile remains a successful null response; first save inserts it, later saves preserve creation metadata. Global self management remains independent of community standing/archive. Global discovery, cross-account global-profile access and blocks retain their existing SQL boundary until issue #13.

Community policies now own the following audiences, independently of personal blocks:

| Operation | API audience/context |
| --- | --- |
| Exact curated profile | Pending viewers may read their own profile in an active community. Approved/suspended viewers may read exact approved/suspended/inactive targets in the same active community. Archived content is visible only to the approved active owner. Tenant/target IDs remain exact filters in both branches. Missing profiles and unauthorized targets remain 404. |
| Own curated-profile edit | Pending, approved and suspended account holders in an active community; inactive and all archived edits remain denied, including archived owner self edits. No tenant-root lock is added. |
| Own preference read | The holder in an active community, including pending/suspended/inactive standing; archived owner may read its own preferences. An archive creates no holder/staff exception. |
| Own preference edit | Pending/approved holder in an active community. The service retains account-before-preference locking, including the post-wait standing reread. The policy predicate also runs in the mutation statement so lifecycle is not checked in an earlier cached snapshot. |
| Member directory | Approved/suspended viewer in an active community. Target predicate includes only approved/suspended accounts, before cursor/order/limit; inactive exact-target access is not enumeration. Missing curated profiles stay null, and active approved staff retain their ordinary role badges. |

Exact profile queries resolve viewer, target, lifecycle and profile in one statement snapshot after setting verified tenant scope. The grouped policy-owned `communityProfileSourceAudience` is the narrow, currently consumed source-access export available for later block/global-profile composition. No unused sharing API, registry, universal context or cross-request cache is added. Member-directory services preserve the tenant SHARE lock and load only current lifecycle/viewer-standing facts after any wait. Policy decision and denial mapping remain separate from the query. Shared profile/global fallback fields are not introduced.

The caller-only `my_community_relationships()` exception remains unchanged. Its exact four columns are `(tenant_id,is_owned,is_managed,is_member)`, bound to verified identity with no arbitrary subject argument. It includes pending/approved/suspended own relationships and excludes inactive accounts; active approved owner/staff facts determine Owned/Managed. It intentionally ignores community archive for cards. No profile/preference/other-user identity is returned. The community-owned `myCommunityRelationships(tx)` adapter exposes that typed query source; the user-account summary operation owns the tenant-card projection, personal filter, microsecond cursor, tie ordering and pagination. This is the documented cross-feature ownership exception; no duplicate operation/route, forwarding compatibility interface or frontend reorganization is added.

## Normalization and forward migration

All actual application profile writers were inventoried: global own-profile upsert, community own-profile edit and the common account creation helper used by community creation/join. They already normalize the name with `trim()` and bio with `trim() || null`; those canonical caller writes are retained and tested after trigger retirement. Historical migrations and their backfill behavior remain untouched. Auth provisioning still creates the required global account, not an inferred profile.

`20261110000600_profile_self_service_policies.sql` drops the two remaining `b_normalize` triggers and `normalize_editable_text`. Existing name trim/length and bio length constraints remain. Because the removed trigger also canonicalized bios, new `global_profile_canonical_bio` and `community_profile_canonical_bio` CHECKs reject non-null empty or space-padded bios on all new/updated rows. They are NOT VALID against historical rows: the accepted earlier cutover explicitly preserved existing biography bytes, including surrounding spaces. No data rewrite is performed. PostgreSQL now rejects such inputs instead of silently repairing them. API creation/join/edit normalization preserves its existing HTTP behavior.

The migration replaces the two own-edit business policies with verified-self scope only. Other rows remain unwritable; identities/metadata remain protected. The scope of command inserts, global self RLS, own preference reads, lifecycle sharing cleanup and all independent archive fences are unchanged. The runtime manifest and all grants are identical before and after this checkpoint; there is no new function, definer, runtime privilege or external application grant. Startup readiness requires normalizer absence and the retained relationship projection's EXECUTE privilege.

A defective trusted runtime writer may now update canonical own community text/preferences while inactive/suspended if it bypasses the API. Tests explicitly demonstrate that breadth in a rolled-back probe while the equivalent API operations remain denied. Self scope still prevents editing another user's profile, G-02 still hides raw archived content from non-owners, and inactive sharing still rejects true from either relation's invalid final state. No independent PostgreSQL product standing authorization is claimed after its move to the API.

`active_tenant` and `is_approved_owner` are reviewed, retained private archive safeguards. The first returns only current tenant-active existence; the second returns the verified caller's approved active owner fact using protected tables to avoid archive-policy recursion. Their bodies/privileges and independent restrictive archive policies are unchanged. The assigned API operations now query their own policy facts/predicates rather than invoking these helpers as product authorization. Existing calls inside the not-yet-migrated global/public functions remain assigned to issues #13/#14. The retained relationship definer stays a narrowly reviewed explicit exception, not authority to expose raw archived account/profile content.

[Before catalog](before-catalog.json) and [after catalog](after-catalog.json) capture metadata only: relevant function bodies, policies, triggers, profile constraints, role flags/membership and privileges. Comparison confirms exactly one retired function, two removed normalizing triggers, unchanged runtime manifest and empty external relation/function grants. Both new canonical checks enforce future writes while preserving historical biography bytes. Required roots, inactive-sharing guards, immutable attribution and semantic event ownership are untouched.

## Verification

Agreed seams: HTTP injection contracts, real local Auth/HTTP operations, actual ct_api SQL/concurrent sessions, external REST/GraphQL, compiler/generated-schema checks. No private-policy unit seam is added. The user requested implementation on this established checkpoint, so the documented seams were reused without restarting design approval.

The direct-runtime normalization probe first failed against the old silently correcting trigger, then passed after the migration. Tests verify rejected raw noncanonical names/bios and accepted API trimming/null conversion at creation, join, global first/upsert save and community edit. Existing global absent-profile/null, metadata, all preference combinations and nearest hidden/missing/cross-community denials remain. Added checks verify raw own inactive edits are possible only outside API authorization, other-user edits stay scoped, archived owner preference reads remain allowed and archived own profile edits stay denied.

The directory suite caught a missing outer grouping around the extracted archived-owner OR branch, which could bypass the exact-target filter. The predicate was corrected; deterministic assertions now read each archived target and verify exact tenant/user identity, plus missing, unrelated and unknown-target 404s. The complete directory suite passed afterward. Existing tests cover inactive exact-target visibility versus directory exclusion, suspended/pending audiences, absent curated profiles, field/badge projections, bounded pages, opaque cursor binding/tampering, revocation/archive waits and both admitted-read/write orders. The global-profile suite verifies that personal blocks leave ordinary community profiles/directories visible.

Self-service concurrency verifies independent users' profile/preference saves and saves while the tenant root is locked, preserving the no-root-lock contract. Sharing/deactivation checks cover both lock orders and raw invalid final-state rejection from either relation. Summary tests cover archived own cards without raw archived access, role filters, no unrelated cards, default/max limits, 102-card tie ordering and actor/filter-scoped microsecond cursors. Browser REST/GraphQL/runtime scope/metadata and current Auth ban denials remain.

Injection doubles were updated for the new scope query and member-directory fact shape; the HTTP fixture was not regenerated. Populated replay caught deliberately preserved historical space-padded bios. The draft migration was corrected to use NOT VALID bio checks, preserving those existing values while enforcing every new/update write. The local draft constraints were aligned with the corrected migration using the same two CHECK definitions; no data or metadata row was rewritten. Existing display-name/length constraints remain validated. An old configuration pgTAP assertion that two profile normalizers still survived was replaced with authorized complete retirement; new pgTAP checks cover absent triggers/function, canonical constraints and retired edit business policies. No still-required safeguard assertion was removed.

Executed commands (Windows uses npm.cmd; the untracked local runner replaces only the obsolete forwarded transport port with the CLI-resolved loopback endpoint):

```sh
npm run check -w server
node --test server/tests/community-http.test.mjs server/tests/user-accounts-http.test.mjs
node --env-file=server/.env.local .scratch/issue-12-local.mjs node server/tests/self-service-local.mjs
node --env-file=server/.env.local .scratch/issue-12-local.mjs node server/tests/directory-local.mjs
npm run test:http -w server
node --env-file=server/.env.local .scratch/issue-12-local.mjs npm.cmd run test:local -w server
npm run verify:types
npm run test:types:local -w server
node --env-file=server/.env.local .scratch/issue-12-local.mjs sql test db --yes
node --env-file=server/.env.local .scratch/issue-12-local.mjs sql db lint --schema public,app_private --level warning
node --env-file=server/.env.local .scratch/issue-12-local.mjs node supabase/tests/direct_data_api.mjs
node supabase/tests/direct_data_api_upgrade.mjs
npm run lint
npm test -- --run
npm run build
```

Passed: all 75 HTTP cases, nine local foundation suites, 12 retry assertions, 134-file client boundary scan, 283 pgTAP assertions, generated-type drift and two driver/schema tests, all 279 client cases, compiler, lint and production build. SQL lint reports no schema errors. All 51 hostile PostgREST checks and clean replay/populated upgrade passed, including unchanged profile bytes/attribution across the later policy migrations and rejected new noncanonical biography writes. The self-service suite passed again after the draft constraint correction. Final SQL integrity/lint, compiler/lint and staged whitespace checks also passed. No required gate remains failed or unavailable. Native exit statuses were checked; PowerShell's redirected npm notice formatting is not a test failure. The pre-existing bundle-size warning remains.

Local target: API 127.0.0.1:54321, PostgreSQL 127.0.0.1:54322, Node 22.22.2. Docker checks required execution outside the sandbox. Applied only the forward migration using `supabase migration up --local`; SQL CLI checks pass the explicit verified loopback URL. No working-database reset, hosted mutation/deployment, schema-type regeneration to conceal drift or UI change is included.

## Review

Two independent code-review agents reviewed the nonempty staged checkpoint against `8cf4bb3abe4491f46080bd66650fee04839ccec3`, excluding pre-existing unstaged planning/publication changes. They assessed substantive code, tests and recorded evidence without independently rerunning mutating suites.

### Standards

No findings. Policy/service ownership, explicit tenant scope, locks and statement predicates, archive adapter ownership and normalization retirement match the documented boundaries. NOT VALID biography checks preserve the explicitly accepted historical bytes while enforcing all future writes; they introduce no legacy interface. No actionable baseline code smells were identified.

### Spec

No findings. The assigned audiences, exact-target/archive grouping, independent saves, normalization callers, caller-only relationship projection and existing storage safeguards are preserved. The narrow source-access export satisfies the ticket without implementing later global/block/public-directory composition. Existing profile bytes/attribution and new-write canonical rejection are verified.

Review summary: Standards 0 findings; Spec 0 findings. This completes the locally verified issue #12 checkpoint. Issues #13-#15 and hosted migration/verification retain their separate scope and gates.
