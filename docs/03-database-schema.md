# Database schema plan

Status: proposed relational design for the supplied MVP; not executable SQL.

## Conventions and tenant boundary

Propose community = tenant. Every business table carries `tenant_id`; global auth/account identity is an explicit exception. Use UUID IDs, database-managed timestamps, `timestamptz` instants, and an IANA community timezone (proposed launch value `America/Tegucigalpa`). Use HNL minor units for monetary values, with currency stored explicitly. Prices are configurable.

All cross-entity references within a tenant use composite foreign keys to matching unique keys, such as `(tenant_id, activity_id)`. RLS controls access; these constraints prevent structurally invalid cross-tenant references.

## Identity and entitlement

| Table | Main fields / invariant |
| --- | --- |
| `tenants` | ID, slug, name, timezone, operational status |
| `user_accounts` | Auth user PK/FK, private account preferences; self-only |
| `community_accounts` | Composite PK tenant/user; role and standing (pending/approved/suspended/removed); includes nonpaying users |
| `profiles` | Composite FK to community account; display name, photo reference, general location, bio, experience, play style, teaching flags |
| `interests`, `profile_interests` | Tenant-scoped tags and unique user/tag assignments |
| `membership_entitlements` | Tenant/user, status, effective start/end, source, granting actor, reason; membership access independent of payment |
| `membership_plans` | Tenant, name, proposed price/currency, benefit configuration; version relevant commercial terms |
| `payment_records` | Tenant/user, purpose, amount/currency, reference, pending/verified/rejected/refunded status, verifier and timestamp |

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
| `admin_actions` | Append-only actor/action/target/reason/time and safe metadata; restricted staff reads |

Table chat is MVP. Broad DMs are not. Reports/blocks are proposed additions, not silently mandatory from the handoff. Content removal and suspension are required admin capabilities. Keep no-show records internal; avoid public person scores.

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
- Index community-account/entitlement checks, activity browsing by tenant/kind/status/time, participation by activity/state and user, FIFO queue ordering, message pagination, championship result state, and notification recipient.
- Check actual query plans; index foreign-key access paths and deterministic queue ordering (time plus ID).
- Lists explicitly omit exact address data; protected address access is verified separately.

## Migrations, lifecycle, and analytics

Suggested sequence: identity/tenant/entitlement → activity subtypes/location separation → participation/admission/waitlist → chat/notifications → championship → Community/moderation/profile statistics. Every exposed table ships with grants, policies, and role tests.

Use two tenants and sample nonmembers, active/expired/suspended members, hosts, admins, and paid championship-only entrants. Seed fake addresses and manual payment records, never real home data.

Attendance supports distinct co-players and engagement metrics; deduplicate pairs per community and avoid counting reservations/no-shows as played games. Verified payment records support paid-member/revenue reporting; complimentary grants do not create MRR.

Archive events/tables and preserve result/audit history. Decide account anonymization, chat/message retention, address deletion after an activity, and championship retention before production. Avoid broad deletion cascades until these rules are approved. Generate frontend database types from migrations and test both clean installs and upgrades.
