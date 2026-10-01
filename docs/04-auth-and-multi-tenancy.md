# Auth and multi-tenancy plan

Status: initial auth/account/tenant scope and permissions established; broader MVP privileges and lifecycle details remain proposed. The initial milestone boundaries below take precedence over broader future-feature access examples.

## Initial milestone authorization scope

Owners can select admins from existing `community_accounts` in their tenant, linked to verified global users. The established `can_create_admin` flag also permits active same-tenant admins to perform this controlled assignment. Enforce the target's same-tenant community association and verified identity server-side; create an admin assignment with all permissions false without changing community standing or benefits. Repeated creation must not overwrite existing assignments or their permissions. Staff authority still references the global account directly, not a community-account foreign key. Owner participation remains optional.

Support this workflow with a narrow administrative candidate list available only to the owner or staff with `can_create_admin`: same-tenant account user ID, standing, existing staff-assignment status, and optional profile display name. Omit bio, email, audit actors, and unrelated profile data; a missing profile does not prevent selection. Similarly, the approval workflow may expose pending-account IDs and optional display names to the owner or staff with `can_approve_users`. These are explicit administrative projections, not general directory/profile access. Profile reads/edits otherwise remain self-only for this milestone; fellow-member directory access waits for entitlement policies.

Include an owner-only backend command to change `can_approve_users` and `can_create_admin` on admin assignments, retaining audit records and the always-true owner invariant. The full staff configuration UI and configurable default grants come later. Initial tenant-detail/settings and website-copy editing remain owner-only; no admin editing authority is inferred from either initial flag.

Community-account state commands initially cover joining and approval only. Suspension/removal/reinstatement commands are deferred; rejoining cannot reset standing. Admin invitations (including their persistence, delivery, redemption, and UI) are a follow-up feature. References to invitation/transfer tests elsewhere in this document describe future acceptance requirements, not additional first-milestone scope. Use `tenant_admin_actions` as the canonical tenant-scoped administrative audit table.

## Identity, standing, benefits, and participation

Supabase Auth identifies users. A free signed-in account is not a paid membership. Community standing (approved/suspended), paid entitlement, staff role, and activity/competition participation are independent.

Proposed tenant: an independently operated community, initially Tegucigalpa. Locations and member tables are not tenants. All business authorization is tenant-specific, even for a user associated with multiple communities. The intended UX includes self-service tenant creation as described below. A tenant switcher is not currently required for the first release.

