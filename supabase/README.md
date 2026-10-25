# Auth, accounts, and tenants

The first two versioned migrations implement the agreed feature slice. They target a Supabase database with its Auth migrations already applied. They do not create or replace Supabase-owned Auth tables.

Validated with Supabase CLI 2.119.0: a clean local rebuild, 85 pgTAP assertions, three two-connection concurrency scenarios, SQL lint, the live email-confirmation setting, and the application TypeScript/production build all passed. Generated public-schema types are checked in at `src/lib/database.types.ts`. That initial validation reported both original migrations applied; frontend account flows are implemented; hosted signup email receipt, verified password sign-in, and recovery through password update/home return were confirmed by the user.

## Global profile implementation — 2026-10-16

Historical baseline: the RPC transports described in this section are replaced by `20261024000200_direct_data_api.sql`, now applied locally and to hosted testing; see the current access contract below.

The forward migrations `20261016000100` and `20261016000200` align the deployed global-profile foundation with D-111/D-113/D-114. Global profiles now use trimmed 1–80 character names, nullable bios up to 2,000 characters, immutable identity, and trusted audit triggers. Existing profiles are preserved; their new timestamps mark audit adoption and historical actors remain null because the original migration did not record them. New writes derive the verified caller in `save_user_account_profile`; browser roles have self-only reads and no direct profile writes.

Account flags `user_is_discoverable` and `enable_matchmaking` default true independently; community-account `show_global_profile` defaults false. `set_user_account_preferences` updates only supplied global values for the verified caller. `set_community_global_profile_visibility` changes only that caller's selected community account, under the same active-tenant and pending/approved-standing gates as curated profile editing. Existing joins preserve saved preferences. The global Settings UI persists the two account flags; the sample community UI does not pretend to edit a real community-account preference.

Self-only **base-table reads are intentional**, not the final audience contract. Per schema/auth plans and Q-016, wider reads must use audience-specific feature APIs with safe projections, live preference checks, eligibility and applicable account blocks. Those APIs, eligible community viewers, cross-community composition, result fields, and revocation/cache semantics remain unfinished. Neither default-true global flag nor community consent grants direct table reads, contact permission, or unrelated affiliation/history access. Search/matchmaking, blocking/private labels, atomic profile-bearing joins and creator participation, and real community preference UI remain follow-up work. Do not infer that these features shipped merely because their preference columns exist.

The correction was verified locally with 120 database assertions and database lint, and both forward migrations were successfully applied to the hosted testing project on 2026-10-16. The frontend is local source/build work; no frontend hosting deployment is implied.

## Selected hosted testing environment

- Project reference: `fsnipgsrlclbnfepcbvz`.
- API URL: `https://fsnipgsrlclbnfepcbvz.supabase.co`.
- Initial frontend/Site URL: `http://localhost:5173`.
- Intended exact redirect allowlist: `http://localhost:5173/auth/callback` and `http://localhost:5173/auth/reset-password`.
- Authentication emails: English initially; localization later.
- Email confirmation remains mandatory. Resend is selected, and `thecrowdedtable.app` was purchased through Cloudflare Registrar. Recommended sender: `accounts@auth.thecrowdedtable.app`, pending confirmation of the verified subdomain. See the [Auth operations record](../docs/11-auth-operations.md) for settings and review triggers.

