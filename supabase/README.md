# Auth, accounts, and tenants

The first two versioned migrations implement the agreed feature slice. They target a Supabase database with its Auth migrations already applied. They do not create or replace Supabase-owned Auth tables.

Validated with Supabase CLI 2.119.0: a clean local rebuild, 85 pgTAP assertions, three two-connection concurrency scenarios, SQL lint, the live email-confirmation setting, and the application TypeScript/production build all passed. Generated public-schema types are checked in at `src/lib/database.types.ts`. The selected hosted project's migration history now reports both migrations applied; frontend auth integration remains outstanding.

## Selected hosted testing environment

- Project reference: `fsnipgsrlclbnfepcbvz`.
- API URL: `https://fsnipgsrlclbnfepcbvz.supabase.co`.
- Initial frontend/Site URL: `http://localhost:5173`.
- Intended exact redirect allowlist: `http://localhost:5173/auth/callback` and `http://localhost:5173/auth/reset-password`.
- Authentication emails: English initially; localization later.
- Email confirmation remains mandatory. Resend is selected, and `thecrowdedtable.app` was purchased through Cloudflare Registrar. Recommended sender: `accounts@auth.thecrowdedtable.app`, pending confirmation of the verified subdomain. See the [Auth operations record](../docs/11-auth-operations.md) for settings and review triggers.

CLI access is restored and the repository is linked to this project. Remote migration history lists `20261001000100` and `20261001000200`; `db push --dry-run` reports no pending migrations. No migration was reapplied during this check. The reviewed configuration push applied the localhost Site URL, both callback URLs, minimum password length 12, and secure password changes. Email confirmation was already enabled. A subsequent configuration comparison reports zero declared-setting changes; undeclared remote settings were preserved. SMTP/provider setup and frontend auth/callback handlers remain outstanding before end-to-end testing. Connecting localhost to this URL uses hosted data, not the local Docker database.

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

Eight application tables are included: `user_accounts`, `tenants`, `tenant_settings`, `tenant_staff_assignments`, `community_accounts`, `community_account_profiles`, `tenant_website_content_overrides`, and `tenant_admin_actions`.

All have RLS. Browser roles have no direct insert/update/delete privileges. Writes go through explicitly granted, verified-user RPCs with fixed empty search paths and fully qualified references. Internal helpers live in the non-exposed `app_private` schema. Only policy read helpers are executable by authenticated users. Never add `app_private` to exposed API schemas.

| RPC | Authorization / behavior |
| --- | --- |
| `lookup_tenant(p_slug)` | Anonymous or authenticated; seven safe fields for one active tenant |
| `create_tenant(...)` | Verified account; atomically creates tenant, settings, sole owner, and optional approved community account; returns tenant UUID |
| `update_tenant_details(...)` | Owner; name/location/timezone, never slug or ownership |
| `set_tenant_archived(...)` | Owner; reversible archive/restore |
| `set_auto_approve_users(...)` | Owner; affects future joins only |
| `join_community(...)` | Verified user, active tenant; returns standing; retries preserve existing standing |
| `approve_community_account(...)` | Active same-tenant staff with `can_approve_users`; pending → approved only |
| `save_community_profile(...)` | Own pending/approved community account in active tenant; upserts display name/bio |
| `list_admin_candidates(...)` | Active same-tenant staff with `can_create_admin`; verified community users, optional display names, standing/staff status only |
| `list_pending_community_accounts(...)` | Active same-tenant staff with `can_approve_users`; IDs and optional display names only |
| `create_tenant_admin(...)` | `can_create_admin`; target must be a verified same-tenant community account; no permission inheritance; duplicate assignments fail |
| `set_admin_permissions(...)` | Owner; edits two flags on active admins only |
| `set_website_content_override(...)` | Owner; supported slot only; `p_text_value = NULL` resets to default |

Owner management commands work while archived. Ordinary participation and delegated admin actions do not. Owner authority remains independent of community standing; assigning an admin does not approve participation. No suspension/removal/reinstatement, staff invitation, ownership-transfer, or directory commands ship here.

Authenticated direct reads are self-only for global accounts and community participation/profiles, owner-only for tenant details/settings/copy/audit, and self-or-owner for staff assignments. Archived participation reads are denied. Owners see other users' display names only through narrow administrative lists, not through full profile reads. The current website slots all belong to the private Community page; participant content reads await entitlement implementation. Render stored copy as text, never raw HTML.

## Invariants and implementation choices

- Slugs: 3–63 lowercase ASCII letters/digits with single separating hyphens; immutable; reserved route names are listed explicitly in migration 1. Extend that list with future route changes.
- Names: 1–120 trimmed characters; region/city nullable, at most 120. Country uses the enumerated two-letter ISO country-code set. Timezones must exist in PostgreSQL's timezone catalog.
- Profiles: required trimmed display name of 1–80 characters; optional bio up to 2,000. No profile is required for staff authority.
- Exactly one owner and one settings record must exist when a transaction completes. Unique and deferred constraint triggers enforce this; owner changes/deletion are prohibited. Owner inserts normalize all administrative flags to true; later disabling them is rejected.
- Tenant mutations lock the tenant row before checking permissions/state, serializing archive, approvals, settings, and staff changes. Slug uniqueness is enforced by the database, including concurrent creation.
- Audit actor UUIDs reference global users. `NULL` means system. Signup records are attributed to the new user; backend actions preserve the initiating user's JWT identity. A worker without a user context records system attribution. Do not run human-initiated jobs with a service credential and silently lose the initiating actor; design that worker's trusted attribution contract first.
- Audit timestamps/actors are stamped by triggers. Referenced user/Auth deletion is restricted; human references are never nulled by deletion. `tenant_admin_actions` is append-only and deliberately omits update audit columns. It stores actor, operation, tenant and target identifiers, not profile/copy contents or a full before/after history.
- New permission migrations must update owner initialization, checks, and tests together. No platform bypass is exposed to browser roles. Database administrators/service credentials remain trusted infrastructure.

## Validation

`tests/identity_tenant.test.sql` uses pgTAP and real anonymous/authenticated roles against Supabase's Auth schema. Fixtures roll back. It covers two-tenant isolation, verification gates, owner invariants, protected writes, explicit admin permissions, public lookup, copy validation, archival, audit attribution, and restrictive deletion.

`tests/concurrency.mjs` exercises simultaneous database connections for archive versus join, permission revocation versus approval, and duplicate slug creation. It targets only the dedicated Docker container `crowded-table-migration-test` and leaves fixtures there. Do not point it at development/production data. Prepare that disposable container with Supabase PostgreSQL, apply the matching GoTrue Auth migrations, and then apply both application migrations before running `node supabase/tests/concurrency.mjs`. Remove the disposable container after the run.

Auth email delivery/callback UX and the frontend integration remain separate work. A database test of verified state is not an end-to-end email verification test.
