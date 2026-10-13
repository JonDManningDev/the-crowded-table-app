# Database schema plan

Status: initial auth/account/tenant migrations are implemented in `supabase/migrations/`; broader domains remain unimplemented. Accepted event/table decisions below are distinguished from remaining relational proposals. See [database implementation and validation](../supabase/README.md) for executable contracts and local setup. Deployment to a hosted database remains a separate step.

Current planning scope (2026-10-12): payments and paid memberships are deferred until one of the last implementation stages. Until then, app behavior has no fees, checkout, manual payment verification, paid entitlements, or membership gates. Community accounts, standing, tenant permissions, privacy, and resource registration remain required. Historical commercial tables/rules below are future-only; legacy prototype payment/member simulations are not the target behavior.

## First migration milestone

Include `user_accounts`, `tenants`, `tenant_settings`, `tenant_staff_assignments`, `community_accounts`, `community_account_profiles`, `tenant_website_content_overrides`, and `tenant_admin_actions` (canonical name replacing the conceptual `admin_actions`). Include constraints, indexes, audit handling, Auth signup provisioning, grants/RLS, controlled commands, and authorization tests with these tables.

- Implement tenant creation with its owner/settings and optional approved creator participation; public lookup by slug; owner-managed tenant details/settings, archive/restore, and website-copy overrides; community joining/approval; self-profile reads/edits; admin assignment; and an owner-only command to edit the two initial admin permission flags. The permission configuration UI and configurable new-admin defaults remain deferred.
- Owners select new admins from existing same-tenant `community_accounts` linked to verified global users. The backend enforces this selection boundary; arbitrary global users or other tenants' accounts are not eligible through this initial command. The established `can_create_admin` permission also permits delegated admins to use this controlled assignment operation. New assignments receive all-false permissions and do not change the target's community standing or entitlements. Existing assignments must not be silently overwritten by repeated creation requests.
- This is an initial onboarding restriction, not a new foreign key from staff assignments to community accounts. Staff authority remains independent of participation, including for owners without a community account. Admin invitations, delivery, redemption, related tables, and UI are follow-up work.
- Profile access is self-only initially, except for the narrow administrative selection/approval projections defined in the auth plan. No fellow-member directory or public profile access ships before the relevant community-access/sharing policies. Include website-copy persistence with owner-only editing initially; broader admin editing requires future explicit permission flags.
- Implement joining and pending-account approval. Retain the defined standing values, but defer suspension/removal/reinstatement commands. Rejoining must never reset an existing account's standing. Finalize slug syntax, reserved names, and text limits during implementation alongside routing.
- Defer membership/payment/event tables and dependent features. SMTP, production callback destinations, and recovery screens do not block migration authoring, but must be configured/tested before signup is operational.

## Conventions and tenant boundary

Propose community = tenant. Every business table carries `tenant_id`; global auth/account identity is an explicit exception. Use UUID IDs, database-managed timestamps, `timestamptz` instants, and an IANA community timezone (proposed launch value `America/Tegucigalpa`). Use HNL minor units for monetary values, with currency stored explicitly. Prices are configurable.

All cross-entity references within a tenant use composite foreign keys to matching unique keys, such as `(tenant_id, event_id)` or `(tenant_id, table_id)`. RLS controls access; these constraints prevent structurally invalid cross-tenant references.

### Canonical naming and audit conventions

- Table names are always plural and `snake_case`. Column names are always `snake_case`.
- A child table uses a singular prefix based on its parent entity: `tenants` → `tenant_staff_assignments`, `tenant_website_content_overrides`; `tables` → `table_locations` → `table_location_details`. Apply this consistently when finalizing the physical schema; older conceptual table labels below and elsewhere in the planning docs must be reconciled before migrations, not treated as naming exceptions.
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

Keep domain configuration in its existing home: staff authority in `tenant_staff_assignments`, future prices/benefits in deferred `membership_plans`, future paid access in deferred `membership_entitlements`, event registration in event tables, and competition rules in `championship_rules`. Do not duplicate these in tenant settings. Defer branding tables, custom domains, localization, content revisions, and draft/publish workflows until selected features require them.

## Identity and entitlement

