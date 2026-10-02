# Database schema plan

Status: initial auth/account/tenant migrations are implemented in `supabase/migrations/`; broader MVP relational design remains proposed. See [database implementation and validation](../supabase/README.md) for executable contracts and local setup. Deployment to a hosted database remains a separate step.

## First migration milestone

Include `user_accounts`, `tenants`, `tenant_settings`, `tenant_staff_assignments`, `community_accounts`, `community_account_profiles`, `tenant_website_content_overrides`, and `tenant_admin_actions` (canonical name replacing the conceptual `admin_actions`). Include constraints, indexes, audit handling, Auth signup provisioning, grants/RLS, controlled commands, and authorization tests with these tables.

- Implement tenant creation with its owner/settings and optional approved creator participation; public lookup by slug; owner-managed tenant details/settings, archive/restore, and website-copy overrides; community joining/approval; self-profile reads/edits; admin assignment; and an owner-only command to edit the two initial admin permission flags. The permission configuration UI and configurable new-admin defaults remain deferred.
- Owners select new admins from existing same-tenant `community_accounts` linked to verified global users. The backend enforces this selection boundary; arbitrary global users or other tenants' accounts are not eligible through this initial command. The established `can_create_admin` permission also permits delegated admins to use this controlled assignment operation. New assignments receive all-false permissions and do not change the target's community standing or entitlements. Existing assignments must not be silently overwritten by repeated creation requests.
- This is an initial onboarding restriction, not a new foreign key from staff assignments to community accounts. Staff authority remains independent of participation, including for owners without a community account. Admin invitations, delivery, redemption, related tables, and UI are follow-up work.
- Profile access is self-only initially, except for the narrow administrative selection/approval projections defined in the auth plan. No fellow-member directory or public profile access ships before the relevant entitlement/sharing policies. Include website-copy persistence with owner-only editing initially; broader admin editing requires future explicit permission flags.
- Implement joining and pending-account approval. Retain the defined standing values, but defer suspension/removal/reinstatement commands. Rejoining must never reset an existing account's standing. Finalize slug syntax, reserved names, and text limits during implementation alongside routing.
- Defer membership/payment/event tables and dependent features. SMTP, production callback destinations, and recovery screens do not block migration authoring, but must be configured/tested before signup is operational.

## Conventions and tenant boundary

Propose community = tenant. Every business table carries `tenant_id`; global auth/account identity is an explicit exception. Use UUID IDs, database-managed timestamps, `timestamptz` instants, and an IANA community timezone (proposed launch value `America/Tegucigalpa`). Use HNL minor units for monetary values, with currency stored explicitly. Prices are configurable.

All cross-entity references within a tenant use composite foreign keys to matching unique keys, such as `(tenant_id, activity_id)`. RLS controls access; these constraints prevent structurally invalid cross-tenant references.

### Canonical naming and audit conventions

- Table names are always plural and `snake_case`. Column names are always `snake_case`.
- A child table uses a singular prefix based on its parent entity: `tenants` → `tenant_staff_assignments`, `tenant_website_content_overrides`; `activities` → `activity_locations`. Apply this consistently when finalizing the physical schema; older conceptual table labels below and elsewhere in the planning docs must be reconciled before migrations, not treated as naming exceptions.
- Every table includes `created_at`, `updated_at`, `created_by`, and `updated_by` by default, including join tables. These standard fields are implicit in the table summaries below rather than repeated in every row. Any omission requires a documented table-specific reason; for example, a genuinely immutable, append-only table may omit update fields because updates are prohibited.
- `created_by` and `updated_by` are nullable UUID foreign keys to global user accounts, not community accounts: staff may act without being participants. SQL `NULL` means the system acted, not unknown attribution; no system account or UUID is needed. Trusted database/backend code sets timestamps and actor attribution; clients cannot choose or rewrite audit actors. Human-initiated actions retain the initiating user's attribution even when performed by backend code or workers. Creation initializes both actor fields to the creator (or both to `NULL` for system creation); updates preserve `created_by` and set `updated_by` to the acting user or explicitly to `NULL` for system updates. Signup provisioning normally attributes creation to the newly registered user, establishing that reference safely.
- Persist additional audit detail when needed through specific additional audit columns. Standard actor columns record creation and the latest update, not full history; sensitive commands still require `tenant_admin_actions` records.
- Initially prohibit hard deletion of referenced user accounts, including references from staff assignments, community accounts, and audit actor columns. Use restrictive foreign-key deletion behavior; do not cascade-delete dependent business records or use `ON DELETE SET NULL` to erase human attribution, since `NULL` means system. Auth identity deletion must not indirectly bypass this restriction through cascading account deletion. The eventual anonymization/auth-deletion workflow remains deferred and requires an explicit design preserving attribution and tenant ownership before it is enabled.

