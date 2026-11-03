# Database flag inventory

Accepted 2026-11-03 (G-03a): store `show_global_profile`, `allow_direct_messages` and `allow_private_invitations` in `public.community_account_preferences`, one row per `(tenant_id,user_id)`. This is the migration target; no database changes have been applied. G-03b accepted 2026-11-03: store `can_post_public_events` in `public.community_account_permissions`, one row per community account. It defaults false; the holder can read it, and effective same-community staff with `can_manage_community_permissions` can read and change it.

Hosted baseline refreshed 2026-10-31: [package 1](18-access-migration-baseline.md) confirms the eight existing stored booleans match the repository. Planned/proposed flags below remain absent; this is not a deployment record.

Reviewed 2026-10-31 against repository migrations and current product decisions. This inventory is grouped by database table and uses the latest names. It includes named boolean controls, permissions and proposed capability/state fields; it does not turn enum values, timestamps, function return values or frontend state into database flags.

**Existing** means a boolean column appears in repository SQL migrations, not a new verification of the hosted database. **Planned** means an accepted target absent from those migrations. **Proposed** identifies an unresolved physical structure/field design. **Rename pending** means the old column exists and the latest target name does not. Renamed proposal names are not extra columns or compatibility aliases.

There are eight migrated boolean columns: three on user_accounts, one on community_accounts, one on tenant_settings and three on tenant_staff_assignments (including the old can_create_admin name). After the report-permission consolidation, the staff target has thirteen flags: three existing concepts, one of them renamed, plus ten additions.

Sources: [schema](03-database-schema.md), [decision register](08-decisions-and-open-questions.md), [accepted access matrix](16-intended-access-matrix.md), and [repository migrations](../supabase/migrations/). Existing-versus-planned status was checked across all eight current SQL migration files. These checks do not apply migrations or establish hosted parity.

## user_accounts

Existing table. All three flags default true; their purposes are independent.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| `user_is_discoverable` | — | Existing | Include the global profile in authenticated global searches; false does not disable separately authorized community/activity access. |
| `enable_matchmaking` | — | Existing | Permit app-wide matchmaking and competitions. Opt-out revokes pending requests/suggestions, while retained accepted matches/entries keep their entrypoints. |
| `allow_direct_messages` | — | Existing | Control receipt of global DMs independently of search, matchmaking and community DM consent. |

## community_accounts

Existing table. The deployed show_global_profile column moves to the target table below. The staff-managed participant flag belongs in community_account_permissions.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| `has_disciplinary_restriction` | — | Planned | Current account-level disciplinary gate, default false. Cleared through can_discipline_users; historical records inform staff judgment rather than independent per-action gates. |

## community_account_preferences

Accepted target table, not yet migrated. One row per community account. Only the holder may read the raw values; eligible self edits and internal authorization checks retain their existing rules.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| `show_global_profile` | — | Move existing community_accounts column | Allow community-mediated global-profile reads through a qualifying shared community. Defaults false and resets false on inactivity; bilateral blocks still deny. |
| `allow_direct_messages` | — | Planned | Control incoming community DMs, including existing conversations, without deleting history. Defaults true; separate from the global preference. |
| `allow_private_invitations` | — | Planned | Allow new private invitations. Defaults true; disabling does not cancel existing invitations or participation. |

## community_account_permissions

Accepted target table, not yet migrated. One row per (tenant_id,user_id); only the account holder and authorized same-community permission managers may read the flag. The holder cannot grant it through a personal preference edit.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| `can_post_public_events` | — | Planned | Permit publication of user-organized community-public events. Defaults false; managed through can_manage_community_permissions, not by the account holder. |

## tenant_settings

Existing table. All five flags default false; edits require effective can_manage_settings.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| `auto_approve_users` | — | Existing | Automatically approve eligible joining requests; never-approved returners use the current setting. Does not bypass disciplinary clearance. |
| `pause_community_events` | — | Planned | Pause new non-staff community-public event/table creation. Existing activities and private creation remain; effective staff still need ordinary creation authority. |
| `allow_public_chat_visibility` | — | Planned | Allow non-members, including signed-out/pending/inactive viewers, read-only community-public chats; independent of activity visibility. |
| `allow_public_activity_visibility` | — | Planned | Allow non-member reads of community-account-hosted public activities and their agreed participant/queue/statistics fields. Official activities remain visible independently; chats have a separate flag. |
| `allow_public_directory_visibility` | — | Planned | Allow non-members to read minimal approved/suspended directory rows, without full community-profile access. |

