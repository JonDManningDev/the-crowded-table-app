# PWA and delivery plan

Status: mobile PWA and product scope established; rollout and offline policy proposed.

## Mobile experience

Deliver the same responsive application in browser and installed mode, with community-scoped Community Home, Meet & Play, Championship, Discussion, and Profile navigation, plus separate personal My Home/My Communities links. My Home is the application landing page; the personal pages start as stubs and gain data as prerequisite features arrive. Include manifest/icons, HTTPS, sensible install guidance, deep links, and safe update behavior. Browser/platform installation behavior varies; see [MDN PWA documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps).

Mobile layouts, form ergonomics, accessible controls, and safe-area handling start in the first slice. No separate native app is planned.

## Offline and private data

Propose a cached application shell and non-sensitive offline fallback. Do not persist private addresses, messages, profiles, membership/payment details, or API responses in a service-worker cache. Joining, approving, rejecting, sending messages, and submitting/confirming results require server confirmation.

Notify users when disconnected without suggesting a seat or result has been accepted. Lost responses require reconciliation after reconnect. Offline writes/background sync are deferred unless explicitly designed; push is an open channel choice.

On account/tenant switch, suspension, cancellation, or resource-access change, reconcile affected query state and subscriptions. Resource cancellation clears send/address capabilities while retaining permitted historical detail/chat reads; it does not require clearing all history. Backend policies deny subsequent unauthorized access. Already viewed data cannot be recalled from a person's memory or guaranteed remotely erased offline.

## Notifications and updates