## Tenant identity, website copy, and settings

Keep `tenants` focused on the community's identity, primary geographic base, and lifecycle:

| Column | Requirement / purpose |
| --- | --- |
| `id` | UUID primary key |
| `slug` | Required lowercase, unique community URL identifier; reserved names prohibited; immutable after creation initially |
| `name` | Required community display name |
| `country_code` | Required standardized two-letter country code, such as `HN` |
| `state_province` | Nullable region name; plain text initially |
| `city` | Nullable city name; plain text initially |
| `timezone` | Required IANA timezone; do not infer solely from country |
| `operational_status` | Not null; `active` or `archived`, default `active`; transitions through controlled owner commands |
| `created_at`, `updated_at`, `created_by`, `updated_by` | Standard audit fields defined above |

Normalize blank optional location input to `NULL`. One primary geographic base does not need a separate tenant location table. Event venues and private addresses remain separate. Defer geographic reference tables, coordinates, street addresses, and postal codes until needed. Ownership remains authoritative in `tenant_staff_assignments`; do not duplicate it with `owner_user_id` on `tenants` or infer current ownership from `created_by`.

Tenant lifecycle initially supports `active` → `archived` and `archived` → `active`. Archiving prevents ordinary community participation and ordinary tenant-scoped writes while preserving owner access for explicit management/restoration operations. Archive is reversible and does not delete data, revoke the owner assignment, or remove the exactly-one-active-owner requirement. Restoration does not independently approve accounts, reinstate suspended/removed participants, or grant entitlements. Initially only the owner may archive or restore the tenant; platform suspension is deferred. Enforce tenant state in backend authorization, not merely navigation or hidden buttons.

Tenant slugs are 3–63 lowercase ASCII letters/digits with single separating hyphens, unique, and exclude the route names enumerated in the first migration. Enforce these rules in the backend/database, including uniqueness under concurrent creation. Slugs cannot be changed after creation in the initial version, even by the owner. Maintain the reserved-name list alongside routing changes. The slug identifies a community but never grants authority.

### Public tenant representation

For this milestone, provide a dedicated public lookup by slug for active tenants. Return only `id`, `slug`, `name`, `country_code`, `state_province`, `city`, and `timezone`. These location fields describe the public geographic base, never a private meeting address. The identifier grants no authority. Do not return `operational_status`, timestamps, audit actors, staff assignments/owner identity, permission flags, tenant settings, community accounts, or profiles through this interface. Website copy retains its separate page-specific visibility rules.

Enforce the explicit field list and active-tenant filter in the backend/database; the browser must not receive full rows and hide fields. Direct queries, joins, or alternate interfaces must not bypass the boundary. New tenant columns stay private until explicitly approved for public exposure. Archived tenants are absent from public slug lookup; show a generic “Community unavailable” result without exposing archive status, while preserving authenticated owner management/restoration access.

A “Find Your Next Community” discovery page and general community listings/search are deferred to a later release. This milestone supports individual community lookup by slug, not a browsable directory.

### Website copy overrides

Add `tenant_website_content_overrides` (the plural table name for the previously discussed website-content concept). The application owns page structure, supported sections, behavior, typography, and illustrations. Tenants customize only predefined text slots.

| Column | Requirement / purpose |
| --- | --- |
| `tenant_id` | FK to `tenants`; part of composite primary key |
| `content_key` | Application-defined slot identifier; part of composite primary key |
| `text_value` | Required replacement text |
| `created_at`, `updated_at`, `created_by`, `updated_by` | Standard audit fields; editors reference global user accounts |