The repository is linked to this project. A fresh verification after reauthentication on 2026-10-16 using CLI 2.121.0 confirmed matching migration history and an empty dry run. Earlier intermittent HTTP 403s are recorded in the Auth operations guide; their cause remains unconfirmed. After the 2026-10-16 deployment, remote migration history lists `20261001000100`, `20261001000200`, `20261015000100`, `20261016000100`, and `20261016000200`; the post-deployment `db push --dry-run` reported no pending migrations. The profile migrations were applied once through the CLI. The reviewed configuration push applied the localhost Site URL, both callback URLs, minimum password length 12, and secure password changes. Email confirmation was already enabled. A subsequent configuration comparison reports zero declared-setting changes; undeclared remote settings were preserved. The user now reports Resend/SMTP configured, and frontend auth/callback handlers are implemented. The user confirmed signup email receipt, verification, and password sign-in returning home. A callback timing defect was fixed and covered by real-SDK regression tests; hosted recovery through password change/home return was confirmed by the user. A fresh signup remains the manual retest for the corrected automatic-confirmation redirect. A later CLI key-read attempt returned HTTP 403; the supplied public key successfully reads hosted Auth settings. Connecting localhost to this URL uses hosted data, not the local Docker database.

## Local development

From the repository root, with Docker running and the Supabase CLI available:

```powershell
npx --yes supabase start
npx --yes supabase test db
npx --yes supabase db lint --local --level warning
```

To rebuild **only this project's disposable local database**, `npx --yes supabase db reset --local` reapplies migrations and deletes local data. Do not use reset against a database containing work you need. The configuration enables email/password signup, requires email confirmation and a minimum 12-character password, disables anonymous Auth users, and captures local email. Production confirmation, SMTP, site URL, and redirect allowlists must be configured separately; local TOML is not evidence that hosted Auth is configured.

Regenerate the checked-in types after schema changes:

```powershell
npx --yes supabase gen types typescript --local --schema public | Set-Content -Encoding utf8 src/lib/database.types.ts
```

Apply these files in timestamp order through the Supabase migration workflow. Once deployed, change behavior with a new migration rather than editing an applied file. No remote deployment is performed by these files or the tests. Review `supabase db push --dry-run` against the intended linked project before a separately authorized deployment. Do not roll back by dropping account/tenant tables containing user data; use forward repairs and backups.

## Data and access

The global-profile additions above extend this original milestone description.

The original eight application tables are: `user_accounts`, `tenants`, `tenant_settings`, `tenant_staff_assignments`, `community_accounts`, `community_account_profiles`, `tenant_website_content_overrides`, and `tenant_admin_actions`.

All application tables have RLS. As of local migration `20261024000200`, independent edits use per-operation policies and column-specific DML grants. Retained commands use verified-user RPCs with fixed empty search paths and fully qualified references. Internal helpers live in the non-exposed `app_private` schema; only policy read helpers are executable by authenticated users. Never add `app_private` to exposed API schemas.

| Direct PostgREST operation | Authorization / behavior |
| --- | --- |
| `user_account_profiles` upsert | Verified self; omit `user_id` so Auth supplies it; name/bio only |
| `user_accounts` update | Verified self, explicit user-ID filter; discovery/matchmaking flags only |
| `community_account_profiles` upsert | Verified self, active tenant, pending/approved standing; omit `user_id`; conflict key `(tenant_id,user_id)` |
| `community_accounts` update | Same lifecycle/standing gates; one `saveCommunityAccountPreferences` request for all supported preference fields, currently `show_global_profile` only |
| `tenants` update | Owner, including archived; name/location/timezone only |
| `tenant_website_content_overrides` upsert/delete | Active same-tenant staff with `can_modify_content`; delegated edits require active tenant; owners retain archived access; delete resets an override |
| `tenant_admin_candidates` select | Active same-tenant `can_create_admin`; tenant ID plus original verified-candidate projection |
| `tenant_pending_community_accounts` select | Active same-tenant `can_approve_users`; tenant ID, user ID and optional display name |

The two administrative views deliberately use definer semantics and explicit caller predicates; base profile reads remain self-only. Client filters cannot widen their audience. Profile inserts/updates and tenant detail edits normalize text in triggers; audit/identity safeguards apply to every write. Column grants permit restating upsert conflict keys, while triggers reject changing them. Browser writes cannot supply audit fields. Use explicit filters on UPDATE/DELETE (PostgREST safeupdate requires them) and `.select(key).single()` to surface zero-row results as failures. Resetting a missing/unknown override returns no row and is therefore a failed single-row save, rather than the former RPC's dedicated unknown-key exception.