The membership/payment rows in this section are retained future proposals, not prerequisites or access checks for current domain work.

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
| `membership_entitlements` | Deferred: tenant/user, status, effective dates, source, granting actor/reason; no current access dependency |
| `membership_plans` | Deferred: tenant, name, price/currency, future benefit configuration and commercial versioning |
| `payment_records` | Deferred: tenant/user, purpose, amount/currency, reference, verification/refund lifecycle, verifier/timestamp |

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
- During tenant creation, joining as a community participant is optional. Opting in creates a community account linked to the same global user; opting out creates neither a community account nor a profile and does not affect ownership. Participation currently depends on community standing and resource-specific authorization, with no paid entitlement requirement. See the [onboarding and role rules](04-auth-and-multi-tenancy.md).

Deferred commercial proposal only: entitlement states from the original brief are active, trial, past_due, grace_period, canceled, expired. State names alone do not define access; a policy must specify effective dates and eligible states. Avoid ambiguous overlapping effective grants or define deterministic precedence. Never let browser writes grant access or verify payment.

When payment work begins, payment purposes must reference a concrete membership period, official reservation, or championship entry through validated relationships, not an unchecked free-form resource ID. Money collected and access granted are separate facts.

## Events, tables, locations, and seats

Current direction: events and tables are distinct business concepts, clarified by the user on 2026-10-12. This replaces the proposed `activities` root and its `official_events` / `meet_play_tables` subtypes. These domains are not yet implemented in migrations. Physical fields/child tables below remain proposals where marked; championships are outside this redesign and retain their existing tentative section pending separate review.

A table is an individual scheduled game session with a fixed seat capacity. An event is a gathering that may contain zero or more tables, including gatherings without games. Recommended initial cardinality: a table stands alone or references one same-community event through nullable `event_id`; no junction table unless a concrete many-to-many requirement arises. Event attendee capacity is independent of the sum of its table seats. Organizer/host relationships are distinct from standard audit actors.

### Confirmed participation and control rules

- Events published to the community are visible to anyone viewing that community, including visitors. This does not publish invite-only events, private invitations/tables, restricted profile data, or exact private addresses. Sponsorship and audience are separate dimensions; user-published events need not be community-sponsored.
- Participating account holders must have an approved, non-banned same-community account. Current standing values are `pending`, `approved`, `suspended`, and `removed`; suspended/removed accounts are ineligible. No separate ban flag is introduced by this decision. Admission, capacity, and event registration checks still apply; paid memberships and payments do not participate in current eligibility.
- An approved account holder may register guests without registering themselves for the event or table. Guest names are optional. The sponsor is the accountable booking user and need not attend or play; sponsorship alone consumes no attendance capacity or table seat. Community/table policies and enforcement about sponsor attendance remain outside current app functionality. `tables.allow_guests` is a non-null boolean, default `true`; false prevents new guest bookings without changing existing ones. Every attending guest occupies capacity. Use one event registration per attendee and one table participation per person, with the booking account tracked separately.
- No seating at an event-associated table without approved event registration covering the people being seated, including guests. A guest-only booking must not require or create an attending registration for its sponsor. Explicitly cancelling an attendee's event registration clears that attendee's associated table reservations, including guest seats attached to the cancelled registration; registration cancellation and seat release must be coordinated atomically. Cancelling the event itself leaves all registration/participation rows unchanged. Invitation acceptance alone must not bypass registration approval or seat availability.
- Groups must be accepted together in one atomic transaction. Event registration approval and table acceptance validate every person in the submitted group and the full required capacity; accept everyone or no one. Individual records do not permit partial group acceptance, including automatic queue promotion and manual table-manager approval.
- Only event organizers may add tables to their events initially. Staff management or private-view permission alone does not make someone an organizer.
- `can_manage_events` permits cancellation of events published to the community by community account holders, replacing the former deletion-only operation; there is no hard delete. It permits no other changes to those users' events. Management of community-sponsored events is a separate scope. Do not infer edit/reassignment/table-creation or archive authority from this cancellation capability.
- `tenant_staff_assignments.can_see_private_events` grants community-scoped visibility into private events, invitations, tables, and table chat messages for management awareness. It defaults false for non-owner staff and follows the existing always-true owner invariant. It grants read access only, including chat bodies; no posting/change/delete/participation authority. It explicitly excludes private addresses: `event_location_details` and `table_location_details` still require separate address authorization.
- `community_accounts.allow_private_invitations` is a non-null, recipient-controlled boolean, default `true`. Disabling it prevents new invitations only; existing pending invitations and accepted participation are not revoked by the preference change. Ordinary expiry, revocation, standing, and admission checks still apply to existing invitations.

