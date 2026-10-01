# Decisions and open questions

Status: revised using the user's supplied handoff summary.

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

Evidence update: the supplied summary resolves the earlier missing-concept blocker. The five generated infographics in `visuals/` have also now been inspected for the frontend prototype. The [prototype guide](10-frontend-prototype.md) records how visual inconsistencies were resolved against the product brief.

## Proposals and illustrative values

| ID | Proposal | Status / consequence |
| --- | --- | --- |
| P-001 | Tenant = independently operated community, initially Tegucigalpa | Replaces venue-business assumption; future tenant business model still open |
| P-002 | Accounts may associate with multiple tenants | Structural proposal, not a required launch switcher |
| P-003 | L300/month; L125 eligible drop-in; illustrative L200 tournament entry | Proposed prices; do not hard-code as final |
| P-004 | Tuesday Learn & Play, Thursday special night, 7:30–10:30 PM, approx. 10-person home maximum | Schedule/capacity concept; individual events require explicit setup |
| P-005 | Manual/admin-assisted Meet Someone New | Strategic feature; confirm exact launch workflow |
| P-006 | Shared activity scheduling root with distinct official/member detail tables | Database proposal; preserve distinct permissions |
| P-007 | Active holds count against capacity; durable notification outbox | Technical proposal; durations and paid hold rules open |
| P-008 | Cached PWA shell, no persisted private API data or offline writes | Technical proposal |
| P-009 | Supabase Realtime for durable table chat updates | Architecture proposal |
| P-010 | Minimal user/admin/owner roles; host is a resource relationship | Technical proposal |
| P-011 | Retain the former nested app directory | Superseded by D-017; use the flattened repository-root layout |

Proposals are not approved by silence. The weekly examples, featured games, October dates, prizes, and larger-event guest counts are illustrative rather than a live calendar.

## Superseded initial assumptions

The first draft's café/venue-centered organization model, staff-only creation, member-only official discovery, minimal join/cancel-only MVP, and deferral of chat/Championship/Community/waitlists have been replaced. Public locations and private-address separation are now explicit. Hosting venues are optional context, not the domain's foundation.

## Open questions in implementation order

| ID | Question | Affects |
| --- | --- | --- |
| Q-001 | What future entity is a tenant, and is multi-community membership needed at launch? | Schema and onboarding; recommended community boundary |
| Q-002 | Which sign-in methods, launch language(s), and age policy? Community approval is settled by D-018/D-019. | Auth, copy, moderation |
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

Start with Q-001, Q-003, Q-004, and Q-005. The concept and five-tab navigation no longer need to be rediscovered.

## Decision maintenance

Record accepted choices with date, rationale, affected files, and reconsideration triggers. Use separate ADRs only for substantial tradeoffs. Match each implemented workflow to its permission rules, state transitions, and acceptance examples.