| RPC | Authorization / behavior |
| --- | --- |
| `lookup_tenant(p_slug)` | Anonymous or authenticated; seven safe fields for one active tenant |
| `create_tenant(...)` | Verified account; atomically creates tenant, settings, sole owner, and optional approved community account; returns tenant UUID |
| `set_tenant_archived(...)` | Owner; reversible archive/restore |
| `set_auto_approve_users(...)` | Owner; affects future joins only |
| `join_community(...)` | Verified user, active tenant; returns standing; retries preserve existing standing |
| `approve_community_account(...)` | Active same-tenant staff with `can_approve_users`; pending → approved only |
| `create_tenant_admin(...)` | `can_create_admin`; target must be a verified same-tenant community account; no permission inheritance; duplicate assignments fail |
| `set_admin_permissions(...)` | Owner; edits three flags on active admins; omitted/null flags retain their values, including legacy four-argument callers |

Owner management commands work while archived. Ordinary participation and delegated admin actions do not. Owner authority remains independent of community standing; assigning an admin does not approve participation. No suspension/removal/reinstatement, staff invitation, ownership-transfer, or directory commands ship here.

Authenticated direct reads are self-only for global accounts and community participation/profiles, owner-only for tenant details/settings/audit, and self-or-owner for staff assignments. Content editors may read override rows and their attribution; this exposes neither tenant-wide audit history nor other users' profiles. Archived self relationship reads remain allowed by migration 20261024000100. Owners see other users' display names only through narrow administrative views. Website slots remain private; ordinary participant content audiences are separate future work, with no payment prerequisite. Render stored copy as text, never raw HTML.

## Invariants and implementation choices

- Slugs: 3–63 lowercase ASCII letters/digits with single separating hyphens; immutable; reserved route names are listed explicitly in migration 1. Extend that list with future route changes.
- Names: 1–120 trimmed characters; region/city nullable, at most 120. Country uses the enumerated two-letter ISO country-code set. Timezones must exist in PostgreSQL's timezone catalog.
- Profiles: required trimmed display name of 1–80 characters; optional bio up to 2,000. No profile is required for staff authority.
- Exactly one owner and one settings record must exist when a transaction completes. Unique and deferred constraint triggers enforce this; owner changes/deletion are prohibited. Owner inserts normalize all administrative flags to true; later disabling them is rejected.
- Retained commands lock the tenant row before checking permissions/state, serializing archive, approvals, settings, and staff changes. Independent edits do not explicitly lock the tenant; ordinary PostgreSQL row/FK locks still apply. Community profile/preferences use statement-time eligibility; an in-flight save may finish alongside an access/lifecycle change. Slug uniqueness is enforced by the database, including concurrent creation.
- Audit actor UUIDs reference global users. `NULL` means system. Signup records are attributed to the new user; backend actions preserve the initiating user's JWT identity. A worker without a user context records system attribution. Do not run human-initiated jobs with a service credential and silently lose the initiating actor; design that worker's trusted attribution contract first.
- Audit timestamps/actors are stamped by triggers. Referenced user/Auth deletion is restricted; human references are never nulled by deletion. `tenant_admin_actions` is append-only and deliberately omits update audit columns. It stores actor, operation, tenant and target identifiers, not profile/copy contents or a full before/after history.
- New permission migrations must update owner initialization, checks, and tests together. No platform bypass is exposed to browser roles. Database administrators/service credentials remain trusted infrastructure.

## Validation

