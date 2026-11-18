# Community public access simplification

Accepted product decisions and proposed first implementation specification, 2026-11-18. The user confirmed interview answers 1-14, including the official activity admission default and checkpoint scope. This documentation step does not authorize application implementation, migration execution or hosted changes. Review the completed specification and confirm shared understanding before execution.

**Specification published 2026-11-18:** [issue #25](https://github.com/JonDManningDev/the-crowded-table-app/issues/25), labelled `ready-for-agent`. The user confirmed the existing real Auth/HTTP/PostgreSQL, observable client and retained database-safeguard testing boundaries before publication. [Document 28](28-community-public-access-checkpoint-spec.md) is the local copy of the published seven-section specification; this document retains the full accepted product/deferred-feature context. Publication does not start application implementation or hosted work.

## Confirmed product decisions

- Retain everything currently visible on Community Home, including official activity listings and entry points. The earlier suggested static-only public Home was rejected. Official activities remain visible even when non-members cannot participate.
- Signed-in non-members may participate in official activities listed on Community Home when those activities admit non-members. Participation does not automatically create a community account. Disciplinary restrictions, blocks, capacity and other admission rules remain applicable; becoming a non-member does not bypass them. Guest attendance remains distinct from the booking account's eligibility. Visibility does not itself grant participation.
- New official activities default to community-public admission. An organizer must deliberately choose open admission to permit authenticated non-members. Concrete fields, editing UI and admission-change/transition rules await activity implementation; do not add a new activity setting or tenant visibility flag in the first checkpoint.
- A non-member admitted to an official activity receives that activity's participant-authorized chat access, including sending messages where ordinary participant rules permit. This grants no access to Discussion or unrelated chats and remains subject to participation/lifecycle rules.
- Meet & Play, Championship and Discussion require good standing: a community account with standing approved or suspended. Keep suspension's independent action restrictions. Non-members navigating to restricted sections go to a joining/not-member destination.
- The viewer's own community Profile is an exception: any community account row permits access to the Profile destination. Inactive/removed accounts can view their saved profile read-only, alongside status and applicable return controls. Pending, approved and suspended accounts retain their independently defined edit rights. Existing archived-community restrictions still apply. This does not grant access to other people's full profiles.
- Add a publicly accessible community About page describing and advertising that community rather than listing activities. Eligible staff with can_modify_content manage its content. Detailed content, presentation and editing design are deferred.
- Keep the public directory and its independent allow_public_directory_visibility setting, managed by eligible can_manage_settings staff. Its target accounts have approved or suspended standing; it exposes only community_account_profiles.display_name and a role badge sourced from tenant_staff_assignments when applicable. A badge requires approved standing and an active staff assignment; paused/revoked assignments do not produce badges. It grants no full-profile, DM or additional access. Exact placement in Home/About navigation is deferred.
- Remove tenant_settings.allow_public_chat_visibility and allow_public_activity_visibility from the intended product. Non-member browsing of unofficial community-public events/tables, discussions and chats is not retained.
- Keep joining, own application inspection/withdrawal and eligible return workflows available outside ordinary good-standing-only sections.
- Preserve read-only access to the viewer's own DMs originating in the community and the ability to report those messages. This is not continued community-section access.
- Plan a global account activity-history destination (a History tab is a candidate) covering current and previous activities of global and community scope. Records link to actual activity URLs. Each target independently grants full participation or read-only access according to lifecycle, membership and other applicable rules. Exact eligibility and UI are deferred to that feature's design; the list/link itself is not a blanket access grant.
- Community-public means accessible to community members in good standing, not anonymous-web access. Open is the canonical descriptor for activities whose admission rules permit authenticated non-members. Official/unofficial describes sponsorship, independently of admission; anonymous visibility alone does not make an activity open. Official open activities fit the current direction; opening unofficial activities remains a deferred expansion.

## Settled scope and deferred feature design

The first checkpoint removes the two obsolete settings across database/API/contracts/tests and corrects existing client section gates and the joining/status experience. Preserve current Home content. Restrict Championship alongside Meet & Play and Discussion; distinguish any-account own Profile. Replace the affected mock paid-membership gate with joining/status behavior. About, History and real activity admission/chat functionality are separate work.

There are no remaining product questions for this checkpoint. Deferred feature design includes About presentation/editor/storage, directory placement, exact History entitlements/UI, activity admission fields/default implementation/change rules, and future unofficial open activities. These deferred choices cannot be silently filled in by the first checkpoint.

For restricted sections, show the actual viewer's applicable sign-in/join/request/return/restriction state. Do not silently create membership or invent new authentication return-routing behavior. Exact activity participation actions belong to the later activity design; their Home visibility is retained here.

## Current implementation facts

Read against the local checkout on 2026-11-18; no hosted verification in this discussion.

- Both flags slated for removal already exist in migrations, generated database types, server settings/landing contracts, SQL projections and verification fixtures. Some older documents incorrectly still call them planned. No current client consumer of these visibility-flag names was found, and real activity/chat implementations do not yet use them.
- Public slug landing and the independently flag-gated public directory are implemented API operations. The directory projects display_name and staff_role only, with opaque pagination. Its badge currently requires approved standing and an active assignment; suspended accounts can still be directory rows without an effective staff badge.
- Community preview routes use mock membership. Only Meet & Play and Discussion currently have guest gates; Home renders mocked official activity content and opens activity dialogs for non-members. Championship and Profile do not yet implement the proposed authorization distinctions.
- The existing guest gate opens a mock paid-membership flow. It is not the proposed joining/status destination.
- Website overrides currently support seven approved hero/welcome text slots. About editing is a new content requirement; no new slots, rich-text model, publication workflow or arbitrary layout authority is approved here.

## Documentation reconciliation and delivery plan

This document and the decision register identify the accepted supersession. Current audience/settings/navigation and verification requirements are reconciled in the documents below; older baseline and completed verification records retain their historical meaning. The documentation changes establish intent, not an implemented migration:

- Documents 01, 04, 05, 07, 09, 10 and 15: public Home/About/directory, restricted sections, own Profile, joining flows and replacement of mock gates.
- Documents 02, 03, 08, 16 and 17: intended audiences, removal of the two flags, official versus unofficial activities, public directory, Profile, DM/history and About-copy authority. AM-07's flag-based public exploration and candidate all-pages-browsable direction are superseded where they conflict. Official activity visibility is retained.
- Documents 19, 20, 21, 23 and 25: distinguish historical checkpoints from current contracts and update affected operation/verification requirements without restarting the completed API migration.
- Documents 12 and README: report planning, implementation, local verification and hosted deployment separately.

## First checkpoint specification

### Client

- Give community section eligibility one owner. Evaluate good-standing section access separately from having any own community account. Do not use a paid-membership or feature-preview boolean as live authorization.
- Route direct navigation to restricted Meet & Play, Championship and Discussion destinations to a shared joining/status destination for non-members. A viewer without a community account also cannot open own Profile; an inactive own account can open saved Profile read-only with status/return controls. Pending/approved/suspended retain their existing edit rights. Keep owner-only archived account-content rules.
- Use current authenticated relationship/standing and request facts for live flows; previews may use explicit fixture states but must not be reported as persistent authorization or real join completion. Reuse existing typed API operations where their contracts suffice. Establish the preview/live route and community-identity wiring before implementing dependent joins; do not silently expand this checkpoint into activity feeds or an entire community-feature cutover.
- The joining/status destination supports sign-in, explicit joining, pending-request inspection/withdrawal and eligible return, with disciplinary restrictions enforced. Reconcile displayed state after a successful command or stale-state response. Auth return destinations retain existing policy unless separately changed. No paid plan, price or checkout is involved in this flow.
- Keep Home content, official-activity entry points and the existing public directory contract. Do not add About/History pages or real activity admission/chat in this checkpoint. Do not put future individually authorized activity/history URLs under the blanket section gate.
- Leave unrelated prototype checkout/promotional behavior outside the affected join gate unchanged; preserving Home content does not approve real payments. Update the affected gate's preservation record in document 15.

### Server and database

- Remove the two keys from community settings input/output, setting field constants, landing types/schema/SQL and all typed callers. Reject removed keys through strict input validation rather than ignoring them or retaining aliases.
- Use a new forward migration to drop the two stored columns. Preserve prior migrations and populated application/audit data; reconcile dependencies explicitly rather than using indiscriminate CASCADE. Regenerate the complete Kysely query schema from local replay and update schema manifests and test fixtures.
- Retain auto_approve_users, pause_community_events and allow_public_directory_visibility, including their defaults and existing management authority. Preserve the public directory endpoint, pagination, minimal projection and effective badge behavior.
- The new inactive own-Profile read is a real result-audience change: allow verified self in an active community with any community account row to read their saved profile, preserving G-02, bilateral non-self profile rules and existing field/edit contracts. Include service SQL and real Auth/HTTP/runtime verification; a client-only page change is insufficient. Pending/approved/suspended writes and inactive write denial remain unchanged.
- Keep existing explicit joining/application/return operations. If a current operation cannot supply the facts needed by the join/status flow, define its narrow actor/rows/fields/enumeration contract in this specification before implementation; do not broaden unrelated directory/profile reads.
- No replacement visibility flags, compatibility aliases, new activity-admission columns, arbitrary About slots, grants to external application Data API roles or product-audience database RLS are introduced. Preserve the accepted trusted-runtime boundary, G-02, mutation scope, protected Auth, attribution, integrity and audits.

### Verification and closeout

- Use a route matrix covering signed out, signed-in without an account, pending, approved, suspended, inactive, restricted inactive and archived-owner/non-owner viewers. Home remains public; protected sections require good standing; own Profile requires a row and follows read/edit/archive rules. Verify direct URLs, back/forward/refresh, account switch, loading and changed standing without flashing restricted content.
- Pair real inactive-self Profile read with inactive-other denial, inactive writes with permitted existing edits, and archived non-owner denial with retained owner management. Test known IDs, removed client filters, joins/embeddings where surfaces exist, and external Data API denial. Neither a directory row nor a history/referrer parameter grants profile access.
- Verify settings/landing responses omit both retired keys; strict writes containing either retired key fail. Retained fields, permissions, directory on/off behavior, approved/suspended target filtering, approved-active badges, narrow row fields, cursor behavior and unknown/archived slug behavior remain intact.
- Run clean local migration replay and a populated forward upgrade. Compare retained application/audit data and runtime safeguards; confirm the two columns and their obsolete dependencies are gone without broadening writes or external grants. Check regenerated query types against replay.
- Run relevant HTTP integration/authorization/concurrency suites, reviewed HTTP-contract comparison, client tests, TypeScript, lint and build under documents 22/23. Review deliberate contract changes explicitly; do not regenerate the HTTP baseline merely to clear failures. Required unavailable/failed gates block checkpoint completion until resolved or adjudicated.
- Visually verify Home preservation and the changed gate/Profile flows at mobile, tablet and desktop widths. Include pending/inactive/disciplinary states and keyboard/focus navigation. Verification of mock previews cannot establish live backend behavior.
- Future official open admission/chat, History links and About editing need their own allow/nearest-denial, lifecycle, stale-input, retry and concurrency gates when implemented. Do not claim those pass in this checkpoint.
- Review the scoped diff, commit the authorized checkpoint independently when implementation is approved, and update status/requirements with remaining work and variances. Hosted migration/deployment and verification require a separately identified execution step; none occurred during this documentation work.

## Ownership and later delivery

Preserve these boundaries when the first checkpoint or later features are implemented:

1. Client: centralize section eligibility and a genuine join/status destination, distinguish any-account own Profile from good-standing sections, and keep official activity detail/history authorization independent of the section gate. Scope the new public About separately when its content/presentation is designed.
2. Server: remove the two flags from settings and landing transports/projections; retain the public directory; authorize every current or future content operation independently of navigation. Preserve service-owned result SQL and policy fact gathering.
3. Database: a forward migration drops the two stored flags; reconcile affected integrity/runtime manifests, generated query types and fixtures. Do not add replacement visibility flags or compatibility aliases. Detailed About storage awaits its accepted content design.
4. Verification: pair allowed and denied audiences for routes and APIs, direct deep links, own Profile, directory projection/badges, non-member official admission, unofficial-content denial, DM reporting, history links, lifecycle and archive fences. Validate stale access and concurrent state changes wherever the delivered operations require them. Intentional HTTP contract changes need reviewed fixture changes, not a baseline regeneration to hide differences.

Later work is separately scheduled: public About/content management; global account History and exact resource authorization; real official activity admission/participant chat; then the future unofficial open-activity expansion. Their ordering/dependencies require their own feature specifications. This list is not authorization to implement them now.