Example slots for the Community page (keys are data values, not column names):

| `content_key` | Example copy |
| --- | --- |
| `community.hero.eyebrow` | People make the best games |
| `community.hero.heading` | A place to belong. |
| `community.hero.description` | Same table. More friends. Make yourself at home. |
| `community.welcome.eyebrow` | Your little corner of Tegucigalpa |
| `community.welcome.heading` | Come for a game. Stay for the people. |
| `community.welcome.body` | Ask a question. Share a favorite. Say hello to someone new. |
| `community.welcome.emphasis` | There's a whole community around you. |

Enforce uniqueness on `(tenant_id, content_key)`. Accept only application-defined keys, with slot-specific length limits and plain text/supported line breaks; do not accept arbitrary HTML, scripts, layouts, or behavior. A missing override uses the application default; resetting to default deletes the override. Location-aware defaults derive from the tenant location and have a fallback when city is absent. Saved custom copy remains explicit text and is not automatically rewritten when location changes. Action labels such as “Start a conversation” remain application-controlled initially.

Content reads follow the intended page's visibility: private Community copy is not automatically public. Public projections expose display text without unnecessary audit actor IDs. Owners and explicitly authorized admins may edit copy without having a community account; enforce authorization and actor attribution at the backend. See [customization permissions](04-auth-and-multi-tenancy.md#community-customization-permissions).

### Settings and boundaries

Add `tenant_settings` as a one-to-one operational configuration table. Use explicit typed columns rather than an unrestricted key/value or JSON configuration store for operational or authorization rules. Its initial fields are:

| Column | Requirement / purpose |
| --- | --- |
| `tenant_id` | Primary key and FK to `tenants` |
| `auto_approve_users` | Boolean, not null, default `false`; controls initial approval of new community accounts |
| `created_at`, `updated_at`, `created_by`, `updated_by` | Standard audit fields |

Create the settings row in the same transaction as the tenant and owner assignment. New community accounts start as `pending` when `auto_approve_users = false` and `approved` when it is true. The creator's optional community account is automatically approved during tenant creation regardless of this setting. Approval does not grant paid membership benefits. Changing the setting affects future joins only; it does not approve existing pending accounts or reinstate suspended/removed accounts. Initially, only the owner may change this setting; permission to approve individual users does not grant permission to change tenant settings.

Add `can_approve_users` to `tenant_staff_assignments`: boolean, not null, default `false` for admins. An active admin with this flag may approve pending community accounts in the same tenant. This permission does not grant suspension/removal, reinstatement, staff assignment, permission editing, or entitlement management. The owner controls grants of this flag to admins.

Add `can_create_admin` to `tenant_staff_assignments`: boolean, not null, default `false` for admins and always `true` for the owner. Creating an admin assignment or issuing an admin invitation requires an active same-tenant staff assignment with this permission. New admins receive all-false permissions under the initial policy, not the creator's permissions. This flag does not authorize permission grants/edits, ownership changes, or removal of staff. Invitation redemption must use trusted invitation data and validate the recipient, tenant, expiry, one-use status, and issuing authority atomically; it cannot accept arbitrary roles or permissions from the recipient. Invitation delivery/UI details remain to be specified.

For the initial implementation, every administrative permission defaults to `false` for non-owner staff, not only `can_approve_users`. The admin role alone grants no administrative capability; each action requires its explicit permission. Future permission flags follow the same default. A later community-staff configuration UI will allow the owner to choose tenant-specific default permissions for new admins and customize individual admins' permissions. These configurable defaults and their persistence model are deferred; do not add speculative columns or tables for them in the first migrations. Defaults for new admins must not silently rewrite existing admins' individual grants.

