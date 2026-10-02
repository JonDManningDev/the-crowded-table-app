# Backend code patterns

Status: proposed standards and command contracts; unresolved operating rules remain in the decision register.

## Execution boundaries

Use caller-scoped Data API reads and narrow permitted edits. Use database transactions for entitlement grants, seats/requests/offers, manual admission verification, competition confirmation, and admin corrections. External delivery/payment integrations belong in a trusted worker or Edge Function when needed.

Derive actor from verified identity, not request parameters. Validate tenant/resource IDs, community standing, entitlement or resource admission, and operation-specific permission. Never use a service credential simply to avoid policy design.

## Seat state machine — proposal

| Operation | Allowed transition / check |
| --- | --- |
| Instant member join | Eligible member → confirmed if capacity; otherwise offer waitlist |
| Request seat | Eligible member → requested; request does not occupy capacity |
| Host accepts | Requested → confirmed under lock if eligible/capacity; otherwise remain pending or offer waitlist per agreed UX |
| Host declines | Requested → declined; no address/chat access |
| Join FIFO waitlist | Eligible participant → waitlisted with stable queue order |
| Offer vacant seat | Earliest eligible waitlisted → offered with expiry; proposal reserves capacity |
| Claim offer | Offered → confirmed after current eligibility/admission check before expiry |
| Offer expires | Offered → expired; release hold and offer next eligible user |
| Paid official reservation | Payment_pending until trusted verification; optional bounded hold policy must be chosen |
| Cancel | Confirmed/requested/waitlisted/offered/payment_pending → cancelled; release any seat/hold and queue promotion |
| Event cancelled | Stop admission, cancel pending offers, notify affected users, apply refund policy once defined |

Request-based waitlist promotion must retain host approval; exact ordering of approval versus offer is open. Guest offers need a usable payment/verification window. Neither rule can be silently replaced with instant joining.

All capacity paths lock the same activity row and use the same count of confirmed seats plus unexpired holds. Capacity edits cannot reduce below committed occupancy. Eligibility checks happen again on acceptance/claim, not only when the user entered the queue. A requested seat must not be accepted twice. Define whether the host consumes capacity before implementation.

Conceptual command family: create_member_table, take_seat, request_seat, accept_request, decline_request, join_waitlist, claim_offer, cancel_participation, verify_official_admission. These are examples, not final SQL signatures.

## Membership and manual payments

grant_membership/revoke_membership requires authorized staff, effective dates, reason, and an audit record. Payment verification records the source and verifier, then applies admission/entitlement atomically. Duplicate verification cannot create duplicate seats, extend a period twice, or admit a person into an unrelated tenant/resource.

A pending payment does not grant private content or address access. Prices are server-controlled and versioned/snapshotted at admission; callers cannot submit their own amount or membership flag. Define refunds, special-event discounts, lapse, and paid-through behavior before implementing these paths. Provider integration is optional; correct manual workflow is not.

## Address, chat, and content

Address retrieval checks host, confirmed participation, or authorized admin plus tenant and standing. Private address tables are absent from general queries and notification payloads. Private data must not leak through helpers/views/Realtime even if the UI is correct.

Messages are stored durably before delivery and require authorized current table access on read/send. Validate size, content format, participant identity, and chat lifecycle. Deduplicate retried sends using a unique sender/activity/client-message key. Removal/redaction is auditable. Attachment support is not assumed.

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

Waitlist expiry and chat archival need scheduled execution. Commands also check timestamps directly so late workers cannot allow expired claims or writes. Choose the scheduler/channel before deployment. In-app inbox is the baseline proposal; email/push choices remain open.

## SQL, errors, and deployment

Version tables, constraints, indexes, grants, RLS, functions, and generated types. Use operation-specific policies and protected-column rules. Prefer invoker execution; definer helpers require qualified references, fixed search path, restricted owner/execution, and explicit authorization. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Return stable domain outcomes. Log safe correlation IDs and diagnostics, excluding credentials, exact private addresses, payment proof, and unnecessary personal data. Limit payloads and never retry unauthorized/invalid operations indefinitely.

Use additive migrations compatible with existing installed PWA versions. Test clean installs and upgrades. Document forward repair and backup/restore before production.

## Required tests

Use real anonymous/authenticated roles with two tenants. Cover concurrent final-seat claims, host accept vs instant join, cancellation vs claim, expired offers with delayed workers, duplicate payment verification, entitlement expiry, chat revocation, cross-tenant foreign keys/RPC, protected addresses, guest competition access, duplicate/self-confirmation, corrected/disputed results, and deterministic standings. Elevated-only tests cannot prove RLS.
