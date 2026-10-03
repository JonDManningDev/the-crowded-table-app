# Decisions and open questions

Status: reconciled with accepted auth/account/tenant decisions, provider selection, and the current canonical client architecture direction through 2026-10-03, including personal versus community navigation and ownership. Initial migration scope is settled; broader MVP and client-refactor questions remain open. Dashboard recommendations and future review triggers are recorded separately from verified applied settings in the [Auth operations record](11-auth-operations.md).

## Established direction

| ID | Decision / direction | Source |
| --- | --- | --- |
| D-001 | Vite + TypeScript + React Compiler | Explicit current user requirement |
| D-002 | Supabase, multi-tenancy, RLS | Explicit current user requirement |
| D-003 | Mobile-first web/PWA; no native launch apps | User requirement and handoff |
| D-004 | Product concept plus separate technical planning documents | User requirement |
| D-005 | Initial sample community: private Tegucigalpa gaming group independent of a permanent café; the broader platform supports user-created communities | Handoff context, clarified by D-043 on 2026-10-03 |
| D-006 | Five community tabs: Community Home, Meet & Play, Championship, Discussion, Profile; personal navigation is separate | Labels/scope revised by user on 2026-10-03; D-044 |
| D-007 | Community Home features that community's official events; no member-created table feed. This restriction does not apply to authorized personal aggregation on My Home | Handoff, scope clarified 2026-10-03; D-045 |
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
| D-034 | Use Resend for initial authentication email delivery; `thecrowdedtable.app` purchased through Cloudflare Registrar. Amazon SES may be evaluated later for experience or growth | User selection, recorded 2026-10-02; verification/setup and recommended sender subdomain tracked in the Auth operations record |
| D-035 | Pragmatic feature-oriented / vertical-slice client: `app` owns composition, `features` own business capabilities and their route `pages`; personal My Home and community-scoped Community Home composition belong to `app` | User architecture direction, 2026-10-02; locality and clear ownership before the prototype refactor |
| D-036 | Generic visuals use `components/primitives`; Crowded Table visuals use `components/shared` only with genuine independent cross-feature reuse | User architecture direction, 2026-10-02; avoid speculative reuse and mixed component ownership |
| D-037 | `lib` is reusable technical infrastructure; feature UI accesses Supabase through feature data functions and appropriate hooks/providers | User architecture direction, 2026-10-02; separate presentation, server-state lifecycle, and backend access without mandatory extra layers |
| D-038 | Plan for TanStack Query as the server-state layer; ordinary UI state remains local React state; no default Redux/global store | User architecture direction, 2026-10-02; intended adoption, not a claim that the library is installed |
| D-039 | Prefer feature-local types; generated Supabase types belong in `lib/supabase/database.types.ts`; add row-to-UI mapping only when useful | User architecture direction, 2026-10-02; preserve model flexibility without premature mapping |
| D-040 | Colocated CSS Modules are the default component styling strategy; semantic CSS custom properties support controlled community theme presets, never arbitrary tenant CSS | User architecture direction, 2026-10-02; scope styles and support future theming without tenant branches in feature components |
| D-041 | Centralize route configuration in `app`; use `@` for `src` imports, with selective feature public APIs and no circular upward dependencies | User architecture direction, 2026-10-02; router library and exact URLs remain open; alias configuration is refactor work |
| D-042 | Grow directories and abstractions with actual code; replace mocks behind useful feature interfaces while retaining presentation contracts | User architecture direction, 2026-10-02; no empty scaffolding, compulsory repository/service layers, or immediate whole-client rewrite |

D-035 through D-042 are the **current canonical client direction**, not immutable rules or claims of implementation. The [frontend patterns](05-frontend-patterns.md) contain the normative direction and recommended conventions; the [file structure plan](07-file-structure.md) contains illustrative future paths, current conflicts, and migration steps. Revisit these choices when concrete coupling, reuse, testing needs, or new requirements warrant it, and revise the related documents together.

## Personal and community scope — 2026-10-03

| ID | Decision / direction | Source |
| --- | --- | --- |
| D-043 | The platform lets users create/manage their own communities and belong to multiple communities. A community owner is independent of the `thecrowdedtable.app` owner. Keep community management/associations, discussion, account identity, and personal aggregation distinct. | Explicit user clarification, 2026-10-03 |
| D-044 | The sidebar's community area is name → subtitle → location → Community Home / Meet & Play / Championship / Discussion / Profile → motto. The lower global-account area adds My Communities and My Home; provide access on mobile too. | Explicit user UI direction, 2026-10-03; renames old Home and Community labels |
| D-045 | My Home is the new app landing and personal feed for related community announcements/discussions, RSVPs, and possible interest/tag/history-based event suggestions. Stub it now, connect sections as prerequisites arrive. My Communities may also start as a stub. | Explicit user direction, 2026-10-03; does not authorize an AI recommender, expanded data access, or a completed multi-community backend |

The first implementation uses `#my-home` and `#my-communities`, `#community-home` and `#discussion`, with legacy `#home`/`#community` aliases for existing community bookmarks. Successful account flows return to My Home. Current community data remains a sample; personal feed sections remain placeholders and the working owner-only list stays separate. Final tenant URLs, relationship queries, and feed ranking will be designed with their dependent features.

## Hosted testing and email setup

