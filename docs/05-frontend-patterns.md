# Frontend code patterns

Status: **current canonical client architecture direction**, recorded from the user's architecture decisions on 2026-10-02. Required stack: Vite, TypeScript, React Compiler. This guides the upcoming prototype refactor; it is reviewable and may evolve as real requirements emerge.

This document owns client boundaries, data/state, and styling decisions. The [file structure plan](07-file-structure.md) owns illustrative paths, migration steps, and the current-code conflict inventory. The [decision register](08-decisions-and-open-questions.md#client-architecture-review-questions) tracks questions to revisit. Neither document requires the target structure to exist immediately.

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

A feature represents a business capability, not a screen or visual variation. Likely owners are auth, events, Meet & Play, championships, community, profile, and games. Learn & Play, RPG One-Shot, Social Game Night, Halloween Game Night, and Murder Mystery should remain event types/configurations when they use the same underlying Events capability.

If a route primarily exposes one domain capability, its page belongs to that feature. Keep route-level composition recognizable under `pages`, separate from ordinary components. The application router imports those pages. Home belongs under `app/pages/HomePage` as application-level composition and can consume feature APIs without becoming a business feature itself. Its possible future cross-feature content is distinct from the current product rules below.

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

Use the five bottom destinations: Home, Meet & Play, Championship, Community, Profile. Official-event list/calendar/detail sit under Home; My Tables and My Events are reachable from their feature and Profile. Admin is a separately authorized area.

Nonmembers see a membership paywall on Meet & Play and Community, with no private member names, tables, seat counts, or message previews fetched for those screens. Championship remains usable by competition-only entrants.

Home's current event feed queries only official events. A personalized greeting or My Tables link is fine; do not blend member-created tables into its event feed. Application-level Home ownership permits a future composition of events, Meet & Play, championships, community activity, and profile information, but the architecture example does not itself approve that product expansion. Revisit the content and audience explicitly before implementing it; see CA-001 in the decision register.

Build a warm cream/forest-green/sage/terracotta visual system, serif headings, readable sans-serif body, rounded cards, generous space, and welcoming language. The prototype uses DM Sans and Libre Caslon Display; the final semantic token set and permitted theme presets remain to be designed. Keep accessible contrast, semantic structure, visible focus, keyboard support, touch targets, and screen-reader status announcements.

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

Share visual event/table cards and seat-state components only when useful; keep official admission and member-table authorization separate. A shared card must never accidentally display a private location or feed private table data into Home.

## Server state, UI state, and types

TanStack Query is the planned server-state layer for events, profiles, game libraries, community information/posts, championships/standings, registrations, memberships, Meet & Play availability, and notifications. Let it handle caching, request deduplication, loading/errors, stale data, refetching, invalidation, and mutation lifecycle instead of repeatedly rebuilding these with `useEffect` plus `useState`.

An illustrative query identity is `['events', eventId]`; protected or tenant-dependent reads need the identity/tenant dimensions described below. Joining an event should invalidate the relevant event and affected lists so dependent UI reconciles with canonical server state. Optimistic updates may be useful for appropriate interactions, subject to the restrictions on seats, payments, access, and results below.

Selected tabs, modal/drawer visibility, unsaved form text, and temporary display controls usually belong in local React state. Shareable filters belong in URL state. Introduce a lightweight global client-state library only if local state and existing providers cannot cleanly meet a concrete requirement. An Auth session/subscription lifecycle is distinct from ordinary cached resource queries; define that boundary during the refactor.

Prefer types such as `features/events/types.ts`, `features/championships/types.ts`, and `features/games/types.ts`, rather than a large global `src/types` collection. The infrastructure exception is generated `lib/supabase/database.types.ts`. A row with `event_type_id`, `starts_at`, and `max_players` might later map to an application model with `type`, `startsAt: Date`, `capacity`, and `spotsRemaining`. Introduce that mapping only when it helps; do not require one for every row today.

## Auth, access, and query state

Maintain explicit loading/visitor/guest/member/suspended states. Entitlement status comes from the backend; UI gating mirrors server decisions. Role, paid benefits, confirmed participation, and payment verification are separate types.

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
