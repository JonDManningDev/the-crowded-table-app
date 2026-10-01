# Decisions and open questions

Status: reconciled with accepted auth/account/tenant decisions through 2026-10-01. Initial migration scope is settled; broader MVP questions remain open.

## Established direction

| ID | Decision / direction | Source |
| --- | --- | --- |
| D-001 | Vite + TypeScript + React Compiler | Explicit current user requirement |
| D-002 | Supabase, multi-tenancy, RLS | Explicit current user requirement |
| D-003 | Mobile-first web/PWA; no native launch apps | User requirement and handoff |
| D-004 | Product concept plus separate technical planning documents | User requirement |
| D-005 | Private Tegucigalpa gaming community independent of permanent café | Handoff core concept |
| D-006 | Five tabs: Home, Meet & Play, Championship, Community, Profile | Handoff settled navigation |
| D-007 | Home features official events; no member-created table feed | Handoff |
| D-008 | Member-only tables/Community; nonmembers may buy eligible official admission and competition entry | Handoff |
| D-009 | Members create tables; instant/request joining; capacity and FIFO waitlist | Handoff |
| D-010 | Exact private addresses accessible only to host, confirmed participants, authorized admin | Handoff privacy requirement |
| D-011 | Temporary private table chat; no general DMs/Discord dependency | Handoff |
| D-012 | Monthly featured-game championship, independent confirmation, disputes, Final Table, history | Handoff |
| D-013 | Membership entitlement separate from payments; manual activation supported | Handoff |
| D-014 | MVP includes official events, tables/chat, Championship, minimal Community, Profile, admin | Handoff MVP recommendation adopted as planning baseline |
| D-015 | Warm club aesthetic and Games • People • Belonging | Handoff |
| D-016 | No catalog/POS/venue management, followers/person ratings, AI recommendations, native apps in MVP | Handoff exclusions |
| D-017 | Vite app lives at repository root alongside `docs/`; planned `supabase/` also belongs at root | User removed the accidental duplicate app directory; verified against current layout |
| D-018 | `tenant_settings.auto_approve_users` is a non-null boolean, default false; the creator's optional community account is auto-approved during tenant creation | User decision, 2026-09-30; schema and auth plans |
| D-019 | `tenant_staff_assignments.can_approve_users` is a non-null boolean, default false for admins; all owner administrative permissions initialize to and remain true, including future related permissions | User decision, 2026-09-30; schema and auth plans; revisit only if the owner authority model changes |
| D-020 | Initially all administrative permissions default to false for non-owner staff. Later, an owner-only community-staff configuration UI will support default grants for new admins and individual permission customization; configurable defaults/persistence are deferred from the first migrations | User decision, 2026-09-30; schema and auth plans; owner permissions remain always true |
| D-021 | Tenant lifecycle initially uses `active` (default) and `archived`. Archive denies ordinary participation/writes while retaining owner management/restoration access; platform suspension is deferred | User approval, 2026-09-30; schema and auth plans; archive/restore initially owner-only |
| D-022 | Initially prohibit hard deletion of referenced user accounts. Preserve human audit attribution; `NULL` means system. Defer the eventual anonymization/auth-deletion workflow until explicitly designed | User approval, 2026-09-30; schema and auth plans; revisit when implementing account deletion/anonymization |
| D-023 | Admin creation/invitation requires `tenant_staff_assignments.can_create_admin`, default false for admins and always true for the owner; creation does not confer permission-granting authority | User decision, 2026-09-30; schema and auth plans |
| D-024 | Ownership is immutable after tenant creation in the initial version. Owner-controlled transfer will be implemented in a later version with atomic replacement and owner invariants preserved | User decision, 2026-09-30; schema and auth plans; transfer command and UI deferred |
| D-025 | Initial `user_accounts` fields are identity and standard audit fields only. Minimal `community_account_profiles` (community-specific display name/bio, keys, audit fields) is in scope for the first migration milestone beside `community_accounts` | User approval, 2026-10-01; schema and auth plans; extended preferences/profile fields deferred |
| D-026 | Tenant slugs are lowercase, unique, exclude reserved application names, and are immutable initially | User approval, 2026-10-01; schema and auth plans; exact syntax and reserved list finalized alongside routing |
| D-027 | Public active-tenant lookup by slug returns only `id`, `slug`, `name`, `country_code`, `state_province`, `city`, `timezone`; archived tenants are publicly unavailable and administrative/profile data stays protected | User approval, 2026-10-01; schema and auth plans |
| D-028 | Community discovery (“Find Your Next Community”) and opt-in sharing of selected profile data on community pages/searches are later-release features, outside the initial migration milestone; potential member/non-member visibility controls remain to be designed | User direction, 2026-10-01; schema and auth plans; no speculative visibility flags/tables in the initial schema |
| D-029 | Initial authentication uses email/password through Supabase Auth; OAuth/OIDC is planned for a later release. After a new signup is authenticated, return the user to the application home page | User decision, 2026-10-01; auth plan; post-signup return-to-origin behavior deferred |
| D-030 | Email verification is mandatory to complete account creation and access authenticated app actions. Pre-verification identity/account provisioning does not grant access; Auth owns verification state | User decision, 2026-10-01; auth plan; verification is independent of community approval and entitlements |
| D-031 | Tenant means independently operated community. Global users can associate with multiple communities; staff authority and optional community participation are separate. No launch tenant switcher is required | Established user decisions in schema/auth plans; reconciles P-001, P-002, P-010, and Q-001 |
| D-032 | Initial admin assignment selects existing verified users through same-tenant community accounts, gated by `can_create_admin`; owners can perform it and delegate through that flag. Invitations and their persistence/UI follow later | User direction, 2026-10-01; schema/auth milestone scope; staff-to-global-user relationship remains independent |
| D-033 | First migrations include the eight tables listed in the schema milestone, self-profile access, narrow administrative candidate/approval lists, joining/approval, owner-only permission editing command and website-copy editing; defer directory access, suspension/removal/reinstatement commands, and broader admin editing flags | User acceptance of milestone recommendations, 2026-10-01; schema/auth plans |

