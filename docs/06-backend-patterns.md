# Backend code patterns

Status: proposed standards and command contracts; unresolved operating rules remain in the decision register.

## Execution boundaries

Use caller-scoped Data API reads and narrow permitted edits. Seat confirmation, group edits, cancellation, manager decisions, competition confirmation, and admin corrections use database transactions. Derive the actor from verified identity, not request parameters; check live tenant standing, resource participation, and operation-specific permission. Payments and paid memberships are deferred: do not query entitlements or require payment verification for current functionality.

## Event/table rules — confirmed 2026-10-12

Events and tables are distinct resources; see the [schema direction](03-database-schema.md#events-tables-locations-and-seats). An attached table belongs to the same tenant, and creation/linking requires event-organizer authority. A manager's cancellation power over publicly posted user events does not authorize editing them or adding tables.

Published community events have visitor-readable safe summaries. Participating account holders and guest-booking sponsors must be approved and non-banned; private audience checks still apply. Use one event registration per attendee and one table participation per person, with booking responsibility separate from attendance. Guest names are optional; a sponsor may register only guests without attending or occupying a seat.

Event-table participations reference each occupant's exact approved registration in that event and tenant. Standalone participations store attendee account/optional guest name directly. Cancelling a registration releases only its linked table reservations; explicit group cancellation covers the selected registrations and linked seats. Withdrawn/rejected/cancelled requests cannot be automatically restored by a retry or promotion worker.

New guest bookings and resubmissions require `allow_guests = true`; disabling it leaves existing requested/waitlisted/confirmed bookings unchanged. Serialize flag edits and booking creation on the table. Optional guest-removal controls call a separate authorized cancellation command for selected table participations, preserving event registrations and other-table bookings. Cancel the selected rows transactionally and re-evaluate the remaining group under the current confirmation mode. Neither private-view permission nor cancellation-only event moderation grants table-management authority.

### Confirmation modes and group transactions

`tables.manually_confirm_seats` is non-null and defaults false. When false, process requests immediately and automatically confirm eligible, non-withdrawn whole groups that fit; re-run allocation when capacity/eligibility changes. When true, only an authorized table manager may approve a queued request. The manager may select requests for approval/rejection or notify the booking account of an issue at their discretion; FIFO does not force a manual decision. Approval directly confirms the group with no further action by the booking account.

Every confirmation loads the full persisted group/revision, locks the table and relevant registrations, checks the table and parent event lifecycle, current mode and actor authority, standing, exact event/tenant links, applicable guest rules, and full capacity, then confirms all people or none. Serializing confirmation with group edits, withdrawal, rejection, mode changes, and resource cancellation prevents stale approvals. Manual approval cannot exceed capacity or bypass event registration. A client loop of per-person RPC calls does not satisfy atomic acceptance.

After the manager chooses Continue in the manual-to-automatic confirmation modal, an authorized command sets `manually_confirm_seats = false` and processes already queued requests using the standard automatic allocator. Proposed transaction contract: serialize the setting change and initial queue pass with other seat/mode/group changes, preserve current queue order, and confirm eligible whole groups that fit, recalculating capacity after each group. Skip non-fitting groups without resetting their priority; never restore withdrawn/rejected requests or let a concurrent new request bypass an older fitting group. Commit the setting, resulting confirmations, and durable notifications together; failure before commit leaves the setting and queue unchanged. Retries return the committed outcome without duplicate confirmations/notices. Cancel or dismissal before submission sends no mutation command and leaves manual mode enabled.

Current states are requested/waitlisted/confirmed/rejected/cancelled; exact display mapping can distinguish awaiting manager review from waiting for capacity. Pending rows consume no capacity. Only confirmed participations consume table seats, one per person. Event attendance capacity is separate. No initial offered state, seat-claim endpoint, response deadline, reservation-expiry worker, payment hold, or payment-pending state is needed.

### Queue allocation and pending-group edits

Automatic allocation is first-come, first-served among eligible whole requests that fit. Under the capacity lock, scan server-assigned queue order with a stable tie-breaker; skip a group that does not fit without resetting its position, confirm the earliest one that does, recalculate capacity, and continue. New instant requests cannot bypass an older eligible fitting request. Concurrent allocators must share this ordering/locking protocol. On a manual table, capacity changes refresh the queue but do not confirm anyone without a manager decision.

Keep queue priority for optional guest-name edits and removals from a waiting group. Additions reset the enlarged group's queue timestamp to the new submission time; the UI explains this before saving. Apply edits and request-revision updates atomically, revalidate eligibility and new-guest restrictions, and reject stale decision payloads. Removing all people withdraws the request. Pending-group edits do not imply splitting a group during confirmation.

Use durable submission/idempotency keys so retries return the existing outcome rather than duplicate unnamed guests, issue duplicate notices, or restore a terminal request. Explicit resubmission after rejection/cancellation gets a fresh queue timestamp and request revision; preserve prior decision history. If recipient-confirmed offers are introduced later, group edits must also invalidate/revalidate their reserved capacity and prevent claiming an old group; no such offer flow ships now.

### Manager decisions and notifications

Approving a manual request confirms the entire current group. Rejecting it marks all its participations rejected and removes it from active queue queries entirely; it can never be promoted without an explicit new submission. Keep immutable decision history for the affected request/group revision, including server timestamp, rejecting global user, and optional reason. Keeping historical rows is not keeping the rejected request in the queue.

The booking account receives prompt approval/rejection notifications after commit. A rejection notice includes decision timestamp, rejecting user's safe display identity, and the reason when supplied; do not expose staff email/private profile fields. Persist the decision and in-app notification in the same transaction, and queue any external delivery through a deduplicated outbox. Publish only committed outcomes, with retries after delivery failure; external channel/transport latency is not a reason to delay the in-app decision.

An issue-notification action sends a resource-scoped notice to the booking account while leaving the request queued. It creates no response timer, automatic rejection, or new general-purpose DM feature. An explicit manager rejection differs from notifying about an issue.

### Invitations, oversight, and cancellation

New private invitations check the recipient's `allow_private_invitations` preference (default true). Disabling it affects new invitations only. Existing invitation acceptance still checks ordinary invitation revocation/expiry, standing, and registration rules; invitation expiry is independent of the removed seat-offer/response window.

For community-account-published events, `can_manage_events` permits cancellation only in place of the former deletion operation, with no hard delete; archive authority remains to settle. `can_see_private_events` permits same-tenant private event/invitation/table and table-chat reads without participation, not chat writes or private-address reads. Participant-permission grants use `can_manage_community_permissions`; staff-permission edits remain owner-only.

### Event cancellation and archive commands

All events may be cancelled, and no event is hard-deleted. Event cancellation changes the event lifecycle and records server timestamp, initiating global user, and optional reason. It must not update `event_registrations` or `table_participations`, even to mark them cancelled or touch audit timestamps. Table cancellation likewise preserves these per-person records. Explicit cancellation of an attendee's registration/seat remains a separate command with the already-defined linked-seat consequences.

Persist cancellation and notifications for queued/confirmed registrants atomically, using the registrations visible at that transaction. Preserve safe cancellation details for notification delivery and audit; archive must not rewrite them. Recommended routing includes guest sponsors and any distinct attending account, deduplicated per cancellation/user, with retries returning the original outcome. Suppress later event reminders and check current resource lifecycle before delivering stale queued reminders or inviting/confirming someone.

An event is eligible for archive only while cancelled and either it had no registrations at cancellation or it has remained cancelled for at least 30 days. Record the no-registration predicate at cancellation and check the elapsed interval with server time, not the client clock or current row counts. The precise definition of no registrations, archive actor, and manual versus scheduled archival remain open. Repeated cancellation requests must not reset the cancellation timestamp or the archive clock.

Archive preserves the event and per-person records. Deny ordinary non-staff archived-event reads through lists, direct IDs, joins, feeds, and Realtime; only same-community staff see the Archived filter. Staff read access is not write authority. Private-event visibility and `can_see_private_events` interactions require the explicit decision tracked in the schema.

Recommended child-table behavior: keep their own stored lifecycle unchanged and derive unavailability from the cancelled/archived parent. Block new registrations/invitation acceptance, table requests, manual approval, automatic allocation, and confirmation-mode switches that would allocate seats while the resource or its parent is unavailable. Keep preserved booking rows out of actionable queues and upcoming activity; do not record attendance/no-shows from cancellation. Use a shared locking/check order for event cancellation and attached-table seat commands so no confirmation can commit after cancellation using a stale parent state. No cascade to standalone tables or unrelated events is implied.

Table archive parity, reopening, chat retention after cancellation, and the archive/privacy interaction remain open in the [schema follow-ups](03-database-schema.md#follow-up-design-questions). Payment/refund handling remains deferred.

## Seat state machine — current direction

| Operation | Transition / check |
| --- | --- |
| Automatic request or queue promotion | On `manually_confirm_seats = false`, eligible current whole group → confirmed immediately if its queue order and full capacity permit; otherwise remain queued without deadline |
| Manual request | On `manually_confirm_seats = true`, persist group for manager review; no seats consumed |
| Manual → automatic | Manager's Continue authorizes submission; server checks table-management authority, switches to false, and processes the existing queue in receipt order among eligible whole groups that fit. Cancel before submission leaves true and performs no queue processing |
| Manager approves | Current queued group → confirmed atomically if authorized, eligible, and all seats fit; no booker reconfirmation |
| Manager rejects | Current queued group → rejected in full; remove from active queue and notify booker with timestamp/actor/optional reason |
| Manager notifies about an issue | Request remains queued; send scoped notice without response deadline or automatic state transition |
| Edit guest name / shrink waiting group | Preserve priority, revise group atomically, re-evaluate under the current mode |
| Enlarge waiting group | Revalidate all added people; reset queue timestamp for the enlarged group after explaining the effect |
| Withdraw / cancel | Cancel selected people or explicit whole request; release confirmed seats and re-run automatic allocation where applicable |
| Event attendance cancelled | Cancel the person's registration and linked table participations; preserve history |
| Event/table cancelled | Retain every registration/participation row unchanged; record resource cancellation and notify queued/confirmed event registrants. Recommended: stop related participation commands and derive attached-table unavailability from the parent |
| Cancelled event archived | Require no registrations at cancellation or at least 30 continuous cancelled days; retain history and per-person rows; event visible only to same-community staff, with private-audience interaction still to settle |

Conceptual commands include create_event, register_for_event, create_table, request_seats, edit_pending_group, confirm_eligible_groups, approve_table_request, reject_table_request, notify_table_request_issue, cancel_participation, cancel_event, cancel_table, and archive_event. These are examples, not final SQL signatures. Commands operate on persisted request/group revisions, not arbitrary subsets chosen for approval.

## Membership and manual payments

Deferred until one of the last implementation stages. Current functionality behaves as though payments and paid memberships do not exist: no checkout, payment simulation, verification, entitlement gates, commercial grace periods, or membership-dependent permissions. This does not remove community association/approval or privacy checks. When commercial work is scheduled, design payment evidence, entitlement dates, refunds, and any hold policy together; they are not prerequisites for current event/table flows.

## Address, chat, and content

Address retrieval checks host, confirmed participation, or separately authorized admin plus tenant, standing, and resource/parent lifecycle. A preserved confirmed row alone cannot prove current participant access after resource cancellation; cancellation chat/address policy is tracked in the schema follow-ups. `can_see_private_events` alone never satisfies an address-access check. Private address tables are absent from general queries and notification payloads. Private data must not leak through helpers/views/Realtime even if the UI is correct.

Messages are stored durably before delivery. Authorize reads and sends separately: same-tenant staff with `can_see_private_events` may read private-table chat messages without participating, but sending still requires independent write authority. Validate size, content format, participant identity, and chat lifecycle. Deduplicate retried sends using a unique sender/table/client-message key. Removal/redaction is auditable. Attachment support is not assumed.

Use private storage for restricted assets and short-lived authorized access when appropriate. Do not make profile or chat media globally readable by accident. Rate limits and moderation controls should address the selected posting/chat surfaces without treating payment as a trust guarantee.

## Championship result protocol

1. An eligible match participant submits a versioned result with eligible players, scores/placements, date, and applicable rules version.
2. Another participant independently confirms or disputes that exact version. Self-confirmation cannot satisfy the rule; required quorum beyond one other participant remains open.
3. Only confirmed current, nonvoid versions count toward standings.
4. A dispute removes the result from counted standings while unresolved; define dispute deadlines and re-opening rules.
5. Authorized corrections produce a new version and invalidate earlier confirmations. Admin adjudication is explicit and audited.
6. Recompute the standings projection deterministically and finalize finalists/achievements through controlled commands.

Store validated scoring parameters rather than arbitrary code. Lock/freeze the effective rules for accepted results; changing rules requires an explicit version/recalculation policy. Do not hard-code one game's formula throughout UI and SQL.

Nonmember competition access uses entry eligibility, not paid-network entitlement. Qualification need not reference a Meet & Play table. Final location follows the same private-address rules as other official events.

## Reliable work and notifications

Write a notification/outbox record in the same transaction as a seat offer, request decision, or other important committed state. A worker delivers/retries with deduplication, backoff, and monitoring. A delivery failure must not roll back a valid seat or fabricate delivery success.

Automatic queue allocation must run promptly when requests, eligibility, or capacity change, with durable retry if asynchronous work is needed. There is no current waitlist-offer expiry or expired-claim worker. Chat archival and invitation expiry remain separate lifecycle concerns. The in-app inbox carries committed decisions immediately; external email/push choices remain open.

## SQL, errors, and deployment

Version tables, constraints, indexes, grants, RLS, functions, and generated types. Use operation-specific policies and protected-column rules. Prefer invoker execution; definer helpers require qualified references, fixed search path, restricted owner/execution, and explicit authorization. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Return stable domain outcomes. Log safe correlation IDs and diagnostics, excluding credentials, exact private addresses, payment proof, and unnecessary personal data. Limit payloads and never retry unauthorized/invalid operations indefinitely.

Use additive migrations compatible with existing installed PWA versions. Test clean installs and upgrades. Document forward repair and backup/restore before production.

## Required tests

These are acceptance requirements for future implementation, not tests claimed to exist today. Use real anonymous/authenticated roles across two tenants, including approved/pending/suspended accounts, nonattending sponsors, named/unnamed guests, table managers, and staff with each flag independently.

- Prove one registration/participation per person, exact same-event/tenant links, duplicate seat rejection, guest-only booking without sponsor attendance, and idempotent retries.
- Cover default automatic mode, immediate confirmation, FIFO among groups that fit, skipped-group priority, capacity freed by cancellation, and concurrent allocators without overbooking or duplicate confirmation.
- Cover manual mode never auto-confirming, manager selection/approval/rejection/issue notices, insufficient-capacity rollback, withdrawn requests, and rejection disappearing from active queues without deleting decision history.
- Cover manual-to-automatic switching: opening/Cancel/dismiss leaves true and the queue unchanged; Continue processes existing eligible groups in current receipt order. With three seats and queued groups of four, two, and one, confirm two then one while retaining the four-person group's priority. Verify authorization, transactional rollback, concurrent edits/withdrawals/new requests, and idempotent retry without duplicate notices.
- Verify a rejection notice contains timestamp, rejecting user, optional reason only when supplied, and reaches the booking account promptly after commit. A failed transaction emits no decision notice; retries do not duplicate it.
- Confirm name edits/removals retain queue priority, additions reset it, stale revisions cannot be approved, and concurrent edits/withdrawal/rejection versus confirmation cannot accept an old or partial group.
- Preserve existing bookings when `allow_guests` becomes false, reject new guests/resubmissions while false, and test explicit selected removal affecting only that table. UI cases include keep-all/dismiss, no guests, failed removal, and ordinary management access.
- Test absence of payment/member gates, checkout, payment verification, offers, response deadlines, and reservation-expiry behavior in current flows. Do not use a synthetic "paid member" flag to bypass authorization.
- Preserve private-address/chat boundaries, private-view staff chat reads without writes/addresses, invitation-preference behavior, organizer-only event-table creation, and cancellation-only public-user-event moderation.
- Verify event cancellation/archival and table cancellation leave all registration/participation rows byte-for-byte unchanged, retain cancellation attribution/reason, notify queued/confirmed registrants once after commit, and never restart the archive clock on retry. Test a concurrent registration/cancellation and stale table-approval/promotion requests.
- Test immediate archive eligibility from the cancellation-time no-registration snapshot, the exact 30-day boundary for nonempty events, rejection of early archival, Cancelled list access, and denial of archived reads to non-staff organizers/attendees across all API paths. Add private-audience and archive-actor cases once those policies are settled.
- Retain the independent championship result/confirmation/dispute and standings tests when that domain is implemented; its redesign remains separate. Verify content/notification isolation and cancellation revoking protected access.

Deferred offer-expiry, payment verification, and entitlement-lapse tests belong with those future features. Elevated-only tests cannot prove RLS.
