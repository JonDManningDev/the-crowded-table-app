# Frontend code patterns

Status: proposed conventions aligned to the product handoff. Required stack: Vite, TypeScript, React Compiler.

## Product navigation and visual language

Use the five bottom destinations: Home, Meet & Play, Championship, Community, Profile. Official-event list/calendar/detail sit under Home; My Tables and My Events are reachable from their feature and Profile. Admin is a separately authorized area.

Nonmembers see a membership paywall on Meet & Play and Community, with no private member names, tables, seat counts, or message previews fetched for those screens. Championship remains usable by competition-only entrants.

Home queries only official events. A personalized greeting or My Tables link is fine; do not blend member-created tables into its event feed.

Build a warm cream/forest-green/sage/terracotta visual system, serif headings, readable sans-serif body, rounded cards, generous space, and welcoming language. Exact design tokens/fonts remain to be selected. Keep accessible contrast, semantic structure, visible focus, keyboard support, touch targets, and screen-reader status announcements.

## Components and data flow

Organize by domain, with thin routes composing feature UI. Path: route → feature controller/hook → feature API → typed Supabase client. Keep queries out of scattered components. Use strict TypeScript, explicit selected fields, and separate UI models when database rows contain more than the view needs.

Keep render logic pure; use effects for synchronization, not derived state. React Compiler is the baseline; optimize measured issues rather than adding blanket memoization. See [React Compiler](https://react.dev/learn/react-compiler).

Share visual event/table cards and seat-state components only when useful; keep official admission and member-table authorization separate. A shared card must never accidentally display a private location or feed private table data into Home.

## Auth, access, and query state

Maintain explicit loading/visitor/guest/member/suspended states. Entitlement status comes from the backend; UI gating mirrors server decisions. Role, paid benefits, confirmed participation, and payment verification are separate types.

Cache private data by user, tenant, resource, and filters. Example:

```ts
['member-tables', userId, tenantId, { category, from, cursor }]
['private-location', userId, tenantId, activityId]
```

Fetch private locations only after authorized confirmation, through their dedicated API. Do not load-and-hide them in general event data. Do not persist address or chat queries offline. Clear affected data/subscriptions on access change and discard stale responses from a previous identity or tenant.

Use URL state for shareable date/category filters, local state for dialogs/forms, and the data layer for server state. Router/query/form libraries remain undecided.

## Forms and seat actions

Table creation captures title/game, schedule, category, experience, beginner flag, capacity, join mode, description, and public/private location. Keep private address input clearly distinguished from publicly visible description/label fields. Warn against placing home addresses in public text without inventing an automated guarantee.

Show distinct states for requested, waitlisted, offered with expiry, payment awaiting verification, confirmed, declined, cancelled, and expired. Use Take a Seat, Request a Seat, Join Waitlist, and This Table Is Crowded ❤️ in the corresponding situations.

Do not optimistically confirm a seat, successful payment, entitlement, match result, or address access. Preserve input on failure; after a lost response reconcile server state before retrying. Disable duplicate submissions for UX and rely on backend idempotency for correctness.

## Chat and notifications

Initial message history uses authorized paginated reads; Realtime adds/deduplicates by message ID. On reconnect, fetch missed messages. Pending sends remain visibly pending and failed sends can retry with the same client-generated idempotency key.

Re-check resource access after participation/standing changes. Honor read-only/archive state and server rejection. Never broadcast message bodies to a public topic. Use safe in-app notification links for requests, seat offers, result disputes, and membership changes; do not include private addresses.

## Championship and Community

Championship screens support overview, eligible entry, match submission, independent confirm/dispute, leaderboard, and Final Table. Nonmember entrants select from permitted competition identities rather than the private community directory. Show pending/disputed results separately from counted standings and identify rules/version context.

Community starts with topics, posts/comments, and a limited-field member directory. Profile uses interests and practical play context; no follower counts or public person ratings. Render member content safely without arbitrary HTML execution. Report/block controls depend on agreed scope; admin content removal and suspension need working interfaces.

## Error handling and tests

Use stable domain errors: unauthenticated, membership_required, forbidden, capacity_reached, approval_required, payment_unverified, offer_expired, conflict, validation, and unexpected. Map errors to actionable copy without exposing private resource existence or raw database errors.

Test real behavior: guest paywall without private fetch, Home without member tables, host accept/decline, pending versus confirmed address access, reconnecting chat, expired waitlist offer, guest championship entry, disputed-result exclusion, and clearing private state on logout. Include mobile empty/loading/error/offline states. Avoid tests that merely mirror markup.