## tenant_staff_assignments

Existing table. All permission flags default false for non-owner staff and are always true for owners. Effective use requires an active assignment and approved community standing. Ordinary permission editing is owner-controlled except the two delegated audit flags.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| `can_approve_users` | — | Existing | Approve pending applications requiring first approval. Previously approved unrestricted members can return without this permission. Does not itself clear discipline or restore staff. |
| `can_grant_staff` | `can_create_admin` | Rename pending | Create/invite admins, manually resume paused assignments, inspect assignment lists/permissions and manage the two audit flags. Revoked reappointment remains owner-reviewed. |
| `can_modify_content` | — | Existing | Create/edit/reset approved website text overrides; no tenant-detail, settings, staff or disciplinary authority. |
| `can_discipline_users` | `can_remove_users`; absorbs former `can_handle_reports` proposal | Planned; renamed/expanded proposal | Read/acknowledge/resolve same-community reports and permitted evidence; suspend/remove non-owner accounts and clear restrictions. Reports are normal workflow, but direct action is allowed. Active/paused staff targets require can_discipline_staff too; evidence, audit-history and owner boundaries remain. |
| `can_discipline_staff` | `can_revoke_staff` | Planned; renamed proposal | Discipline/revoke non-owner staff authority, independently of community participation; also required for community suspension/removal of active/paused staff. No separate staff suspended status is introduced. |
| `can_manage_community_activities` | `can_manage_community_events` | Planned; renamed proposal | Cancel/archive unofficial community-public events/tables and moderate their public chats; no general resource editing or private-chat moderation. |
| `can_manage_official_activities` | `can_manage_official_events` | Planned; renamed proposal | Create/manage official events/tables and moderate their public chats; preserves independent private-data and participation boundaries. |
| `can_manage_community_permissions` | — | Planned | Grant/revoke participant permissions such as can_post_public_events; does not grant staff-permission editing. |
| `can_see_private_events` | — | Planned | Read same-community private events/tables/invitations and ordinary chat content. Excludes exact private addresses, DMs and write/moderation authority. |
| `can_manage_settings` | — | Planned | Edit community operational settings, including approval, creation pause and public visibility flags; no tenant identity, staff grants or archive/restore authority. |
| `can_moderate_all_chats` | — | Planned | Moderate all non-private community chats without activity-management flags. Discussion includes hide/unhide/inspection/lock/move, never rewriting others; private chats/DMs excluded. |
| `can_audit_community_accounts` | — | Planned | Read the community-account approval/disciplinary history category, including its shared-category records. Does not grant disciplinary actions. |
| `can_audit_staff_accounts` | — | Planned | Read the staff creation/disciplinary history category, including its shared-category records. Does not grant current full-permission inspection or permission editing by itself. |

## community_standing

One application-wide `public.community_standing` table defines standing capabilities for every community. Signed-out and signed-in clients may read all definitions. Only migrations may change them. This access model was accepted on 2026-11-03. The capability columns below are migration targets.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| `enable_standard_chat_visibility` | `enable_chat_visibility` | Proposed | Baseline member access to standard community chat reads; public fallbacks, private resource audiences and retained history are evaluated separately. |
| `enable_standard_activity_visibility` | `enable_activity_visibility` | Proposed | Baseline member access to standard activity reads; independent public visibility and resource restrictions still apply. |
| `enable_other_profile_visibility` | — | Proposed | Baseline eligibility to inspect other community profiles; does not grant global-profile access. |
| `enable_own_profile_management` | `enable_profile_management` | Proposed | Allow own curated community-profile management: proposed true for pending/approved/suspended and false for inactive. |
| `enable_standard_participation` | `enable_participation` | Proposed | Baseline ordinary community-public participation/shared-chat eligibility. Suspended false must not block private activities or automatically cancel existing public commitments; final mapping must preserve those exceptions. |
| `enable_standard_dms` | enable_standard_DMs (spelling) | Proposed | Eligibility to create/use own community DM conversations and send/receive new messages; consent/blocks remain independent and false does not erase authorized history. |

## tables