### Relational structure

Use singular parent prefixes on plural child names and same-tenant composite foreign keys throughout. The per-person registration/participation structure and atomic group acceptance are accepted decisions; supporting group tables and exact DDL remain implementation recommendations.

| Table | Main fields / invariant |
| --- | --- |
| `events` | Tenant, title/description, organizer, schedule/timezone, lifecycle including `cancelled` and `archived`, sponsorship, visibility, optional attendance capacity, admission/join policy; retained cancellation/archive metadata as proposed below; no hard delete; other lifecycle enum values remain to finalize |
| `event_registrations` | One attendee per row: event, booking account, nullable attending account, optional guest name, registration status, optional registration-group FK; the stable ID identifies even an unnamed guest |
| `event_registration_groups` | Recommended group identity: tenant/event, booking account, submission/retry identity and server-assigned queue order where event capacity requires waiting; member registrations retain their own rows; group carries no attendee capacity itself |
| `event_invitations` | Event, inviter, recipient, invitation state, expiry/response timestamps; preserve existing invitations when recipient disables new ones |
| `event_locations` | Event FK, safe label/general area and public/private classification |
| `event_location_details` | Event-location FK, separately protected exact address/directions |
| `tables` | Tenant, optional event FK, host, game/session title, schedule/timezone, seat capacity, lifecycle, `manually_confirm_seats` non-null boolean default false, experience/beginner information, `allow_guests` default true |
| `table_participations` | One person per row through requested/waitlisted/confirmed/rejected/cancelled states; table, booking account, optional participation-group FK; event tables reference the occupant's exact event registration; standalone tables store attending account/optional guest name directly; no current offered/payment-pending/expired reservation states |
| `table_participation_groups` | Recommended group identity: tenant/table, booking account, submission/retry identity, request revision, server-assigned queue timestamp/order; atomic group decisions with no seat of its own |
| `table_participation_decisions` | Recommended append-only decision history for a request/group revision and its affected participations: tenant/table, approve/reject, server timestamp, deciding global user, optional rejection reason; retain after queue removal/rebooking |
| `table_locations` | Table FK and safe location summary for standalone tables or an explicit event-location override |
| `table_location_details` | Table-location FK, separately protected exact address/directions |
| `event_attendance`, `table_attendance` | Actual attendance, distinct from reservations; link to the corresponding per-person registration/participation so unnamed guests can be recorded without a community account |
| `event_admission_clearances`, `table_admission_clearances` | Deferred commercial proposals; no payment/entitlement clearance tables or checks in current event/table implementation |
| `matchmaking_requests` | Tenant/account, availability/preferences, status, assigned admin, suggested table; existing manual matching proposal |

Recommended location behavior: an event-associated table uses its event's location unless explicitly overridden. Resolve inheritance through the event relationship rather than copying private addresses. Standalone tables have their own location. Neither public event discovery nor a table's parent link grants private-address access.

### Per-person registration and participation — accepted structure

The existing `community_accounts` key is `(tenant_id, user_id)`. Use `booked_by_user_id` and `attendee_user_id` below as the physical column names for the booking/attending community-account references discussed with the user; both use composite foreign keys with `tenant_id` to `community_accounts`, not unscoped global-user references. No new surrogate community-account ID is required. Booking responsibility is distinct from the standard audit actor fields.

| `event_registrations` field | Meaning / invariant |
| --- | --- |
| `id`, `tenant_id`, `event_id` | Stable per-attendee registration ID within one same-community event |
| `booked_by_user_id` | Required accountable booking account; may have no attending registration of its own |
| `attendee_user_id` | Nullable attending account; null means this registration represents a sponsored guest |
| `guest_name` | Optional guest display name; null for an account-holder attendee; never an identity or matching key |
| `status` | This attendee's registration state; approved before any associated table seating; exact enum remains to finalize |
| `event_registration_group_id` | Recommended nullable FK to the submitted registration group; null for an individual request |