The [cancellation notification policy](06-backend-patterns.md#cancellation-notification-policy) is accepted: use the in-app inbox initially, aggregate a parent cancellation into one notice per affected user, retry without duplicates, suppress obsolete reminders, and retain notices without an additional archive-only alert. History-access eligibility remains separate from alert eligibility. Email/push are future channel decisions.

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
| 4. Communication and Community | Event chat, table chat, community DMs with report/block controls, notifications, topics/posts/directory, content removal | Distinct gathering audiences/history; approved same-community DM endpoints, opt-out/bilateral blocks, suspended/removed historical reads, selected report evidence/gap metadata, can_handle_reports/manual resolution, permanent report retention, personal hiding and community-public event/table moderator controls, no cross-tenant leakage |
| 5. Championship | Entry, rules/results/standings/Final Table/history as separately reviewed | Independent eligibility/result validation; no paid entry gate in this phase |
| 6. Complete pilot | Profile/activity views, attendance, PWA refinement, operating procedures, real-device checks | Complete MVP journeys and founder/admin readiness |
| 7. Late commercial stage | Design/implement payments and paid memberships only when scheduled | Revisit pricing, verification, entitlements, refunds, and any commercial holds together |

If scope must shrink, make an explicit product decision. Do not relabel Championship, event/table chat, community DMs, Community, or waitlists as future features solely for implementation convenience.

For messaging, implement general conversation/participant tables without kind/pair columns or database participant-count constraints/triggers. Initial UI/API behavior is one-to-one: accept one recipient, derive the sender, create atomically, and deny direct client membership writes that bypass the API. Implement concurrency-safe create-or-get for one continuing conversation per identity pair/community, keeping future group identity rules separate and creation-on-first-send timing as a recommendation. Implement the accepted 5,000-character limit, account-wide 30-message/minute and 10-new-DM-recipient/hour budgets, and in-app coalesced DM alerts with private per-thread mute/read state. Preserve drafts on length/rate rejection and suppress muted or already-displayed alerts, including obsolete queued jobs after unmute. Group DMs are a later requirement; preserve existing IDs/history as that feature is added. Enforce personal DM blocks across all shared communities and keep staff discipline within its issuing community, tied to the main account across rejoining. Implement same-tenant `can_handle_reports`, submitter reads, permanent report/evidence retention, and manual Acknowledge Report/Close Report actions with required resolution notes. Implement personal hide/unhide for all chat types and staff shared hide/unhide/View Message only for community-public event/table chats under the matching management permission. Private event/table chats retain personal controls and existing private-view reads but no staff moderation or inspection override. Preserve canonical bodies/report evidence and enforce shared suppression in backend delivery. Conversation requests, attachments, sender edits/deletion, shared receipts, and typing remain deferred. Retain ordinary DM history with no automatic expiry, backed by usage monitoring and budget thresholds (D-096).

## Acceptance matrix

| Scenario | Required outcome |
| --- | --- |
| Visitor browses Community Home | Only official public summaries; no home address/member table feed |
| User opens My Home | Personal stub initially; future feed aggregates only authorized updates/RSVPs/suggestions across related communities |
| User opens My Communities | Clearly marked stub initially; future list distinguishes ownership/management from community participation |
| Approved account registers for an event | Standing/approval and capacity govern participation; no payment or entitlement required |
| Authorized account creates private table | Safe listing; exact address requires active confirmed participation or independently authorized organizer/location access; staff status and management/private-view flags alone do not qualify |
| Pending request/waitlist | No active participant-only address/chat access; accepted historical chat access applies after gathering cancellation/archive. No response countdown or payment state |
| Approved event registrant opens event chat | Event chat works even with no table booking or no tables; child-table chats retain their own audience |
| Users exchange DMs | Approved community accounts at both endpoints, separate threads per community, recipient opt-out and bilateral blocks enforced; pending/suspended/removed cannot create or exchange messages; event/table staff flags expose no DM content |
| Same peers open DMs concurrently | Return the same continuing thread in that community, including opposite-direction requests and retry; archive/block/unblock/rejoin do not duplicate it or bypass access. Different communities remain separate |
| User sends a long, blank, or rapid message | Enforce 5,000 characters with line breaks; reject empty/whitespace-only and overlength without truncating the draft. Enforce 30 sends/minute per main account across chat types/communities and 10 new DM recipients/hour with concurrent/retry-safe accounting |
| DM messages arrive or a thread is muted | One unread in-app notice per recipient/conversation with safe metadata/count/link and no body preview. Actually displayed focused messages avoid an extra alert; background/older-history views do not auto-read. Mute suppresses inbox/toast/sound/main badge activity but retains messages and conversation unread markers; unmute alerts only on subsequent messages |
| DM history ages or a budget threshold is reached | No automatic expiry or age-based purge. Existing authorized history remains accessible; usage/budget alerts prompt operational review without deleting messages or changing access |
| Users report/block a DM participant | Message selection plus trusted counts/sender/character lengths for intervening omitted messages; no omitted bodies or blanket staff conversation access. Personal blocks apply across all shared communities; staff discipline stays within the issuing community and follows the main account on rejoin |
| Staff acknowledge and close reports | Active same-tenant can_handle_reports required; submitted → under_review → resolved by manual actions only, with nonblank resolution_notes and trusted actor/time on closure. Submitters can view their own reports/notes; reports and evidence remain permanently available to authorized readers |
| User hides/unhides a message | Only that user's chat view changes in DM/event/table chats, including retained read-only history; source content and report evidence remain intact. No staff shared DM hiding |
| Staff moderate event/table chat | Community-public audience and matching community/official management flag required. Deny private-chat moderation regardless of combined staff/read permissions; retain existing private-view reads. Shared hide suppresses public-chat bodies in ordinary API/UI/Realtime views; authorized View Message changes no visibility state; shared unhide preserves personal hides |
| Groups compete for final seats | Atomic whole-group confirmation without overbooking; automatic FIFO among groups that fit |
| Queue capacity becomes available | Automatic tables promptly confirm eligible non-withdrawn groups; manual tables remain for manager decision |
| Manager switches manual → automatic | Modal explains automatic processing of the existing queue in receipt order as whole groups fit. Continue submits the switch and processing; Cancel closes the modal, keeps manual mode true, and makes no queue changes |
| Manager rejects / raises an issue | Rejection clears the queue and immediately shows timestamp/actor/optional reason to the booker; issue notice leaves the request pending without a deadline |
| Waiting group edited | Names/removals keep priority; additions reset it after explanation; stale group revisions cannot confirm |
| Event/table cancelled | Preserve booking rows; parent cancellation sets attached tables cancelled except already-archived tables; block new participation through resource/parent status. Notify the accepted booking/organizer/host/invitee recipient set once per user, aggregating affected child tables, with safe cancellation details. Chat becomes read-only, participant-based address access ends, organizer location-management access remains where independently authorized, and historical reads remain |
| Cancelled event/table listed or archived | Anonymous visitors can browse cancelled community-public summaries/details. Direct archive after zero booking rows of any status at cancellation or 30 cancelled days. Parent archive sets all attached tables archived, retaining booking rows and prior history. Authorized historical users/guest bookers, former unofficial organizers, and staff retain filtered archive visibility and indefinite read-only chat; private audiences remain protected |
| Community/table access revoked | Further unauthorized reads/sends denied; retain authorized event/table history. Suspended/removed DM participants keep existing history read-only; new sends/receives denied. Ordinary DM history has no automatic expiry |
| Account enters championship | Separate competition eligibility without paid-membership or fee gates; other feature privacy retained |
| Match disputed or corrected | Prior counted result invalidated, confirmations versioned, standings rebuilt |
| Mobile sign-in/deep link/offline/update | Predictable navigation and honest pending/failed state |
| Attendance analytics | Counts actual attended activity, not reservations; deduplicates co-players |

Exercise desktop keyboard use, iOS Safari/installed mode, and Android Chrome/installed mode. Set supported versions before pilot. Test two tenants and direct API/RPC/Realtime paths, not just hidden UI controls.

## Before production and validation

Choose hosting and separate environments, manage secrets, automate build/lint/database checks, configure safe diagnostics, and verify backup/restore. Define account deletion/anonymization, address retention, remaining active/completed gathering-chat lifecycle, staff access, and operational ownership without reopening accepted DM/report/archived-chat retention. Refund support belongs to the deferred commercial stage.

For no-expiry DM history, monitor database/table/index size, allocated disk usage, message growth, and actual/forecast hosting spend. Configure storage-capacity and budget-warning thresholds, alert recipients, and a review procedure before production; numeric thresholds depend on the chosen hosting budget and measured usage. Crossing a threshold prompts operational review and capacity/cost planning, never an automatic message purge. Include paginated history and backup/restore checks as data grows. Monitoring uses aggregate usage and does not require exposing message bodies.

Collect only useful validation data: member activity, table fill, distinct co-players, conversion, and championship participation. Payment/member conversion and revenue reports are deferred. Start with simple administrative reports; a broad analytics dashboard is eventual.

Success includes members making friendships beyond the app. The pilot should test whether ongoing access to new players and activities remains valuable after those friendships form.