All administrative permission flags, including `can_approve_users`, `can_create_admin`, and any future flags on staff assignments or related permission tables, must initialize to and remain `true` for the owner. Owner creation sets all such permissions to true atomically; the future ownership-transfer command must do the same. Enforce this invariant in the database as well as authorization code: reject false/null owner permissions and prevent deletion of required owner permission records. New permission migrations must initialize existing owners to true and extend enforcement; admin defaults remain false. A blanket `DEFAULT false` alone does not implement role-dependent owner defaults. Other detailed administrative permissions remain to be defined.

Keep domain configuration in its existing home: staff authority in `tenant_staff_assignments`, prices and benefits in `membership_plans`, individual access in `membership_entitlements`, event admission/pricing in event tables, and competition rules in `championship_rules`. Do not duplicate these in tenant settings. Defer branding tables, custom domains, localization, content revisions, and draft/publish workflows until selected features require them.

## Identity and entitlement

| Table | Main fields / invariant |
| --- | --- |
| `tenants` | Identity, primary location, timezone, operational status, and standard audit fields as defined above |
| `tenant_website_content_overrides` | Composite PK tenant/content key; validated text overrides for application-defined website slots |
| `user_accounts` | Auth user PK/FK and standard audit fields only for the initial milestone; self-only; preferences deferred until concrete requirements exist |
| `tenant_staff_assignments` | Composite PK tenant/user; FK to global user account; role (`owner`/`admin`), active/revoked status, `can_approve_users`, `can_create_admin`; all owner administrative permissions true; independent of community participation |
| `tenant_settings` | PK/FK `tenant_id`; `auto_approve_users` boolean, not null, default false |
| `community_accounts` | Composite PK tenant/user; participation standing (pending/approved/suspended/removed); includes nonpaying users; does not store staff authority |
| `community_account_profiles` | Composite PK/FK `(tenant_id, user_id)` to `community_accounts`; `display_name`, nullable `bio`, and standard audit fields; in scope for the first migration milestone |
| `interests`, `profile_interests` | Tenant-scoped tags and unique user/tag assignments |
| `membership_entitlements` | Tenant/user, status, effective start/end, source, granting actor, reason; membership access independent of payment |
| `membership_plans` | Tenant, name, proposed price/currency, benefit configuration; version relevant commercial terms |
| `payment_records` | Tenant/user, purpose, amount/currency, reference, pending/verified/rejected/refunded status, verifier and timestamp |

### Initial account and profile scope

The first migration milestone includes `user_accounts`, `community_accounts`, and the adjacent `community_account_profiles` table. Global accounts contain the Auth identity reference and standard audit fields only; Auth remains authoritative for credentials and login identity details. Do not add speculative preferences or duplicate community display data on the global account.

Use `community_account_profiles` as the canonical name, replacing the earlier conceptual `profiles` label. It has at most one row per community account, with a composite primary/foreign key `(tenant_id, user_id)`, a required nonblank `display_name`, nullable `bio`, and standard audit columns. A global user may have different display names and bios in different communities. A community account may exist before profile setup; an owner/admin without a community account has no community profile. Defer photos, profile location, experience, play style, teaching flags, and interests until their features are implemented. Profile presence never grants approval, staff authority, or membership benefits. Profile reads remain subject to the existing private-directory rules rather than becoming public through this initial table.

Future releases will provide an interface for community-account holders to opt in to sharing a selected subset of profile data on community pages and in searches. Audience-specific visibility controls, potentially distinguishing fellow community members from non-members, are a future design consideration; exact flags and audience semantics are not yet settled. This feature is outside the initial migration milestone. Do not add speculative sharing columns/tables or expose profile data through public tenant lookup. Initial profile creation does not imply consent to public sharing; existing private-directory rules remain in force until an explicit sharing model is implemented.

Canonical identity and ownership rules:

- Global account creation does not require a tenant, community account, or profile. A staff assignment references `user_accounts` directly and never requires a corresponding `community_accounts` row.
- The user account that creates a tenant automatically becomes its owner. Create the tenant and its active owner assignment in one transaction.
- Each tenant must have exactly one active owner; multiple simultaneous owners are not allowed. Other active staff assignments may be admins. User approval is governed by `can_approve_users`, and admin creation/invitation by `can_create_admin`; other detailed admin privileges will be delineated later.
- Enforce at most one active owner per tenant with database uniqueness. Controlled lifecycle commands must also enforce the existence of that owner during staff revocation and account deletion. Ownership is immutable after tenant creation in the initial version; do not expose a transfer command or UI yet. Ownership transfer is planned for a later version and must atomically replace the owner rather than add a co-owner, preserve all owner permissions, and retain owner protections under concurrency.
- An admin may never remove or block the owner from that tenant, including by demoting, revoking, suspending, or deleting the owner's assignment. An admin may also never remove or block the community account associated with that same tenant's owner, including suspension or an equivalent access-denying standing change. Enforce these protections using the current tenant owner on every applicable write path.
- During tenant creation, joining as a community participant is optional. Opting in creates a community account linked to the same global user; opting out creates neither a community account nor a profile and does not affect ownership. Participation benefits still require an explicit entitlement. See the [onboarding and role rules](04-auth-and-multi-tenancy.md).

Proposed entitlement states follow the brief: active, trial, past_due, grace_period, canceled, expired. State names alone do not define access; a policy must specify effective dates and eligible states. Avoid ambiguous overlapping effective grants or define deterministic precedence. Never let browser writes grant access or verify payment.

Payment purposes must reference a concrete membership period, official reservation, or championship entry through validated relationships, not an unchecked free-form resource ID. Money collected and access granted are separate facts.

## Activities, locations, and seats

Proposed shared `activities` root contains scheduling and seat state for official events and member tables. Separate one-to-one detail tables preserve their different rules. A trigger/controlled creation command enforces exactly one matching subtype and immutable kind. This design is provisional; a migration review can choose separate roots if that is simpler without losing invariants.

| Table | Main fields / invariant |
| --- | --- |
| `activities` | Tenant, kind official/member_table, title, starts/ends, timezone, capacity, draft/published/cancelled/completed, creator |
| `official_events` | Activity PK/FK, event type, featured game label, member-included flag, guest eligibility, guest/special price, optional early-access terms |
| `meet_play_tables` | Activity PK/FK, host, game/activity label, category, experience, beginner-friendly, instant/request join mode, description |
| `activity_locations` | Activity FK, public/private type, safe label and general area; public venue details only if genuinely public |
| `private_location_details` | Activity FK, exact address and directions; separately protected; no broad API joins |
| `seat_participations` | Unique tenant/activity/user; requested, waitlisted, offered, payment_pending, confirmed, declined, cancelled, expired; queue time, offer expiry, confirmation time |
| `admission_clearances` | Tenant/activity/user, admission basis (member/paid/comp), linked verified payment or entitlement, approver/time; no self-approval |
| `attendance` | Unique activity/user; attended/no_show/excused and recorder; separate from reservation status |
| `matchmaking_requests` | Tenant/user, availability, preferences, status, assigned admin, suggested activity; proposed manual matching |

Unified participation rows represent reservations, seat requests, and waitlist entries, avoiding duplicate capacity claims across separate tables. Exact state transitions are in the backend plan. Waitlist claims and payment holds must have an explicit capacity effect. MVP proposal: unexpired offers reserve capacity; payment_pending reserves only when a bounded hold is explicitly created. Requested/waitlisted rows do not occupy seats.

Home lists only published official activity records. Member tables and their host/availability data cannot leak through the shared root. Do not expose a generic activity listing without kind-specific policies.

Member hosts need an explicit participation record for chat/address access; product decision required on whether they count toward advertised seats. Private-address reads require host, confirmed participant, or authorized tenant admin; pending payment/request/offer/waitlist is insufficient.

## Chat, Community, trust, and notifications

