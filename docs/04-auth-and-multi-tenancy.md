# Auth and multi-tenancy plan

Status: product access boundaries established; detailed lifecycle and role rules proposed.

## Identity, standing, benefits, and participation

Supabase Auth identifies users. A free signed-in account is not a paid membership. Community standing (approved/suspended), paid entitlement, staff role, and activity/competition participation are independent.

Proposed tenant: an independently operated community, initially Tegucigalpa. Locations and member tables are not tenants. All business authorization is tenant-specific, even for a user associated with multiple communities. No tenant switcher or self-service tenant creation is required for the first release.

Sign-in method remains open. The app needs account creation/login and reliable PWA callback behavior. See [Supabase Auth](https://supabase.com/docs/guides/auth).

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

## Proposed roles

Start with user, admin, and owner per tenant; hosting is a relationship to a table, not a global role. Add narrower event-organizer/moderator roles only if delegation warrants them. Owner controls staff assignment and ownership transfer; admins cannot self-promote. Protect the last active owner.

Admin access should use explicit commands and record reasons for sensitive actions. No platform-wide browser bypass. Staff participation benefits require an explicit entitlement/comp rule rather than automatic access through role.

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

Use live community standing/entitlement records for access decisions. Prevent recursive membership policies using narrowly scoped reviewed helpers if needed. For definer functions, fix search path, qualify references, restrict execution/owner privileges, and check caller/resource/tenant explicitly.

During auth restoration, show loading rather than guessing member status. On sign-out/account/tenant switch, cancel old requests, clear private caches, remove subscriptions, and ignore late responses. Reconcile access after expiry/revocation. A route slug, role badge, hidden button, or paywall is presentation rather than authorization.

Tenant association onboarding is still open: manual approval, automatic free association, or another process. Payment must not silently override a suspended/pending account. If invitations are introduced, verify recipient, expiry, one-use redemption, tenant and issuing authority atomically.

## Required security cases

Test two tenants with visitor, guest, member, host, expired member, suspended member, admin, and competition-only entrant. Attempt direct reads/writes/RPC, nested relationships, protected address fetches, storage and Realtime access.

Specifically prove: guest fees do not unlock the network; membership does not reveal unconfirmed addresses/chats; pending payments/requests/waitlists do not reveal addresses; member hosts cannot manage other hosts' tables; guests can compete without directory access; changing IDs cannot cross tenants; clients cannot self-grant benefits or verify payments; revocation prevents subsequent access.