The initial sign-in method is email/password through Supabase Auth. OAuth/OIDC sign-in is planned for a later release and is outside this milestone. Supabase Auth remains authoritative for credentials and login identities; do not duplicate passwords or verification tokens in application tables. The email/password implementation must include password recovery and reliable PWA callback behavior. See [Supabase Auth](https://supabase.com/docs/guides/auth).

After a new signup is successfully authenticated, send the user to the application's home page. For this initial flow, do not resume a pre-signup destination, send the user directly to community creation, or automatically create a tenant/join a community/accept a staff invitation. Account creation and community onboarding remain separate explicit actions. Password recovery retains its dedicated recovery flow rather than being treated as a new-signup redirect.

Email verification is required to complete account creation. Explicitly enable email confirmation in every environment, including local development. Signup initially shows a check-your-email screen with a resend option; only after verification and successful authentication does the user proceed to the home page. Auth and a corresponding `user_accounts` record may be provisioned before verification, but these are pending signup records, not authorization to use authenticated application features. Do not add a duplicate application-level verification flag; Supabase Auth is authoritative.

Until verified, users may browse permitted public content and complete verification/recovery flows, but may not create tenants, join communities, accept admin invitations, or perform authenticated management/participation actions. Enforce this boundary through Auth configuration and backend authorization rather than UI controls alone. Verification is a platform-wide requirement and does not replace community approval or grant membership benefits. Callback route names, environment-specific redirect allowlists, production sender/SMTP configuration, and recovery details remain implementation/setup decisions; the post-signup destination is settled as home.

## Account and community creation

1. A first-time visitor can browse permitted public content without an account.
2. **Create Account** starts email/password signup, provisioning the Auth identity and its global `user_accounts` record. Require email verification before signup is complete and authenticated app access is available; then send the authenticated user home. No community account or tenant association is required.
3. **Start New Community** creates the tenant and automatically assigns the signed-in creator as its single active owner through `tenant_staff_assignments`. These writes must succeed or fail together in a trusted transaction.
4. During creation, ask: **“Would you also like to join this community as a participant?”** Supporting text: “You can manage this community either way. You can join later.” Opting in creates a `community_accounts` record for the same global user and allows community profile setup. Opting out creates neither a community account nor a profile; the owner retains management access.

There is one global login. Staff assignments and community participation are separate tenant-specific relationships. Joining does not automatically grant paid membership benefits. The creator's optional community account is automatically approved during tenant creation regardless of `tenant_settings.auto_approve_users`. Create the default settings row with the tenant and owner assignment in the same transaction.

The initial milestone includes minimal `community_account_profiles` beside `community_accounts`: a community-specific display name and optional bio, plus identity keys and standard audit fields. `user_accounts` initially contains only the Auth identity reference and standard audit fields; speculative preferences and extended profile fields are deferred. Profile setup may follow community-account creation and is not required for staff management access. Users may edit their own profile through permitted writes while the tenant is active; profile reads follow existing directory/privacy rules, and profile writes cannot change standing or grant access.

Tenant slugs are lowercase, unique, exclude reserved application names, and are immutable after creation in the initial version. Validate creation at the backend/database; ownership does not permit slug changes. The migrations enforce 3–63 ASCII letters/digits with single separating hyphens and enumerate reserved route names; keep the reserved list synchronized with routing changes.

## Public tenant lookup and future discovery

Anonymous visitors may look up an active tenant by slug and receive only `id`, `slug`, `name`, `country_code`, `state_province`, `city`, and `timezone`. These are public identity/general-location fields. Exclude operational status, audit timestamps/actors, staff assignments and owner identity, permission flags, tenant settings, community accounts, and profiles. Website copy follows its own destination-page visibility. Enforce this limited representation in the backend/database rather than filtering full tenant rows in the browser; alternate reads must not bypass it.

Archived tenants are unavailable through public lookup, with a generic “Community unavailable” page rather than disclosed archive status. Authenticated owners retain management/restoration access. Initial public access is lookup by slug; a “Find Your Next Community” page and general community listings/search are later-release features.

A future opt-in interface will let community-account holders share selected profile data on community pages and in searches. Potential controls differentiating visibility to fellow community members versus non-members remain to be designed. No sharing UI, visibility flags, or public profile-search access is included in this milestone. Profile creation is not consent to public sharing, and current private-directory restrictions remain applicable.

## Access matrix

“Member” below means approved account with a currently effective entitlement. “Guest” means signed-in nonmember in good standing. Suspension overrides ordinary resource access. Staff exceptions are scoped, audited operations.

| Action | Visitor | Guest | Member | Resource-specific / admin rule |
| --- | --- | --- | --- | --- |
| Browse published official summaries and membership info | Yes | Yes | Yes | Exact home address excluded |
| Reserve eligible official event | Sign in first | Verified drop-in/special admission | Included if configured; special ticket may still apply | Capacity/holds enforced |
| View member tables or member directory | No | No | Yes | No names/seat previews behind paywall |
| Create member table | No | No | Yes | Host manages own table, not tenant-wide events |
| Take/request seat at member table | No | No | Yes | Instant or host approval |
| Read exact private address | No | Only with confirmed official seat | Only with confirmed seat | Host or authorized tenant admin also allowed |
| Access table chat | No | No for member-table chats | Confirmed participants/host only | Not every member; admin moderation policy explicit |
| Read/write Community | No | No | Yes | Author edit scope and moderation rules apply |
| View championship overview | Yes | Yes | Yes | Public leaderboard identity fields unresolved |
| Register/compete in championship | Sign in first | Verified competition fee | Included entry | Registration/eligibility limits still apply |
| Submit/confirm match | No | Eligible entrant in that match | Eligible entrant in that match | Independent confirmation; admin resolves disputes |
| Manage membership, official events, competition, moderation | No | No | No by default | Authorized tenant admin |

A competition entry does not expose Meet & Play, Community, private member profiles, or table chat. Championship has its own entry, participant display, submit, and confirmation surfaces.

## Canonical staff roles and owner protections

Store management authority in `tenant_staff_assignments`, with `owner` and `admin` roles. Ordinary participants do not need a staff assignment; hosting is a relationship to a table, not a global role. Staff assignments reference global user accounts and do not require community accounts or profiles.

- The user account that creates the tenant automatically becomes its owner.
- Each tenant must have exactly one active owner. Multiple simultaneous owners are not allowed; other active staff assignments may be admins. The initial explicit admin permissions are `can_approve_users` and `can_create_admin`; other detailed privileges will be delineated later.
- `can_approve_users` is a non-null boolean on `tenant_staff_assignments`, default false for admins. The owner may grant it to admins. An active admin with this permission may approve pending community accounts in the same tenant; it grants no authority to edit permissions/settings, reinstate suspended/removed accounts, or manage entitlements.
- Initially all administrative permissions default to false for non-owner staff, including future permission flags. The admin role itself grants no administrative capability. A later community-staff configuration UI will let the owner set default permissions for new admins and customize permissions for each individual admin. Configurable defaults are deferred and apply to new admins, without silently changing existing individual grants. Neither defaults nor individual customization may disable owner permissions.
- Every owner administrative permission must initialize to and remain true, including permissions later introduced on staff assignments or related tables. Owner creation and ownership transfer set all required permissions to true atomically. Database enforcement must reject false/null owner permissions and deletion of required permission records. Adding permissions must backfill existing owners to true and extend enforcement; admins default to false. These permissions do not grant paid participation benefits or bypass platform-level restrictions.
- `can_create_admin` is a non-null boolean on `tenant_staff_assignments`, default false for admins and always true for the owner. Creating an admin assignment or issuing an admin invitation requires this permission on an active same-tenant staff assignment. New admins start with all permissions false; the creator cannot copy their own grants or grant permissions through this operation. Permission configuration remains owner-controlled. This flag does not authorize staff removal or ownership changes. Validate invitation recipient, tenant, expiry, one-use redemption, and issuing authority atomically; recipients cannot supply their own role or permissions. Invitation delivery/UI details remain open.
- Ownership is immutable after creation in the initial version, even for the owner: defer both the transfer command and UI. Owner-controlled transfer is planned for a later version; it must atomically replace the current owner, preserve exactly one active owner with all administrative permissions true, and maintain protections under concurrency. Admins cannot self-promote or transfer ownership. Revocation and global account deletion must not leave a tenant ownerless.
- An admin may never remove or block the owner from their tenant. This includes demoting, revoking, suspending, or deleting the owner's assignment or otherwise denying their tenant management access.
- An admin may also never remove or block the community account associated with the owner of that same tenant. This includes suspension, removal, deletion, or an equivalent access-denying standing change. Identify the protected account by matching both tenant and the current owner's global user ID; do not rely on profile presence or a role on the community account.

Management commands and RLS must authorize against active staff assignments independently of community participation. Leaving as a participant does not by itself revoke ownership or staff access. Owner protections apply on every applicable backend write path, including direct table writes, RPC, and moderation commands, and must remain correct during concurrent ownership changes.

Admin access should use explicit commands and record reasons for sensitive actions. No platform-wide browser bypass. Staff participation benefits require an explicit entitlement/comp rule rather than automatic access through role.

## Account deletion and audit retention

Initially, referenced user accounts cannot be hard-deleted. This includes references from tenant ownership/staff assignments, community participation, and audit actor columns. Enforce restrictive deletion behavior in the database and ensure Auth identity deletion cannot cascade around it. Never null historical human attribution to enable deletion: `NULL` in `created_by`/`updated_by` means system, not a deleted or unknown user. Ownership transfer alone does not make an account deletable if other references remain. The eventual anonymization/auth-deletion workflow is deferred until explicitly designed; do not expose a deletion flow that would violate these rules.

## Tenant lifecycle

Tenants start `active` and may transition to `archived`, then back to `active` through controlled owner-only archive/restore commands. These are the only initial operational states; platform suspension is deferred.

An archived tenant denies ordinary community participation and ordinary tenant-scoped writes, regardless of participant standing, entitlement, or admin permission flags. The owner retains access for explicit management/restoration operations; this is not permission to participate normally while archived. Archiving preserves data, staff assignments, and the requirement for exactly one active owner. Restoration remains subject to existing account standing and entitlement checks and does not automatically approve or reinstate participants. Tenant state must be enforced in relevant backend policies and commands, including future participation workflows.

## Community customization permissions

The application supplies the general website structure and behavior. Owners may edit approved community details and predefined website-copy slots; admins require explicit corresponding privileges rather than receiving all customization rights from the `admin` role alone. Delineate permissions for editing community details, editing website copy, and changing operational settings separately when the privilege model is finalized. Tenant operational status uses controlled lifecycle commands, not an ordinary unrestricted details form.

Authorize customization through active `tenant_staff_assignments` even if the editor has no community account or profile. Validate allowed content keys and text limits server-side. Read permissions match the destination page: private Community content must not be exposed through public website-content listings. Audit attribution uses trusted `created_by`/`updated_by` values referencing global user accounts, following the [schema conventions and content model](03-database-schema.md#canonical-naming-and-audit-conventions). Resetting an override to its application default is also an authorized write operation.

## Membership entitlement policy

Founder/admin can activate, revoke, or correct membership manually with dates, actor, reason, and source. A provider integration may automate the same commands later. Users cannot change their own entitlement.

| State | Draft behavior to decide |
| --- | --- |
| active | Grant benefits only within effective access dates |
| trial | Whether it receives all or selected benefits remains open |
| past_due | Access/grace policy unresolved |
| grace_period | Proposed time-bounded benefits until explicit grace end |
| canceled | Decide immediate removal vs access through paid-through date |
| expired | Deny new member-only access and participation |

An entitlement decision must combine state, effective dates, and standing at the server, not a frontend boolean or stale role claim. Suspension denies access regardless of payment.

Resolve lapse effects on existing seats, hosted tables, chats, and championship entries before launch. Proposed default: remove new private-network access when entitlement ends; operational exceptions for previously confirmed activities must be explicitly designed rather than inadvertently granted. Event purchases remain separate from subscription status, subject to suspension and cancellation rules.

## Address and communication protection

Private location details are separately stored. Authorized host, confirmed participant, or scoped admin can read them. Pending request, offered seat, waitlist, or unverified payment never qualifies. On cancellation/suspension, further reads are denied; data already seen cannot be made unknown.

No exact address in broad payloads, public pages, analytics, logs, notifications, or unrestricted Realtime events. Use authenticated resource links. Prevent general access through joins, views, functions, storage metadata, or subscriptions.

Chat requires current authorized access on reads and sends. On seat cancellation, suspension, or entitlement changes, unsubscribe and clear client state; backend policy must deny new reads/writes independently. Archival read permissions and the post-event window remain open. Realtime updates are hints to refetch authorized state, not permission grants.

## Enforcement and session lifecycle

Use database grants plus per-operation RLS. Protect sensitive columns, and explicitly authorize transactional/privileged RPC. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Use live community standing/entitlement records for participation decisions and live staff assignments for management decisions. Enforce owner protections against the current owner in the same transaction as the protected operation. Prevent recursive membership policies using narrowly scoped reviewed helpers if needed. For definer functions, fix search path, qualify references, restrict execution/owner privileges, and check caller/resource/tenant explicitly.

During auth restoration, show loading rather than guessing member status. On sign-out/account/tenant switch, cancel old requests, clear private caches, remove subscriptions, and ignore late responses. Reconcile access after expiry/revocation. A route slug, role badge, hidden button, or paywall is presentation rather than authorization.

Community participation approval uses `tenant_settings.auto_approve_users` (boolean, not null, default false): new joins start pending when false and approved when true. The creator's optional community account is approved during tenant creation regardless of this setting. Existing pending accounts require explicit approval by the owner or an active admin with `can_approve_users`; changing the setting is not retroactive and cannot reinstate suspended/removed accounts. Initially only the owner can change this setting. Approval commands validate current standing and tenant permissions atomically. This does not make participation mandatory for staff or grant paid benefits. Payment must not silently override a suspended/pending account. If invitations are introduced, verify recipient, expiry, one-use redemption, tenant and issuing authority atomically.

## Required security cases

Test two tenants with visitor, guest, member, host, expired member, suspended member, admin, and competition-only entrant. Attempt direct reads/writes/RPC, nested relationships, protected address fetches, storage and Realtime access.

Specifically prove: guest fees do not unlock the network; membership does not reveal unconfirmed addresses/chats; pending payments/requests/waitlists do not reveal addresses; member hosts cannot manage other hosts' tables; guests can compete without directory access; changing IDs cannot cross tenants; clients cannot self-grant benefits or verify payments; revocation prevents subsequent access.

Also prove: global signup requires no community account; tenant creation assigns the creator as owner atomically; a second active owner cannot be created; owner transfer/revocation/account deletion cannot leave a tenant ownerless; an owner without a community account can manage the tenant without receiving participant benefits; admins cannot remove or block either the owner or the owner's community account in that tenant through any write path, including during concurrent ownership transfer; protections follow the current owner and are scoped to the matching tenant.

For customization, prove that only owners or appropriately privileged admins can edit/reset content or approved tenant details; staff need no participation account; private copy is not publicly readable; unsupported content keys are rejected; and clients cannot forge creation/update actors.

For identity/profile and slug rules, prove that signup needs no profile; community profiles cannot reference another tenant's account or duplicate a tenant/user pair; users cannot edit someone else's profile or gain access through profile changes; and private profiles remain protected. Prove uppercase/reserved/duplicate slugs are rejected by persistence rules, concurrent creation cannot duplicate slugs, and post-creation slug changes are denied even for owners.

For signup verification, prove that unverified identities cannot access authenticated app operations, including direct tenant creation/join/admin-invitation commands; verification followed by successful authentication returns new signups home without automatic community actions; and expired/invalid verification links allow a clear retry/resend flow. Verify the confirmation requirement in local, non-production, and production configuration.

For public tenant lookup, prove that only active tenants and the seven approved fields are returned, archived tenants are unavailable publicly while owners retain authorized access, and anonymous direct/alternate reads cannot expose excluded fields or related administrative/profile records. No public directory/search interface is shipped in this milestone.

For staff permissions, prove that a newly assigned admin starts with all administrative flags false and cannot perform administrative actions merely by having the admin role. Explicit grants authorize only their corresponding operations. New permission migrations must preserve the false default for admins and the always-true owner invariant.

For admin creation/invitation, prove that `can_create_admin` is required on an active same-tenant assignment, new admins cannot inherit or receive caller-supplied permissions, and creation/invitation cannot assign the owner role. Validate invitation redemption without permitting recipient escalation. In the initial version, reject ownership changes through all application write paths; transfer and concurrent-transfer cases above are future acceptance requirements for the planned transfer feature.

For account deletion, prove that referenced accounts cannot be hard-deleted through direct database writes or an Auth deletion cascade, that dependent records and human audit attribution remain intact, and that no deletion can leave a tenant ownerless. An account referenced only by audit fields must still be protected.

For tenant lifecycle, prove that new tenants start active; only the owner may archive/restore; archived tenants deny ordinary participation and writes even with valid entitlements or admin grants; and the owner can still perform explicit management/restoration. Archiving must retain data and exactly one active owner. Restoration must not bypass account standing or entitlement checks.

For approval, prove that default settings yield pending joins, enabled auto-approval yields approved new joins, and the creator's optional account is approved regardless. Setting changes must not retroactively approve pending accounts or reinstate suspended/removed accounts. Only the owner or an active same-tenant admin with `can_approve_users` may approve pending accounts; the flag must not authorize settings/permission edits or benefit grants. Owner permissions must always be true, including after transfer and when new permission flags are introduced; direct writes and deletion of related permission records cannot bypass the invariant.