For self-registration, booking and attending accounts match. Guests each receive their own registration ID even when unnamed; suggested display labels such as "Guest 1" are presentation only. A guest-only request creates no sponsor attendee row. Guest identities stay within their event or standalone table; no reusable guest directory or separate guest child table is needed. These fields do not grant authority to register arbitrary other account holders.

Every `table_participations` row has `id`, `tenant_id`, `table_id`, `booked_by_user_id`, `status`, and, for grouped requests, a recommended `table_participation_group_id`. Its occupant comes from exactly one of two paths:

- Event-associated table: `event_registration_id` is required and references this person's registration in the table's own event and tenant. Take attending account/guest name from that registration; do not duplicate them in the participation. Keep the participation's booking account consistent with the registration's booking account. A registration can be referenced by multiple tables in the event, but only once per table; any schedule-conflict rule is separate.
- Standalone table: `event_registration_id` is null; `attendee_user_id` and nullable `guest_name` identify the person directly using the same account-holder/guest rules. The booking account remains separate and need not occupy a seat.

Enforce one registration per `(tenant_id, event_id, attendee_user_id)` for non-null attending accounts, one participation per `(tenant_id, table_id, event_registration_id)` for event tables, and one participation per `(tenant_id, table_id, attendee_user_id)` for non-null standalone attending accounts. Reuse the person's lifecycle row on cancellation/rebooking rather than duplicating it. Do not make the booking account unique per resource: one sponsor can book several guests. Unnamed guests use stable row IDs; retried submissions must reuse those rows through idempotency, not name matching. Enforce the event/standalone shape and matching table/event/tenant through constraints and controlled commands, including any later parent reassignment.

Count each confirmed participation as one seat. Requested/waitlisted/rejected/cancelled rows consume none. Event capacity counts approved per-attendee registrations separately from table occupancy. Group records and nonattending sponsors consume no capacity. There are no seat offers, response deadlines, or offer/payment holds in the initial implementation. A host's organizing authority does not by itself establish whether they are playing or occupy a seat. Separate numbered-seat records are unnecessary unless actual seat positions become a requirement.

### Atomic group acceptance

Persist group membership so confirmation cannot select a convenient subset. The recommended group records above have same-tenant/resource/booking-account constraints on their member rows. A group is a particular submitted request, not every booking ever made by its sponsor. Event registration groups and table participation groups are separate: approved event attendees may choose different tables or no table at all.

Lock the group and relevant registration/capacity rows, validate every member's current eligibility and, for event-table seating, their event approval, and check capacity for the full group before committing confirmation. Withdrawn, cancelled, and rejected requests cannot be promoted. On failure no member becomes newly approved/confirmed and no capacity is consumed. Serialize edits, withdrawal, manager decisions, and automatic promotion; stale request revisions and retries must not confirm an old group or restore a terminal request.

Cancelling one attendee's event registration releases that attendee's linked table participations; an explicit group cancellation covers all selected registrations and linked seats in one transaction. A sponsor's own registration is not a parent of their guests' registrations.

### Automatic and manual seat confirmation

`tables.manually_confirm_seats` is a non-null boolean with default `false`. Both configurations are in the initial scope:

- False: handle reservation requests immediately in receipt order, subject to current eligibility and capacity. Automatically confirm the earliest eligible whole group that fits and has not withdrawn. Queued groups are reconsidered when relevant capacity or eligibility changes.
- True: authorized table managers review queued requests and may approve, reject, or notify the booking account about an issue as they see fit. Manager selection is discretionary; approving a chosen group must still satisfy same-tenant/event eligibility, full capacity, and atomic group confirmation. Capacity becoming available alone does not auto-approve a manual table.

