# PWA and delivery plan

Status: mobile PWA and product scope established; rollout and offline policy proposed.

## Mobile experience

Deliver the same responsive application in browser and installed mode, with community-scoped Community Home, Meet & Play, Championship, Discussion, and Profile navigation, plus separate personal My Home/My Communities links. My Home is the application landing page; the personal pages start as stubs and gain data as prerequisite features arrive. Include manifest/icons, HTTPS, sensible install guidance, deep links, and safe update behavior. Browser/platform installation behavior varies; see [MDN PWA documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps).

Mobile layouts, form ergonomics, accessible controls, and safe-area handling start in the first slice. No separate native app is planned.

## Offline and private data

Propose a cached application shell and non-sensitive offline fallback. Do not persist private addresses, messages, profiles, membership/payment details, or API responses in a service-worker cache. Joining, approving, rejecting, sending messages, and submitting/confirming results require server confirmation.

Notify users when disconnected without suggesting a seat or result has been accepted. Lost responses require reconciliation after reconnect. Offline writes/background sync are deferred unless explicitly designed; push is an open channel choice.

On account/tenant switch, suspension, cancellation, or resource-access change, clear affected query state and subscriptions. Backend policies deny subsequent unauthorized access. Already viewed data cannot be recalled from a person's memory or guaranteed remotely erased offline.

## Notifications and updates

Requests, automatic confirmations, manual approvals/rejections, and issue notices need prompt in-app updates. Commit decision history and the recipient notification together; a rejection notice includes timestamp, rejecting user, and optional reason. External delivery uses a retryable outbox and safe resource links, without addresses/message previews. There are no current seat offers, claim/response windows, or reservation-expiry workers.

Offer app updates at a safe moment. Keep database contracts compatible with installed old versions for an agreed support window. Test callback URLs, sign-in return, protected deep links, reconnect, and update behavior in both browser and installed modes.

## Incremental delivery

These milestones sequence the current product build. Payment/member functionality is explicitly absent until a late stage, not simulated or manually enforced as a prerequisite.

| Milestone | Scope | Exit evidence |
| --- | --- | --- |
| 0. Rules and UX | Current standing/privacy/capacity rules; automatic/manual confirmation and mobile flows | Agreed transactional states, queue edits, and decision notices; no commercial blockers |
| 1. Foundation | Auth, community association/approval, admin audit, navigation, safe profiles | Two-tenant isolation and pending/approved/suspended behavior without member gates |
| 2. Private table slice | Table creation, per-person/group reservations, automatic/manual confirmation, cancellation, first-fitting queue order, guest management | Atomic confirmations, edit-priority rules, rejection history/notifications, capacity races, address protection |
| 3. Official-event funnel | Community Home feed, event list/calendar, per-attendee registrations, guest sponsorship, associated tables | Event approval precedes table seating; no payment/member checks |
| 4. Communication and Community | Table chat, notifications, minimal topics/posts/directory, content removal | Confirmed-only chat, revocation, moderation |
| 5. Championship | Entry, rules/results/standings/Final Table/history as separately reviewed | Independent eligibility/result validation; no paid entry gate in this phase |
| 6. Complete pilot | Profile/activity views, attendance, PWA refinement, operating procedures, real-device checks | Complete MVP journeys and founder/admin readiness |
| 7. Late commercial stage | Design/implement payments and paid memberships only when scheduled | Revisit pricing, verification, entitlements, refunds, and any commercial holds together |

If scope must shrink, make an explicit product decision. Do not relabel Championship, chat, Community, or waitlists as future features solely for implementation convenience.

## Acceptance matrix

| Scenario | Required outcome |
| --- | --- |
| Visitor browses Community Home | Only official public summaries; no home address/member table feed |
| User opens My Home | Personal stub initially; future feed aggregates only authorized updates/RSVPs/suggestions across related communities |
| User opens My Communities | Clearly marked stub initially; future list distinguishes ownership/management from community participation |
| Approved account registers for an event | Standing/approval and capacity govern participation; no payment or entitlement required |
| Authorized account creates private table | Safe listing; exact address available only after confirmed seat or authorized host/admin access |
| Pending request/waitlist | No participant-only address/chat access; no response countdown or payment state |
| Groups compete for final seats | Atomic whole-group confirmation without overbooking; automatic FIFO among groups that fit |
| Queue capacity becomes available | Automatic tables promptly confirm eligible non-withdrawn groups; manual tables remain for manager decision |
| Manager switches manual → automatic | Modal explains automatic processing of the existing queue in receipt order as whole groups fit. Continue submits the switch and processing; Cancel closes the modal, keeps manual mode true, and makes no queue changes |
| Manager rejects / raises an issue | Rejection clears the queue and immediately shows timestamp/actor/optional reason to the booker; issue notice leaves the request pending without a deadline |
| Waiting group edited | Names/removals keep priority; additions reset it after explanation; stale group revisions cannot confirm |
| Event/table cancelled | Retain per-person registration/participation rows unchanged; show resource cancellation separately. Event cancellation notifies queued/confirmed registrants with timestamp/actor/optional reason; recommended lifecycle guards stop new booking/approval/promotion and obsolete reminders |
| Cancelled event listed / archived | Cancelled filter available to community users; archive eligible only with no registrations at cancellation or 30 continuous cancelled days. Archived filter and event access restricted to same-community staff, including direct links; private-audience interaction and archive actor/trigger remain to settle |
| Community/table access revoked | Further protected reads/sends denied, client state/subscriptions cleared |
| Account enters championship | Separate competition eligibility without paid-membership or fee gates; other feature privacy retained |
| Match disputed or corrected | Prior counted result invalidated, confirmations versioned, standings rebuilt |
| Mobile sign-in/deep link/offline/update | Predictable navigation and honest pending/failed state |
| Attendance analytics | Counts actual attended activity, not reservations; deduplicates co-players |

Exercise desktop keyboard use, iOS Safari/installed mode, and Android Chrome/installed mode. Set supported versions before pilot. Test two tenants and direct API/RPC/Realtime paths, not just hidden UI controls.

## Before production and validation

Choose hosting and separate environments, manage secrets, automate build/lint/database checks, configure safe diagnostics, and verify backup/restore. Define account deletion, address/message retention, staff access and operational ownership. Refund support belongs to the deferred commercial stage.

Collect only useful validation data: member activity, table fill, distinct co-players, conversion, and championship participation. Payment/member conversion and revenue reports are deferred. Start with simple administrative reports; a broad analytics dashboard is eventual.

Success includes members making friendships beyond the app. The pilot should test whether ongoing access to new players and activities remains valuable after those friendships form.