For the direct Data API slice, run `npx supabase test db`, `node supabase/tests/direct_data_api.mjs`, and `node supabase/tests/direct_data_api_upgrade.mjs`. The first rolls back SQL fixtures. The HTTP/concurrency script accepts only the local loopback API on port 54321 and hardcodes this project's Docker database; it creates random synthetic identities/tenants and cleans up only those records. It exercises actual SDK upserts, filters/affected-row handling, independent member edits, profile saves while the tenant is locked, and retained permission/archive/slug races. The upgrade script creates and removes a temporary database with a minimal Auth schema contract for clean replay/populated upgrade checks; real Auth-schema behavior is covered by the other two suites. Credentials stay in process memory and are not printed.

Completed local verification: 232 SQL assertions, 45 HTTP checks plus concurrency scenarios, clean replay/populated upgrade, 74 frontend tests, build, ESLint and database lint pass. The existing bundle-size warning remains. Run the SQL and HTTP suites sequentially: SQL tests assume their rollback fixtures are the only synthetic communities visible in the local database.

Deployment boundary: `20261024000200` is applied locally and to hosted testing (`fsnipgsrlclbnfepcbvz`). All seven migration versions match and the final dry run is empty. Eight old RPCs are removed: use the updated frontend source; old RPC-based builds require updating. No frontend hosting deployment, compatibility fallback, or environment switch was performed.

Hosted verification on 2026-10-24: `node supabase/tests/hosted_direct_data_api.mjs --allow-hosted-testing` passed 48 actual PostgREST checks. This separate, explicitly opted-in script pins the testing project and verifies linkage before using CLI-provided keys in memory. It creates real password sessions for random synthetic users, checks profile/preference/content-permission paths, and removes its application fixtures and Auth users, verifying zero fixture users/tenants remain. Normal Auth audit events may remain. It does not test email delivery, visual UI flows, or hosted concurrency races. Local scripts remain local-only. See implementation status for the detailed hosted coverage and credential resolution.

`tests/identity_tenant.test.sql` uses pgTAP and real anonymous/authenticated roles against Supabase's Auth schema. Fixtures roll back. It covers two-tenant isolation, verification gates, owner invariants, protected writes, explicit admin permissions, public lookup, copy validation, archival, audit attribution, and restrictive deletion.

`tests/concurrency.mjs` exercises simultaneous database connections for archive versus join, permission revocation versus approval, and duplicate slug creation. It targets only the dedicated Docker container `crowded-table-migration-test` and leaves fixtures there. Do not point it at development/production data. Prepare that disposable container with Supabase PostgreSQL, apply the matching GoTrue Auth migrations, and then apply both application migrations before running `node supabase/tests/concurrency.mjs`. Remove the disposable container after the run.

Frontend account flows and user-assisted hosted delivery/recovery results are tracked in the Auth operations record. My Account → My Communities integrates `create_tenant` and the caller-scoped All/Managed/Owned summary list; the auth bar has been removed. Creation submits no user ID, role, permission, or audit fields; the database derives these from the authenticated actor. Optional participation defaults off; opting in creates an approved community account in the same transaction. The five preview sections still use mock data; joining existing communities, curated profile UI, and management UI remain separate work; global profile editing is implemented. A database test of verified state is not an end-to-end email verification test.


2026-10-24: migration 20261024000100_my_community_summaries.sql deployed to the selected hosted testing project. Six migration versions match and linked dry run is empty. Caller-scoped restricted summaries and archived self-relationship reads passed hosted existing-data authorization checks; real All/Managed/Owned browser flows passed. Full relationship-state matrix remains locally tested. See docs/12-implementation-status.md for detailed evidence and limits.

Global communication preference: 20261024000300_account_communication_preferences.sql is applied locally and to hosted testing. It adds user_accounts.allow_direct_messages (NOT NULL DEFAULT true) and its column UPDATE grant under existing verified-self RLS. Hosted testing supports the expanded frontend read/saveAccountPreferences projection. Local verification: 55 PostgREST checks, 232 pgTAP assertions, clean replay/populated upgrade; hosted verification passed 69 PostgREST checks, including every combination of the three account preferences, persistence, defaults, audit attribution and authorization denials; fixture cleanup verified.
