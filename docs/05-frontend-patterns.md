# Frontend code patterns

Status: **current canonical client architecture direction**, recorded from the user's architecture decisions on 2026-10-02. Required stack: Vite, TypeScript, React Compiler. This guides the upcoming prototype refactor; it is reviewable and may evolve as real requirements emerge. Updated 2026-10-03 for personal/community scope and 2026-10-12 for the planned table guest-management interaction.

This document owns client boundaries, data/state, and styling decisions. The [file structure plan](07-file-structure.md) owns illustrative paths, migration steps, and the current-code conflict inventory. The [decision register](08-decisions-and-open-questions.md#client-architecture-review-questions) tracks questions to revisit. Neither document requires the target structure to exist immediately.

Current product scope (2026-10-12): payments and paid memberships are late-stage work. Current feature flows must have no member/guest payment previews, paywalls, pricing/checkout, payment verification, or entitlement-dependent behavior. Remove the legacy prototype simulations during the domain refactor rather than carrying them into the new client. Community approval, private audiences, and resource authorization still apply.

## Decisions made

- Use a pragmatic feature-oriented / vertical-slice architecture. Keep code that changes together close together; most application behavior belongs to business capabilities under `features`.
- Keep startup, providers, routing, navigation, shell/layout, and cross-feature page composition under `app`. Feature-owned route pages belong in that feature's `pages` directory. Keep `App.tsx` small.
- Use `components/primitives` for generic visual building blocks and `components/shared` only for genuinely cross-feature Crowded Table visual concepts. Domain-specific components otherwise stay with their feature.
- Use `lib` for reusable technical infrastructure. Feature UI should not directly depend on Supabase; feature data access owns backend calls.
- Plan for TanStack Query to manage server state. Local React state handles ordinary transient UI state; do not introduce Redux by default. TanStack Query is the intended direction, not an already-installed dependency.
- Prefer feature-local types; generated Supabase schema types belong with Supabase infrastructure. Database rows and UI models need not remain identical.
- Use colocated CSS Modules as the default component styling mechanism, with semantic CSS custom properties for design tokens and controlled community theme presets. Do not accept arbitrary tenant-provided CSS.
- Configure or retain `@` as the `src` alias when refactoring imports. Use abstractions and directories only when actual code or a concrete requirement justifies them.

## Recommended ownership and dependency conventions

A feature represents a business capability, not a screen or visual variation. Likely owners are auth, events, Meet & Play, championships, communities (creation/management and user associations), discussion (community social content), profile, and games. Learn & Play, RPG One-Shot, Social Game Night, Halloween Game Night, and Murder Mystery should remain event types/configurations when they use the same underlying Events capability.

If a route primarily exposes one domain capability, its page belongs to that feature. Keep route-level composition recognizable under `pages`, separate from ordinary components. The application router imports those pages. My Home belongs under `app/pages/MyHomePage` as personal cross-feature composition. Community Home is a separate composition scoped to the browsed community (eventually `app/pages/CommunityHomePage`); its current mock remains `features/Home.tsx`. Community creation/management belongs to `communities`, social content to `discussion`, and global identity/session behavior to `auth`. The current `Community.tsx` is a legacy filename, not the future owner of all community capabilities.

The general dependency direction is:

```text
main.tsx → app (App/providers/router/layout) → feature pages
         → feature components/hooks → feature API/data access
         → lib infrastructure → external services
```

This describes ownership, not a requirement that every operation traverse every layer. Generic primitives can be consumed throughout the upper UI layers. Features should not depend upward on application composition; `lib` and primitives should not depend on business features. Avoid circular feature dependencies. Use a feature's explicit public contract when cross-feature coordination is needed; selective `index.ts` exports may help, but do not add barrels to every directory merely to shorten imports.

| Category | Belongs here | Boundary |
| --- | --- | --- |
| `components/primitives` | Button, Card, Input, Select, Dialog, Badge, Tabs, Avatar, Spinner, Skeleton | Knows variants, sizes, states, accessibility, and visual tokens; does not know events, players, communities, or rankings. `JoinEventButton` belongs to its feature. Prefer the clear term `primitives` over `ui`. |
| `components/shared` | Potential PlayerAvatar, GameThumbnail, LocationChip, common branded EmptyState | Promote only when at least two independent features genuinely need the same Crowded Table visual concept. These are candidates, not required components. |
| `lib` | Supabase client/schema types, query-client configuration, generic validation, date/string utilities | Technical plumbing that can generally be described without product concepts. `joinChampionship`, `calculateEventAvailability`, and `getPlayerRanking` belong to their features. |

Keep a component in its feature until actual reuse justifies moving it. Neither `shared` nor `lib` should become a miscellaneous catch-all. Application providers compose infrastructure and feature providers; they should not absorb domain behavior.

## Product navigation and visual language

Use five community destinations: Community Home, Meet & Play, Championship, Discussion, Profile. Official-event list/calendar/detail sit within Community Home's navigation area; Profile is community-specific. The sidebar name, subtitle, location, links, and motto describe the selected community. Its lower account area contains My Communities and My Home. On mobile, keep those personal links reachable alongside the community tabs. Admin is a separately authorized area.

Meet & Play and Discussion use community standing, privacy, and resource authorization rather than paid membership gates. Do not fetch private data before its audience checks pass; payment/member status has no current access effect.

Community Home's event feed remains scoped to official events from that community. My Home is now the approved default app destination: a personalized feed of announcements/discussions, RSVPs, and possible interest/history-based event suggestions across the user's related communities. Start with honest placeholders and wire sections as prerequisites are completed. Preserve per-community authorization and safe payloads when aggregating; the old official-events-only Home restriction applies to Community Home, not My Home. My Communities is a separate stub; the working owner-only list does not yet provide the complete relationship list. CA-001 records this resolved scope distinction.

Build a warm cream/forest-green/sage/terracotta visual system, serif headings, readable sans-serif body, rounded cards, generous space, and welcoming language. The prototype uses DM Sans and Libre Caslon Display; the final semantic token set and permitted theme presets remain to be designed. Keep accessible contrast, semantic structure, visible focus, keyboard support, touch targets, and screen-reader status announcements.

## Table guest management

Accepted behavior, 2026-10-12: disabling `tables.allow_guests` prevents new guest bookings and preserves existing ones. Saving the flag does not remove people, release seats, or cancel event registrations. This is a planned table-management interaction; it is not implemented in the current prototype.

On disabling guests, show the authorized table manager which current bookings belong to guests, with an optional selection interface for removal. List each guest's optional name or stable unnamed-guest label, booking account, booking status, and group context where relevant. Start with no rows selected. Provide a clear keep-all/dismiss path and an explicit "Remove selected guest bookings" action; if no guest bookings exist, say so and offer no removal action. Explain that existing bookings stay unless deliberately removed. Selected removals affect this table only, including when it belongs to an event.

Saving the setting and removing selected bookings are separate mutations. Closing the prompt, selecting nothing, or a failed removal leaves existing bookings intact; report setting-save and removal outcomes separately so the user knows what succeeded. Refresh the authorized booking list and revalidate selected IDs when submitting removal. Use the standard cancellation command and reconcile capacity/group state from its result; do not optimistically remove unselected rows or infer removals from the flag's value.

Keep the same guest-removal controls available in the ordinary table-management interface at any time, whether guests are currently allowed or blocked. Only users authorized to manage that table may edit the flag or remove bookings; private-view permission and cancellation-only event moderation do not confer those actions. Per-person cancellation remains distinct from accepting only part of a group, which is prohibited. The [schema rules](03-database-schema.md#disabling-guests-and-removing-existing-bookings) and [backend patterns](06-backend-patterns.md#eventtable-rules--confirmed-2026-10-12) define the persistence behavior.

## Components and data flow

Prefer this data-access flow:

```text
UI component → feature query/mutation hook → feature API/data function
             → shared Supabase client → Supabase/PostgREST/RPC → PostgreSQL
```

The responsibilities are distinct: `getEvent()` describes how to retrieve data; `useEvent()` describes how React manages that server data over time; `EventDetails` presents it and coordinates user interaction. Keep table names, Supabase query construction, and cache lifecycle out of presentation components. Use strict TypeScript and explicit selected fields. Keep transactional operations in their existing authorized RPCs.

For example, an eventual `features/events/api/getEvent.ts` retrieves a safe event model, `features/events/hooks/useEvent.ts` wraps it in a query, and a component consumes `const { data: event, isLoading, error } = useEvent(eventId)`. This is an illustrative interface, not a finalized event table, query key, or API contract. Do not create two files for every trivial operation just to satisfy the diagram; retain the UI/data-access boundary where it makes the code clearer.

Preserve a useful distinction between presentation and data coordination: `EventCard({ event })` can render props while `UpcomingEvents()` may call `useEvents()` and handle loading/errors. A formal “container” naming scheme is unnecessary. Mock data and real data should be interchangeable behind these interfaces without redesigning visual components.

Keep render logic pure; use effects for synchronization, not derived state. React Compiler is the baseline; optimize measured issues rather than adding blanket memoization. See [React Compiler](https://react.dev/learn/react-compiler).

Share visual event/table cards and seat-state components only when useful; keep official admission and member-table authorization separate. A shared card must never accidentally display a private location or feed private table data into Community Home.

## Server state, UI state, and types

TanStack Query is the planned server-state layer for events, profiles, game libraries, community information/posts, championships/standings, registrations, Meet & Play availability, and notifications. Let it handle caching, request deduplication, loading/errors, stale data, refetching, invalidation, and mutation lifecycle instead of repeatedly rebuilding these with `useEffect` plus `useState`.

An illustrative query identity is `['events', eventId]`; protected or tenant-dependent reads need the identity/tenant dimensions described below. Joining an event should invalidate the relevant event and affected lists so dependent UI reconciles with canonical server state. Optimistic updates may be useful for appropriate interactions, subject to the restrictions on seats, access, and results below.

Selected tabs, modal/drawer visibility, unsaved form text, and temporary display controls usually belong in local React state. Shareable filters belong in URL state. Introduce a lightweight global client-state library only if local state and existing providers cannot cleanly meet a concrete requirement. An Auth session/subscription lifecycle is distinct from ordinary cached resource queries; define that boundary during the refactor.

Prefer types such as `features/events/types.ts`, `features/championships/types.ts`, and `features/games/types.ts`, rather than a large global `src/types` collection. The infrastructure exception is generated `lib/supabase/database.types.ts`. A row with `event_type_id`, `starts_at`, and `max_players` might later map to an application model with `type`, `startsAt: Date`, `capacity`, and `spotsRemaining`. Introduce that mapping only when it helps; do not require one for every row today.

## Auth, access, and query state

Maintain explicit loading, visitor, pending/approved/suspended community-account, and resource-participation states. Paid membership and payment verification are deferred and must not appear as current eligibility types or gates. UI gating mirrors backend authorization.

Cache private data by user, tenant, resource, and filters. Example:

```ts
['member-tables', userId, tenantId, { category, from, cursor }]
['private-location', userId, tenantId, activityId]
```

Fetch private locations only after authorized confirmation, through their dedicated API. Do not load-and-hide them in general event data. Do not persist address or chat queries offline. Clear affected data/subscriptions on access change and discard stale responses from a previous identity or tenant.

TanStack Query is the intended server-state choice. Router and form/validation libraries remain open. Centralize the route map in `app/router.tsx` even though most route pages are feature-owned; exact URLs are not finalized by this architecture decision. Preserve the working Auth callback and recovery behavior when replacing prototype hash navigation.

## Styling and community themes

Use colocated `Component.tsx` and `Component.module.css` for primitives, feature components, and pages. For example, `components/primitives/Button/Button.module.css` and `features/events/components/EventCard/EventCard.module.css` scope styles to their owners. Keep global CSS primarily for resets/base rules, typography foundations, shared design tokens, theme definitions, and truly application-wide styles; do not let `App.css` remain the entire application's component stylesheet.

The suggested global split is `styles/globals.css`, `styles/tokens.css`, and `styles/themes.css`. Tokens describe semantic roles rather than tenant names. Preset theme classes override tokens; component modules consume the tokens without tenant-specific branches. These example names and values illustrate the mechanism, not approved palettes:

```css
/* tokens.css */
:root {
  --color-primary: #224c3a;
  --color-accent: #a15d40;
  --color-surface: #f8f7f2;
  --radius-card: 1rem;
  --shadow-card: 0 2px 10px rgb(0 0 0 / 8%);
}

/* themes.css: apply an approved preset at the app/community boundary */
.theme-classic {
  --color-primary: #224c3a;
  --color-accent: #a15d40;
  --color-surface: #f8f7f2;
  --radius-card: 1rem;
}

.theme-warm {
  --color-primary: #754b37;
  --color-accent: #995038;
  --color-surface: #fff8f0;
  --radius-card: 1.25rem;
}

/* EventCard.module.css */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
```

Future tenant configuration can select controlled options such as `{ theme: 'warm', density: 'comfortable', cornerStyle: 'rounded' }`, never raw CSS. Presets may eventually influence primary/accent colors, surfaces, typography choices, radius, shadows, spacing/density, and decoration. The preset vocabulary, persistence, defaults, and application scope remain to be designed; this does not add settings columns or branding tables now.

## Introduce only when needed

Grow feature subdirectories, reusable components, schemas, query infrastructure, and mock interfaces when actual code needs them. Collections, messaging, notifications, and venues are possible future feature boundaries, not folders to scaffold today. A possible messaging module does not reopen the product's exclusion of general DMs.

Do not automatically add `repositories`, `services`, `controllers`, `useCases`, `entities`, `domain`, or `infrastructure` layers to imitate backend/Clean Architecture patterns. Add an abstraction when it removes meaningful coupling, clarifies ownership, or makes change/testing substantially easier. Passing a simple Supabase call through several files is not sufficient justification. Selective barrels, row-to-UI mappers, global client state, and a configurable theme system need the same concrete justification.

## Forms and seat actions

Table creation captures title/game, schedule, category, experience, beginner flag, capacity, `manually_confirm_seats` (default false), `allow_guests` (default true), description, and public/private location. Keep private address input separate from public labels/descriptions.

Show requested/awaiting review, waiting for capacity, confirmed, rejected, and cancelled/withdrawn states. No current offer-acceptance button, offer countdown, reservation-expiry notice, checkout, or payment-pending screen exists. Confirmation is authoritative only after the backend commits.

In automatic mode, reservation requests and eligible queue promotion confirm the entire group immediately when capacity permits. Explain first-come, first-served among whole groups that fit; skipped groups retain their priority. Show a waiting state when confirmation is not yet possible, with withdrawal available. No later confirmation by the booking user is required.

In manual mode, authorized table managers review queued groups and choose Approve, Reject, or Notify about an issue. Approve confirms the group directly after server eligibility/capacity checks. Reject can include an optional reason; successful rejection removes the request from the active manager queue and promptly notifies the booking account with decision timestamp, rejecting user, and reason when present. Preserve decision details in history. An issue notice leaves the request pending and introduces no response deadline.

Before switching from manual to automatic confirmation, show a confirmation modal: "Queued requests will be processed automatically in the order received. Eligible groups will be confirmed when the whole group fits the available seats; groups that do not fit will keep their place in the queue." **Continue** submits the switch; **Cancel** closes the modal and leaves `manually_confirm_seats = true`. Opening or dismissing the modal must not save the toggle or process requests. While Continue is being submitted, prevent duplicate submission and do not present Cancel as an undo of a submitted command. After success, refresh the authoritative setting, queue, and confirmed bookings; on a lost response, reconcile server state before offering a retry. Show switch failures without claiming any confirmation succeeded.

Guest-name corrections and removals from a waiting group preserve queue position. Before an addition, clearly explain that the enlarged group receives a new queue timestamp; save the group change atomically and refresh its state. Approval actions reference the current request revision so stale manager screens cannot confirm the old group. If optional offers are introduced later, edits must revalidate those offers/capacity; that interface is deferred now.

Do not optimistically confirm a seat, match result, or address access. Preserve input on failure; reconcile server state after a lost response before retrying. Disable duplicate submissions for UX and rely on backend idempotency for correctness.

## Event cancellation and archive UI

Use Cancel event rather than Delete; no event hard-delete action exists. Cancellation captures an optional reason. Queued and confirmed event registrants receive a notice with basic event details, cancellation timestamp, cancelling user's safe display identity, and the reason if supplied. Recommended guest handling routes the notice to the booking account; deduplicate when the same user has multiple registrations.

Provide a Cancelled filter accessible to community users. Show an Archived filter only for same-community staff; non-staff cannot access archived event detail even as organizer or former attendee. Private-event audience behavior still needs the decision in the [schema follow-ups](03-database-schema.md#follow-up-design-questions). Hide controls according to authority while relying on the backend for access enforcement.

A cancelled event can become eligible for archive immediately if it had no registrations at cancellation, or after at least 30 days continuously cancelled. Do not treat eligibility as a command to archive automatically; the archive actor/trigger and definition of no registrations remain open. The UI should eventually use a server-derived eligibility result rather than guessing from a filtered list of registrations.

Distinguish "Event cancelled" or "Table cancelled" from a person's own cancelled reservation. Show retained per-person status as historical context without presenting a confirmed booking as an upcoming playable session. Recommended behavior disables booking/approval/promotion actions, removes cancelled gatherings from upcoming My Home sections and suggestions, and explains when an attached table is unavailable because its event was cancelled. Cancellation itself must not submit updates for the registration/participation rows.

Recommend retaining a minimal cancellation notice after archival with an unavailable-details explanation for non-staff, without exposing the archived event through its deep link. Read-only chat, exact-address access, reopening, and independent table archival remain unresolved policies.

## Chat and notifications

Initial message history uses authorized paginated reads; Realtime adds/deduplicates by message ID. On reconnect, fetch missed messages. Pending sends remain visibly pending and failed sends can retry with the same client-generated idempotency key.

Re-check resource access after participation/standing changes. Honor read-only/archive state and server rejection. Never broadcast message bodies to a public topic. Use safe in-app notification links for requests, confirmations, rejections, issue notices, and result disputes; do not include private addresses.

## Championship and Discussion

Championship screens support overview, eligible entry, match submission, independent confirm/dispute, leaderboard, and Final Table. Nonmember entrants select from permitted competition identities rather than the private community directory. Show pending/disputed results separately from counted standings and identify rules/version context.

Discussion starts with topics, posts/comments, and a limited-field member directory. Profile uses interests and practical play context; no follower counts or public person ratings. Render member content safely without arbitrary HTML execution. Report/block controls depend on agreed scope; admin content removal and suspension need working interfaces.

## Error handling and tests

Use stable current-domain errors such as unauthenticated, community_approval_required, forbidden, capacity_reached, event_approval_required, request_withdrawn, stale_request, conflict, validation, and unexpected. Payment/member/offer-expiry errors are deferred. Map errors to actionable copy without exposing private resource existence or raw database errors.

Test real behavior: private content never fetched without authorization, no payment/member gates, Community Home without private table leakage, My Home authorized aggregation, automatic queue confirmation, manager approval/rejection/issue notification, decision history, atomic group edits/priority reset, pending versus confirmed address access, reconnecting chat, independent championship result rules, and clearing private state on logout. Include mobile empty/loading/error/offline states. Avoid tests that merely mirror markup.