Use the existing hosted Supabase project `fsnipgsrlclbnfepcbvz` (`https://fsnipgsrlclbnfepcbvz.supabase.co`) for initial hosted validation, with the frontend running at `http://localhost:5173`. A separate hosted test project is not required at this stage. Authentication emails are English initially; localization is a later feature. Resend is selected for initial SMTP delivery, and `thecrowdedtable.app` was purchased through Cloudflare Registrar. Amazon SES is a possible later alternative. The [Auth operations record](11-auth-operations.md) captures recommended settings, unverified setup steps, and review triggers.

An earlier CLI check linked the repository to the selected project and found both initial migration versions in remote history, with no pending migrations in a dry run. Hosted Auth matched the declared localhost configuration: Site URL and callback allowlist, email confirmation required, 12-character minimum password, and secure password changes. Frontend Auth/callback/recovery flows are now implemented; the user reported signup email receipt, verified password sign-in, and successful recovery through password update/home return. A fresh signup retest after the callback timing fix remains outstanding. Later CLI project-key access returned HTTP 403; consult the [Auth operations record](11-auth-operations.md#url-configuration) for verification limits rather than treating this summary as live setup status.

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

The earlier frontend proposal's `features/home`, `components/ui`, global generated `types/database.ts`, and entirely undecided query/styling strategy are superseded by D-035 through D-042. The [refactor inventory](07-file-structure.md#current-conflicts-and-refactor-candidates) records both previous path conventions and current code that differs. The 2026-10-03 clarification separates personal My Home from Community Home; D-007 applies only to the latter. D-043 through D-045 supersede the old single-community application assumption.

## Initial migration readiness

The agreed auth/account/tenant migrations are now implemented under `supabase/migrations/`, with local configuration, authorization tests, and [implementation documentation](../supabase/README.md). The [schema milestone scope](03-database-schema.md#first-migration-milestone) and [initial authorization scope](04-auth-and-multi-tenancy.md#initial-milestone-authorization-scope) remain authoritative. Slug syntax/reserved names, field limits, and SQL contracts are specified in the implementation. Initial hosted migrations and frontend callbacks/recovery are implemented; remaining hosted retests and deployment readiness are tracked separately in the Auth operations record.

Q-001 is resolved by D-031: the tenant boundary and structural multi-community support are established. Initial role/permission scope is settled by D-019/D-020/D-023/D-032/D-033. Future invitations, ownership transfer, profile sharing, discovery, and configurable default grants remain deferred rather than blockers.

## Remaining setup and broader MVP questions

| ID | Question | Affects |
| --- | --- | --- |
| Q-002 | Complete the fresh hosted signup retest after the callback fix and outstanding setup checks in the Auth operations record; retain signup/recovery behavior through the client refactor. Frontend integration and user-reported email/sign-in/recovery tests already exist. Age policy remains open. Auth emails are English initially, with localization later. Sign-in method/post-signup destination are settled by D-029, required email verification by D-030, and community approval by D-018/D-019. | Auth, copy, moderation |
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

Preserve the implemented auth/account/tenant foundation. Address Q-002 setup and applicable launch-policy decisions before operating signup publicly; Q-003 through Q-013 belong to dependent feature/launch work and do not expand this migration milestone. The tenant boundary, initial roles, concept, and five-tab navigation do not need to be rediscovered.

## Client architecture review questions

These refine the accepted direction; they do not block recording it or require speculative implementation. Resolve each before its dependent refactor slice.

| ID | Question / review trigger | Current position |
| --- | --- | --- |
| CA-001 | Resolved 2026-10-03: distinguish My Home from Community Home. Refine section ranking/filtering as each source becomes available. | My Home is the personal landing/feed across related communities: announcements/discussions, RSVPs, and interest/history-based event suggestions. Community Home retains its official feed. D-043 through D-045. |
| CA-002 | Before replacing hash navigation, which router, exact URLs, tenant slug placement, and old-link compatibility are needed? | Central app route map is settled; preserve five destinations and working Auth callback/recovery URLs, redirect allowlists, and startup order. Reconcile reserved slugs with actual routes. |
| CA-003 | Resolved for community versus account scope on 2026-10-03: community creation/management and associations belong to `communities`; social content belongs to `discussion`; identity/session belongs to `auth`; personal aggregation belongs to `app`. Further partitioning of participation/chat/admin remains incremental. | Community identity and its five pages are tenant-scoped, including Profile; account navigation is global. The new communities stub starts the ownership split; existing creation/owner-list code moves in a later refactor slice. |
| CA-004 | When adopting TanStack Query, what are the query-key conventions, cache lifetimes, mutation invalidations, and cleanup rules on identity/tenant/access changes? Where does the Auth session provider sit? | TanStack Query is intended for resource server state; Auth subscriptions and ordinary UI state have separate lifecycles. Private caches need user/tenant scope and stale-response protection. |
| CA-005 | When adding theme presets, which semantic tokens, palettes/fonts, density/corner options, defaults, persistence, and application scope are supported? | CSS Modules plus semantic variables and controlled presets are settled; no arbitrary CSS, no new branding/settings schema required by this decision. Check accessibility for supported combinations. |
| CA-006 | For each real data slice, which mock contracts should survive, where are row-to-UI mappings useful, and is a form/schema library needed? | Keep presentation independent of fixtures and Supabase; choose tools/mappers only for concrete needs. Update aliases, tests, type-generation paths, and docs with the actual moves. |

The overarching review criterion is whether a change clarifies ownership, removes meaningful coupling, or makes change/testing easier. A new folder or layer is not evidence of improvement by itself.

## Decision maintenance

Record accepted choices with date, rationale, affected files, and reconsideration triggers. Use separate ADRs only for substantial tradeoffs. Match each implemented workflow to its permission rules, state transitions, and acceptance examples.
