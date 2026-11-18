# Community public access simplification

Accepted product decisions and revised delivery scope, 2026-11-18. The user confirmed the product interview and subsequently narrowed current delivery to the originally proposed child ticket 1: retire the two obsolete visibility settings. Preserve the mock/sample community as-is. This revision supersedes the earlier approval to bundle client gates, join/status and own-Profile changes into the first checkpoint. Planning/publication does not start application implementation, migration execution or hosted work.

**Specification published 2026-11-18:** [issue #25](https://github.com/JonDManningDev/the-crowded-table-app/issues/25), labelled `ready-for-agent`. The user confirmed the existing real Auth/HTTP/PostgreSQL, observable client and retained database-safeguard testing boundaries before publication. [Document 28](28-community-public-access-checkpoint-spec.md) is the local copy of the published seven-section specification; this document retains the full accepted product/deferred-feature context. Publication does not start application implementation or hosted work.

## Confirmed target product decisions (not all in current delivery)

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

The current checkpoint is backend/schema/contract cleanup only: remove the two obsolete settings, reconcile existing dependent SQL and generated/client contract declarations where necessary, verify retained behavior and update documentation. The mock/sample community, including its routes, gates, preview toggle, Profile, paid-preview copy, activity dialogs and Home content, stays as-is. No new screens, new live community context, new adapters for joining, or user-facing behavior are included.

The agreed future audience model remains authoritative design intent. Changes to client section gates, join/status workflows and inactive own-Profile reads (including the server audience change) are deferred until community/account feature implementation. About, History, real activity admission/chat and unofficial open activities also remain deferred. Preserve existing backend authorization, archive and profile behavior in this cleanup.

[Document 28](28-community-public-access-checkpoint-spec.md) remains the exact copy of the originally published, broader issue #25 specification. It is historical publication evidence for that scope, not the current child ticket's authorization. Do not edit or close parent #25 during ticket publication; its remaining product work is not satisfied by the narrowed child.

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

## Revised first checkpoint specification

**Single narrowed child published 2026-11-18:** [issue #26](https://github.com/JonDManningDev/the-crowded-table-app/issues/26), labelled `ready-for-agent`, with native parent #25 and zero blockers. Its full body, open state, label, parent link and blocker count were read back and verified. Parent #25's title, body, state and labels were confirmed unchanged. The originally proposed other children were not published. Publication is not implementation authorization.

### What to deliver

Retire allow_public_chat_visibility and allow_public_activity_visibility from tenant_settings and existing settings/landing operations. A completed checkpoint is verifiable through real HTTP behavior and database replay/upgrade while the sample client renders and behaves as before.

- Use one coordinated forward migration and contract update; preserve historical migrations and explicitly reconcile dependent functions, projections, grants/manifests and fixtures. Do not use indiscriminate CASCADE, add aliases or introduce replacement flags.
- Remove the two keys from settings write/read schemas, public landing output, service field constants/SQL, server types and generated database query types. Update any actual client declaration/consumer only to maintain the changed transport contract. No preview/interface/route changes are included.
- Strict writes containing either retired key, including mixed valid/retired fields, are rejected without partial mutation. Responses omit both keys. Preserve unrelated endpoint paths, fields and status behavior.
- Retain auto_approve_users, pause_community_events and allow_public_directory_visibility with their defaults and management authority. Retain public slug identity, seven supported copy slots, minimal directory projection, eligibility, badges, cursor behavior and unknown/archived unavailability.
- Preserve existing join/request/return commands, current own/other Profile audiences and edits, blocks, archive fences, semantic audits and authorization. In particular, do not implement the future inactive own-Profile read as part of this settings cleanup.
- Preserve API-owned product authorization, service-owned result SQL, fact loaders, trusted runtime reads, least privilege, G-02, mutation scope, protected Auth, attribution, storage integrity and external Data API denial.

### Verification

Use the already confirmed real Auth through HTTP API to PostgreSQL tests as the primary contract/authorization boundary, plus existing migration/runtime/external safeguards. No new internal mocking seam is needed.

- Verify omitted response keys and rejected retired-key writes, including mixed patches with no partial updates. Pair allowed retained-setting edits with ordinary-member, wrong-permission and cross-tenant denials.
- Verify retained defaults, exact-slug lookup/copy projection, public directory on/off, approved/suspended eligibility, effective badges, missing-profile handling, cursor behavior and inaccessible unknown/archived slugs.
- Run clean local replay and a populated forward upgrade. Compare retained application/audit data, inspect exact removed dependencies and confirm unchanged runtime safeguards/external denial. Regenerate and verify complete query types from replay.
- Review deliberate HTTP-contract changes explicitly. Run applicable integration/authorization/concurrency checks, database safeguards, client tests, TypeScript, lint and build. Do not regenerate a baseline merely to hide a failure. Required unavailable/failed checks block completion until resolved or adjudicated.
- Verify the sample community remains unchanged, including Home and existing gate/Profile/activity behavior. Existing client tests/build plus focused browser checks support preservation; do not claim a new live join flow or new audience model was implemented.
- Review the scoped diff, preserve unrelated edits, commit the authorized checkpoint independently when implementation is approved, and update implementation/deployment status. Hosted execution remains separately identified and is not part of this planning/publication step.

## Deferred implementation

The remaining originally proposed children are not being published for execution in this narrowed batch: verified membership section gates/context, genuine join/application/return UI, and any-account own Profile with inactive saved content read-only. Their target product requirements remain recorded above. Public About/content management, global account History, official open admission/participant chat and later unofficial open activities also require their own feature specifications and implementation work.
