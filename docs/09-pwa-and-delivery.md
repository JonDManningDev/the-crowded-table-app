# PWA and delivery plan

Status: mobile PWA and product scope established; rollout and offline policy proposed.

## Mobile experience

Deliver the same responsive application in browser and installed mode, with Home, Meet & Play, Championship, Community, Profile navigation. Include manifest/icons, HTTPS, sensible install guidance, deep links, and safe update behavior. Browser/platform installation behavior varies; see [MDN PWA documentation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps).

Mobile layouts, form ergonomics, accessible controls, and safe-area handling start in the first slice. No separate native app is planned.

## Offline and private data

Propose a cached application shell and non-sensitive offline fallback. Do not persist private addresses, messages, profiles, membership/payment details, or API responses in a service-worker cache. Joining, claiming, approving, sending messages, and submitting/confirming results require server confirmation.

Notify users when disconnected without suggesting a seat or result has been accepted. Lost responses require reconciliation after reconnect. Offline writes/background sync are deferred unless explicitly designed; push is an open channel choice.

On account/tenant switch, suspension, cancellation, or entitlement change, clear affected query state and subscriptions. Backend policies deny subsequent unauthorized access. Already viewed data cannot be recalled from a person's memory or guaranteed remotely erased offline.

## Notifications and updates

Seat offers and host requests need timely notices; propose a durable in-app inbox and an agreed external channel if short claim windows require it. Avoid private addresses or message contents in lock-screen previews. A delivery worker should retry safely; offer validity is enforced by server timestamps even when workers are delayed.

Offer app updates at a safe moment. Keep database contracts compatible with installed old versions for an agreed support window. Test callback URLs, sign-in return, protected deep links, reconnect, and update behavior in both browser and installed modes.

## Incremental delivery

These milestones sequence the full handoff MVP; the first working slice is not the complete release.

| Milestone | Scope | Exit evidence |
| --- | --- | --- |
| 0. Rules and UX | Resolve critical entitlement/payment/capacity questions; mobile wireframes and visual direction | Agreed state transitions and permission examples |
| 1. Foundation | Auth, tenant association, manual entitlement/admin audit, five-tab shell/paywalls, safe profiles | Two-tenant isolation; guest/member/suspended behavior |
| 2. Private table slice | Member creates public/private-location table; instant/request seats; cancellation; FIFO waitlist; manual matching intake if approved | Host acceptance, capacity races, address protection, offer expiry |
| 3. Official-event funnel | Home official feed, list/calendar, member/guest admission, manual paid verification, special-event pricing | Drop-in trial works without opening private network |
| 4. Communication and Community | Table chat, notifications, minimal topics/posts/directory, content removal | Confirmed-only chat, revocation, moderation |
| 5. Championship | Entry, versioned first ruleset, submit/confirm/dispute, standings, Final Table, achievements/history | Nonmember entrants work; disputed results do not count |
| 6. Complete pilot | Profile/activity views, attendance, PWA refinement, operating procedures, real-device checks | Complete MVP journeys and founder/admin readiness |

If scope must shrink, make an explicit product decision. Do not relabel Championship, chat, Community, or waitlists as future features solely for implementation convenience.

## Acceptance matrix

| Scenario | Required outcome |
| --- | --- |
| Visitor browses Home | Only official public summaries; no home address/member table feed |
| Guest pays eligible drop-in manually | Staff verification and capacity precede confirmation; no network entitlement |
| Member creates private table | Safe listing; exact address available only after confirmed seat or authorized host/admin access |
| Pending request/waitlist/offer/payment | No private address or chat access |
| Two people claim final seat | At most one confirmation; no duplicate holds or seat creation |
| Waitlist worker delayed | Expired claim denied; next eligible promotion eventually occurs |
| Member/table access revoked | Further reads/sends denied, client data cleared, subscriptions removed |
| Guest enters championship | Can use competition-only workflow without member directory/table access |
| Match disputed or corrected | Prior counted result invalidated, confirmations versioned, standings rebuilt |
| Mobile sign-in/deep link/offline/update | Predictable navigation and honest pending/failed state |
| Attendance analytics | Counts actual attended activity, not reservations; deduplicates co-players |

Exercise desktop keyboard use, iOS Safari/installed mode, and Android Chrome/installed mode. Set supported versions before pilot. Test two tenants and direct API/RPC/Realtime paths, not just hidden UI controls.

## Before production and validation

Choose hosting and separate environments, manage secrets, automate build/lint/database checks, configure safe diagnostics, and verify backup/restore. Define account deletion, address/message retention, staff access, refund support, and operational ownership.

Collect only useful validation data: member activity, table fill, distinct co-players, conversion, and championship participation. Distinguish complimentary/manual access from verified paid revenue. Start with simple administrative reports; a broad analytics dashboard is eventual.

Success includes members making friendships beyond the app. The pilot should test whether ongoing access to new players and activities remains valuable after those friendships form.