Planned activity table. These flags have accepted behavior but no repository migration.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| `allow_guests` | — | Planned | Allow new guest bookings; default true. Existing bookings survive a switch to false unless the manager explicitly removes selected guests. |
| `manually_confirm_seats` | — | Planned | Default false: automatically process eligible whole groups by capacity/queue rules. True: managers explicitly approve/reject; switching to automatic processes the queue transactionally. |

## direct_conversation_user_states

Proposed physical table supporting accepted private DM notification/read-state behavior.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| `is_muted` | — | Planned | Private per-conversation mute, default false, suppressing DM alerts until changed. Preserves unread state, history and independent sending/receiving consent. |

## event_message_moderations

Proposed physical table. Setting shared hidden state requires authorized public-chat moderation.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| `is_hidden` | — | Proposed field | Shared event-chat hiding state; missing moderation row means visible. Hidden chat messages remain expandable by authorized readers, and neither hide nor expansion rewrites content/evidence. |

## table_message_moderations

Proposed table equivalent of event-message moderation; private chats remain outside staff shared moderation.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| `is_hidden` | — | Proposed field | Shared table-chat hiding state, with the same authorized-reader expansion and evidence preservation as event chat. |

## match_players

Conceptual competition result table; detailed competition schema remains separate work.

| Latest flag name | Previous name | Status | Purpose |
| --- | --- | --- | --- |
| Winner indicator — name not specified | — | Unspecified proposal | The schema sketch includes a winner flag alongside score/placement. No final SQL column name, boolean representation or default has been approved. |

## Existing tables without boolean flags

These tables exist in repository migrations but have no current or explicitly named planned boolean columns in the reviewed contracts. Tenant lifecycle, staff status and similar enums are not additional flags.

| Table | Flag inventory |
| --- | --- |
| `tenants` | None; `operational_status` is a status value, not a boolean |
| `user_account_profiles` | None |
| `community_account_profiles` | None |
| `tenant_website_content_overrides` | None |
| `tenant_admin_actions` | None |

## Superseded and spelling-only names

Report handling was folded into can_discipline_users on 2026-10-31. The never-migrated can_handle_reports is omitted from the target and has no compatibility alias. See [combined report and discipline authority](16-intended-access-matrix.md#report-handling-and-direct-discipline--accepted-2026-10-31).

| Table / scope | Earlier name | Latest treatment |
| --- | --- | --- |
| `community_accounts` | `is_active` | Earlier unmigrated proposal, superseded by the standing lookup/inactive standing direction; not a second active flag to carry forward |
| `tenant_staff_assignments` | `can_manage_events` | Superseded by separate `can_manage_community_activities` and `can_manage_official_activities`; not an extra retained permission |
| `community_standing` | `enabler_standard_activity_visibility` | Typographical variant normalized to `enable_standard_activity_visibility` |
| Global competition participation | Separate `enable_competitions` | Not adopted; `user_accounts.enable_matchmaking` governs global matchmaking and competitions |

The table lookup's plural naming and the final private-activity capability mapping remain design work; do not silently rename it or add a guessed private-participation flag. Boolean columns for Discussion withdrawal/locking, invitation activity, read receipts, winner state or archive state are not invented here: several corresponding behaviors are agreed, but their physical representation is not yet settled. Personal message hides and blocks are represented by relationships/rows in the current design, not additional named booleans.

## Derived boolean fields — view, not table flags

`my_community_summaries` is an existing view. These are computed caller-relative results, not stored settings or client-writable columns.

| Field | Purpose |
| --- | --- |
| `is_owned` | Caller owns the returned community |
| `is_managed` | Caller has the qualifying staff-management relationship |
| `is_member` | Caller has the qualifying community-account relationship |

The current view's old predicates are implementation evidence, not the future canonical owner/staff/standing rules. The authorization redesign must reconcile them with the accepted access matrix.

## Development-only compatibility policy

The root [AGENTS.md](../AGENTS.md) now states that the app remains in development: do not introduce backward compatibility for previous implementations, and remove compatibility mechanisms when discovered. When a transition to live production with real users is proposed, remove those development-only instructions and define the production migration/compatibility policy at that point. Renamed fields above describe the migration target, not aliases to keep supporting. Coordinated updates of current callers and preserving required data/history are distinct from supporting obsolete interfaces.

This inventory and policy update make no application, SQL migration or hosted database changes.