Switching an existing table from manual to automatic confirmation requires a confirmation modal explaining that queued requests will be processed automatically in receipt order as eligibility and available seats allow. **Continue** triggers the switch to `manually_confirm_seats = false` and processes the existing queue using the same whole-group allocation rules as new automatic requests. Preserve current queue timestamps, including any reset by an earlier group addition; skip groups that do not fit without splitting them or changing their priority. **Cancel** closes the modal and leaves `manually_confirm_seats = true`; opening or dismissing the modal performs no mutation or confirmation. See the [frontend interaction plan](05-frontend-patterns.md#forms-and-seat-actions) and [transaction plan](06-backend-patterns.md#confirmation-modes-and-group-transactions).

A successful approval/automatic promotion is final confirmation. The booking account does not need to accept it again. No current seat-offer state, response/claim deadline, reservation expiration timer, or payment window exists. Optional recipient-confirmed offers may be designed later; they are not a dependency of this version. Registration approval for the parent event still precedes event-table seating; this table flag does not redefine event-level organizer approval.

Rejection removes the complete rejected request from all active queue queries and future promotion. Preserve rejected per-person records and decision history rather than erasing the evidence needed for the registering user. Record the rejecting global user, server decision timestamp, and optional reason for the request/group revision. A new attempt requires an explicit new submission/revision and new queue timestamp; reusing lifecycle rows must preserve prior immutable decisions. An issue notification leaves the request pending and creates no response deadline or implicit rejection.

Publish approval/rejection decisions to the booking account promptly when the transaction commits. Rejection notices include the timestamp, rejecting user's safe display identity, and reason when supplied. Use a narrow authorized decision projection, not general staff profile/email access. The notification and decision must be durable together; no notice may claim success before commit. External delivery channels remain separate implementation choices.

### Pending-group edits

| Edit | Accepted behavior |
| --- | --- |
| Add/correct an optional guest name | Keep the request's queue position; this does not change seat demand. |
| Remove someone from a waiting group | Reduce requested seats and keep the remaining group's queue position; removing everyone withdraws the request. |
| Add someone to a waiting group | Give the enlarged group a new server queue timestamp. Explain the loss of the old priority before saving; revalidate new guest eligibility and `allow_guests`. |
| Change a group with a seat offer, if that future option is introduced | Revalidate the offer and its reserved capacity; an old offer must not confirm the previous group. This is a deferred compatibility rule, not a current offer workflow. |

Apply edits transactionally to the group and affected per-person rows, increment the request revision, and re-evaluate the current group's eligibility/capacity. Automatic tables may confirm the edited group when its queue turn and capacity allow; manual tables still require a manager's decision. No stale approval may accept only the old membership. A name edit alone does not reset queue priority or create an extra seat.

### Queue order when groups do not fit

The standard automatic policy is first-come, first-served among eligible queued requests that fit available capacity. Scan in current queue order and select the earliest whole group that fits. Skip groups that need more seats, preserving their queue position and pending state; do not split or cancel them. Voluntary additions reset priority under the edit rules above; being skipped does not.

After each atomic confirmation, recalculate available seats from confirmed occupancy. Store server-assigned queue time with a stable tie-breaker (recommended: queue time plus request/group ID). New arrivals must not bypass an earlier eligible request that fits. Ordinary standing and event-approval checks still apply, with no payment or membership checks.

For example, with three seats available and queued groups needing four, two, and one seats in order, automatically confirm two, then one. The four-person group retains its position and is reconsidered when enough seats become available. Do not prefer a later fitting group merely to maximize occupancy. Manual tables can show this queue ordering to managers, but their explicit approve/reject/issue-notification decisions govern confirmation.

### Disabling guests and removing existing bookings

Changing `tables.allow_guests` to false changes the rule for new bookings only. It does not modify existing participations, groups, or event registrations, and does not release capacity. Existing requested/waitlisted/confirmed bookings continue under their ordinary rules; the changed flag alone does not invalidate them. Creating a new guest participation or resubmitting a cancelled/rejected one requires the flag to be true. An existing event registration alone does not authorize a new guest booking at a table that now disallows guests.

When an authorized table manager disables guests, the UI identifies which current table bookings are for guests and offers an optional selection interface to remove them. Keeping all bookings or dismissing the prompt changes none of them. With no guest bookings, show that fact and no removal action. The standard table-management UI always supports explicitly removing guest bookings, regardless of the current flag. See the [frontend interaction plan](05-frontend-patterns.md#table-guest-management).

Removal is a separate, explicit table-management command targeting selected `table_participations`. Preserve cancellation history and release their seats through the normal lifecycle. For event-associated tables, do not cancel the referenced `event_registrations` or the guest's reservations at other tables; event-attendance cancellation is a separate action with broader consequences. Explicit cancellation of selected people is compatible with atomic group acceptance: revalidate affected pending groups under the applicable automatic/manual mode without confirming a stale group or cancelling unrelated attendees. The flag edit itself never triggers this cleanup.

### Permission and preference ownership

The proposed additions are `can_manage_events`, `can_manage_community_permissions`, and `can_see_private_events` on `tenant_staff_assignments`; all default false for non-owner staff and remain true for owners. `can_post_public_events` is a participant permission, proposed as an explicit field on `community_accounts`, default false. It permits user-organized publication to the community. `can_manage_community_permissions` permits granting/revoking participant permissions such as this one, not staff permission editing or self-escalation. Existing owner-controlled staff grants remain unchanged.

Private event sharing requires no special posting permission. The recipient's `allow_private_invitations` preference is self-controlled and must have a separate authorized update path from staff-controlled participant permission grants. Staff authority remains independent of having a community account; a staff member wishing to participate is subject to participation rules.

### Event cancellation and archival — accepted rules

Events are retained; there is no hard-delete operation. All events can be cancelled. A cancelled event becomes eligible for `archived` status if it had no registrations when cancellation occurred, or once it has remained continuously `cancelled` for at least 30 days. Eligibility does not itself specify automatic archival or who performs it. Evaluate the no-registration condition at cancellation time, not by looking at rows later. The precise treatment of previously withdrawn/rejected registrations in this condition remains to settle.

Cancelled events remain visible to community users, at least through a Cancelled filter in event lists. Archived events are visible only to same-community staff; the Archived filter appears only to those staff. Enforce archived access on the backend, including direct links and personal feeds, not only by hiding the filter. A non-staff organizer or past attendee does not gain archived-event access from that relationship alone. How these visibility rules intersect with private-event audiences and `can_see_private_events` remains an explicit follow-up; cancellation must not silently be implemented as a privacy change while that interaction is unresolved.

On event cancellation, notify users with any queued or confirmed event registration. Capture the qualifying registrations at the cancellation transaction; retain a durable notification containing basic event identification, server cancellation timestamp, cancelling user's safe display identity, and the optional reason when supplied. Notification delivery must not depend on rewriting registration statuses. Recommended recipient mapping includes the booking account for sponsored guests and any distinct registered account holder, deduplicated per event cancellation/user; guest records do not create notification accounts. Exact recipient expansion beyond registered users is still a design recommendation.

Cancelling an event or table must not modify its `event_registrations` or `table_participations` rows, including their statuses or audit timestamps. They retain the recorded requests and confirmations. This is distinct from someone explicitly cancelling an individual registration/participation: the existing rule releasing that attendee's linked seats still applies to that separate operation. Archive retains the same records. Payment/refund handling remains out of scope.

Recommended physical fields on `events`: `cancelled_at`, `cancelled_by`, optional `cancellation_reason`, a snapshot of the agreed no-registration predicate at cancellation, plus `archived_at` and `archived_by`. Use server instants and global-user actor references under the audit conventions; archiving must not overwrite the cancellation timestamp/actor/reason. The standard `updated_at`/`updated_by` pair alone is insufficient for this history. Keep these fields protected behind authorized lifecycle commands. Add equivalent table cancellation metadata when its lifecycle policy is finalized.

Recommended operational rule: derive whether participation is active from the resource and its parent event as well as the retained per-person status. A cancelled/archived event blocks new registrations, invitations/acceptance, attached-table bookings, approvals, and queue promotion; a cancelled table blocks its own seat actions. Remove these gatherings from upcoming participation, recommendations, actionable queues, and scheduled reminders without altering booking rows or treating them as no-shows. Serialize lifecycle changes with registration/seat commands so a stale request cannot confirm after cancellation. The following questions distinguish this recommended behavior from the accepted storage rule.

### Follow-up design questions

- Child tables: should they retain their own lifecycle and derive unavailability from the cancelled/archived parent? Recommended yes; no child-table status cascade or automatic conversion to standalone tables. Confirm whether independently cancelled tables follow the event's archive eligibility/visibility rules.
- Authority: the former deletion-only power for public user events now means cancellation only. Who may archive, and should eligibility trigger archival automatically or enable an explicit action? Recommended explicit archival by the organizer or appropriately authorized manager; staff read access alone grants no write authority.
- Privacy: does cancelled visibility preserve each private event's original audience, and must archived private-event reads still require `can_see_private_events` or prior authorized access? Recommended yes to both; also settle anonymous access to cancelled community-public events. Archival itself always excludes non-staff.
- Empty-event eligibility: does "no registrations" mean no registration rows at all or no queued/confirmed rows? Recommended no rows of any status at cancellation, so previous registrants retain the 30-day visibility period.
- Reopening: may cancellation or archival be reversed? Recommended no initial reopening; create a replacement gathering and require fresh bookings so preserved confirmations cannot silently resume. Do not infer a restoration command from tenant archive/restore.
- Communication and access: confirm table-cancellation recipients, whether to notify invitees/child-table hosts too, and what minimal cancellation notice remains after archival. Recommended notify affected booking accounts/attending accounts once, preserve a minimal inbox notice without granting archived-detail access, and suppress obsolete reminders.
- Chat and addresses: should cancellation make table chat read-only for its existing audience, and when should those reads end? Recommended immediate read-only chat and revocation of participant-based exact-address access; any independent host/admin authority remains separately checked. Archived-parent child/chat visibility must not bypass staff-only event access.

## Chat, Community, trust, and notifications

| Table | Main fields / invariant |
| --- | --- |
| `table_messages` | Tenant/table, author, body, timestamp, moderation state; authorized confirmed participants/host; same-tenant staff with `can_see_private_events` may read private-table chat bodies without participation, but the flag grants no send/edit/delete authority or private-address access |
| `table_chat_lifecycles` | Table PK/FK, read-only/archive timestamps; configurable retention policy |
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

- End time after start; positive capacity; no response-expiry fields for current reservations. Amount/currency constraints belong to deferred payment work.
- Atomic capacity checks count confirmed per-person seats. Group confirmation checks the whole persisted group/revision and commits all members or none. Automatic promotion and manual approval share the same capacity lock.
- No duplicate seats, championship entries, result confirmations, or notification delivery effects. Payment deduplication is deferred with that feature.
- Clients cannot directly rewrite tenant, event/table parent links, booking/attending identity, group membership, owner, staff role, or protected state; permitted transitions use controlled commands.
- Index staff-assignment/owner checks, community-account standing checks, event/table browsing by tenant/visibility/status/time, per-person registration/participation by resource/status/booking account, event-registration seat links, group membership and queue ordering, message pagination, championship result state, and notification recipient.
- Check actual query plans; index foreign-key access paths and deterministic queue ordering (time plus ID).
- Lists explicitly omit exact address data; protected address access is verified separately.

## Migrations, lifecycle, and analytics

Suggested sequence: identity/tenant → separate events/tables and protected locations → per-person registration/participation, atomic groups, admission/waitlist → chat/notifications → championship → Community/moderation/profile statistics → deferred payments/memberships in a late implementation stage. Every exposed table ships with grants, policies, and role tests.

Use two tenants and sample approved/pending/suspended accounts, hosts, table managers, guests, and entrants. Cover both confirmation modes and unnamed guest groups. Seed fake addresses, never real home data. Payment/member fixtures are deferred with those features.

Attendance supports distinct co-players and engagement metrics; deduplicate pairs per community and avoid counting reservations/no-shows as played games. Paid-member/revenue analytics are deferred with commercial functionality.

Archive events/tables and preserve result/audit history. Decide account anonymization, chat/message retention, address deletion after an activity, and championship retention before production. Avoid broad deletion cascades until these rules are approved. Generate frontend database types from migrations and test both clean installs and upgrades.