## Proposals and illustrative values

| ID | Proposal | Status / consequence |
| --- | --- | --- |
| P-001 | Tenant = independently operated community, initially Tegucigalpa | Accepted; see D-031. Future commercial model does not reopen the tenant boundary |
| P-002 | Accounts may associate with multiple tenants | Accepted structurally; see D-031. No launch switcher required |
| P-003 | L300/month; L125 eligible drop-in; illustrative L200 tournament entry | Proposed prices; do not hard-code as final |
| P-004 | Tuesday Learn & Play, Thursday special night, 7:30–10:30 PM, approx. 10-person home maximum | Schedule/capacity concept; individual events require explicit setup |
| P-005 | Manual/admin-assisted Meet Someone New | Strategic feature; confirm exact launch workflow |
| P-006 | Shared activity scheduling root with distinct official/member detail tables | Database proposal; preserve distinct permissions |
| P-007 | Active holds count against capacity; durable notification outbox | Technical proposal; durations and paid hold rules open |
| P-008 | Cached PWA shell, no persisted private API data or offline writes | Technical proposal |
| P-009 | Supabase Realtime for durable table chat updates | Architecture proposal |
| P-010 | Minimal user/admin/owner roles; host is a resource relationship | Superseded by explicit owner/admin staff assignments and separate participation; D-019/D-020/D-023/D-031. Host remains a resource relationship |
| P-011 | Retain the former nested app directory | Superseded by D-017; use the flattened repository-root layout |

Proposals are not approved by silence. The weekly examples, featured games, October dates, prizes, and larger-event guest counts are illustrative rather than a live calendar.

## Superseded initial assumptions

The first draft's café/venue-centered organization model, staff-only creation, member-only official discovery, minimal join/cancel-only MVP, and deferral of chat/Championship/Community/waitlists have been replaced. Public locations and private-address separation are now explicit. Hosting venues are optional context, not the domain's foundation.

## Initial migration readiness

No unresolved product decision currently blocks authoring the agreed auth/account/tenant migrations. Use the [schema milestone scope](03-database-schema.md#first-migration-milestone) and [initial authorization scope](04-auth-and-multi-tenancy.md#initial-milestone-authorization-scope). Finalize slug syntax/reserved names, field limits, SQL contracts, and tests during implementation. Production email delivery, callback destinations, and recovery flows must be completed before signup is operational, not before migration authoring.

Q-001 is resolved by D-031: the tenant boundary and structural multi-community support are established. Initial role/permission scope is settled by D-019/D-020/D-023/D-032/D-033. Future invitations, ownership transfer, profile sharing, discovery, and configurable default grants remain deferred rather than blockers.

## Remaining setup and broader MVP questions

| ID | Question | Affects |
| --- | --- | --- |
| Q-002 | Configure callbacks, recovery, and production email delivery. Which launch language(s) and age policy? Sign-in method/post-signup destination are settled by D-029, required email verification by D-030, and community approval by D-018/D-019. | Auth, copy, moderation |
| Q-003 | Which entitlement states grant benefits, for what dates, and what happens to existing seats/chats/hosted tables/competition entries on lapse? | Every private access path |
| Q-004 | Final prices, collection method, verifier workflow, payment hold duration, cancellation/refund rules? | Membership, drop-ins, special tickets, competition |
| Q-005 | Does table capacity include host? Does home maximum include founder/helpers? What are cancel/no-show cutoffs? | Capacity and attendance |
| Q-006 | Waitlist offer window, FIFO eligibility, request-table approval ordering, guest payment window, notification channel? | Seat state machine and worker |
| Q-007 | First championship formula, min/max matches, repeated opponents, confirmation quorum/deadline, disputes/ties, finalist count? | Rules schema and standings |
| Q-008 | Which championship identities/results are public, especially nonmember entrants? How do guests arrange qualifying matches outside Meet & Play? | Competition privacy and guest UX |
| Q-009 | Chat post-event window, read-only/archive/deletion periods, admin access, lapse/cancellation behavior? | Chat/privacy lifecycle |
| Q-010 | Are report/block controls required for launch, and how do blocks affect shared tables/chat/competitions? | Trust model; suspension/removal already required |
| Q-011 | How is attendance verified, and which stats are member-visible? | Distinct co-player metrics and profile history |
| Q-012 | Is manual Meet Someone New part of first public MVP and who operates it? | Matching UI/admin process |
| Q-013 | Hosting, supported devices, email/push, backup/recovery, retention/deletion? | Deployment and launch readiness |

Proceed first with the agreed auth/account/tenant migrations. Address Q-002 setup and applicable launch-policy decisions before operating signup publicly; Q-003 through Q-013 belong to dependent feature/launch work and do not expand this migration milestone. The tenant boundary, initial roles, concept, and five-tab navigation do not need to be rediscovered.

## Decision maintenance

Record accepted choices with date, rationale, affected files, and reconsideration triggers. Use separate ADRs only for substantial tradeoffs. Match each implemented workflow to its permission rules, state transitions, and acceptance examples.