| Table | Main fields / invariant |
| --- | --- |
| `table_messages` | Tenant/member activity, author, body, timestamp, moderation state; confirmed participants/host only |
| `table_chat_lifecycle` | Activity PK/FK, read-only/archive timestamps; configurable retention policy |
| `community_topics`, `community_posts`, `community_comments` | Tenant, author, topic/parent, body, moderation state; member access |
| `notifications` | Tenant/recipient, safe type/resource reference, read state; self-only; no exact address or private message preview by default |
| `notification_jobs` | Durable delivery/outbox, deduplication key, attempts, next attempt; trusted worker only |
| `reports` | Reporter, target, reason, status; optional MVP extension, restricted to reporter and authorized moderation |
| `member_blocks` | Unique tenant/blocker/blocked pair; optional extension pending interaction rules |
| `community_standards_acceptances` | Tenant/user/version/time; proposed launch safeguard |
| `tenant_admin_actions` | Tenant-scoped append-only actor/action/target/reason/time and safe metadata; owner-only reads initially; no admin audit-read permission yet |

Table chat is MVP. Broad DMs are not. Reports/blocks are proposed additions, not silently mandatory from the handoff. Content removal and suspension are required admin capabilities, subject to the canonical owner protections above; detailed admin privileges remain to be delineated. Keep no-show records internal; avoid public person scores.

## Championship

| Table | Main fields / invariant |
| --- | --- |
| `championships` | Tenant, featured game label, period, registration window, status, nonmember entry price, current rules version |
| `championship_rules` | Immutable version, validated scoring parameters, counting limits, tie rules, finalist count |
| `championship_entries` | Unique tenant/championship/user; pending/eligible/withdrawn/disqualified; admission basis and verified payment if needed |
| `championship_matches` | Tenant/championship, played_at, optional member-table link, submission state, current result version |
| `match_result_versions` | Match/version, submitter, notes, rules version, pending/confirmed/disputed/void status; preserve corrections |
| `match_players` | Version/user, score, placement, winner flag; participant references championship entry |
| `match_confirmations` | Unique version/confirmer, confirm/dispute and timestamp; eligible non-submitter participant |
| `championship_finals`, `finalists` | Competition, official activity link, finalist entries, final status/prize/results |
| `achievements` | Unique tenant/competition/user/achievement kind, award evidence; permanent unless authorized correction |

Qualifying matches can occur anywhere; no member-table link is required. Nonmember entrants can submit/confirm through Championship without private-network access. Competition participation must not expose an entire private profile directory.

Standings should initially be derived from confirmed, nonvoid current result versions and the applicable rules, or stored as a rebuildable projection. They are never client-editable. Disputes/corrections invalidate affected results and rebuild standings. Final awards need a controlled finalization step with correction audit.

The first ruleset must settle confirmation quorum, deadlines, repeat opponents, tie handling, limits, and finalist selection. Preserve configurability through versioned validated parameters, not executable user-provided scoring code.

## Constraints and indexing

- End time after start; positive capacity; nonnegative amounts; valid currency; offer expiry after creation.
- Atomic capacity checks include confirmed seats plus unexpired holds. All join/accept/claim/cancel/capacity-edit paths share a locking protocol.
- No duplicate seats, payment application, championship entry, result confirmation, or notification delivery effect.
- Clients cannot rewrite tenant, kind, owner, staff role, entitlement, verified payment, or protected state.
- Index staff-assignment/owner checks, community-account/entitlement checks, activity browsing by tenant/kind/status/time, participation by activity/state and user, FIFO queue ordering, message pagination, championship result state, and notification recipient.
- Check actual query plans; index foreign-key access paths and deterministic queue ordering (time plus ID).
- Lists explicitly omit exact address data; protected address access is verified separately.

## Migrations, lifecycle, and analytics

Suggested sequence: identity/tenant/entitlement → activity subtypes/location separation → participation/admission/waitlist → chat/notifications → championship → Community/moderation/profile statistics. Every exposed table ships with grants, policies, and role tests.

Use two tenants and sample nonmembers, active/expired/suspended members, hosts, admins, and paid championship-only entrants. Seed fake addresses and manual payment records, never real home data.

Attendance supports distinct co-players and engagement metrics; deduplicate pairs per community and avoid counting reservations/no-shows as played games. Verified payment records support paid-member/revenue reporting; complimentary grants do not create MRR.

Archive events/tables and preserve result/audit history. Decide account anonymization, chat/message retention, address deletion after an activity, and championship retention before production. Avoid broad deletion cascades until these rules are approved. Generate frontend database types from migrations and test both clean installs and upgrades.
