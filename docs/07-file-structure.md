# Application file structure and client refactor

Status: **current canonical client architecture direction**, recorded 2026-10-02. Updated 2026-10-03 for personal versus community navigation. Ownership boundaries are accepted; paths and examples below illustrate how to apply them as the client evolves. They are not a scaffold checklist or a claim about what already exists. Create directories and abstractions only when there is actual code to put in them.

The [frontend patterns](05-frontend-patterns.md) define the decisions and recommended conventions. This document owns the illustrative structure, current implementation inventory, and refactor sequence. Open choices are tracked in the [decision register](08-decisions-and-open-questions.md#client-architecture-review-questions).

## Existing repository

The Vite app lives at the repository root alongside `docs/`: `src/`, `public/`, `package.json`, and `vite.config.ts`. Run frontend scripts from the root. Root `supabase/` already contains configuration, identity/tenant migrations, and database tests; see its [implementation guide](../supabase/README.md). PWA installation/offline support is not yet implemented.

The five preview sections still use fixtures and in-memory actions. Real Supabase Auth, community creation through `create_tenant`, and an owner-only saved-community list now coexist with that prototype. The current layout is described in the root [README](../README.md#source-layout); it is not the target architecture.

## Illustrative future structure

This tree makes ownership visible. It does not require every feature, page, hook, schema, provider, or stylesheet to be created immediately. `profile` is the suggested directory name for the profiles capability; `championships` is the suggested directory name while the navigation label remains “Championship.”

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx                   # Central route map imports feature pages
│   ├── providers.tsx                # Composition of infrastructure/feature providers
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── BottomNav.tsx
│   │   └── Header.tsx
│   └── pages/
│       ├── MyHomePage/              # Personal feed across related communities
│       └── CommunityHomePage/       # Composition scoped to the browsed community
├── features/
│   ├── auth/
│   ├── events/
│   ├── meet-and-play/
│   ├── championships/
│   ├── communities/                # Creation/management, associations, My Communities
│   ├── discussion/                 # Social content within one community
│   ├── profile/
│   └── games/
├── components/
│   ├── primitives/                  # Generic visual building blocks
│   └── shared/                      # Proven cross-feature product visuals only
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── database.types.ts        # Generated schema types
│   ├── query/
│   │   └── queryClient.ts
│   ├── validation/
│   │   └── commonSchemas.ts         # Generic, not feature validation
│   └── utilities/
│       ├── dates.ts
│       └── strings.ts
├── mocks/                          # Fixtures/adapters as useful during migration
├── assets/
├── styles/
│   ├── globals.css
│   ├── tokens.css
│   └── themes.css
└── main.tsx
```

Most application code should eventually live within features. A mature feature might contain:

```text
features/events/
  api/
    getEvent.ts
    listEvents.ts
    createEvent.ts
    joinEvent.ts
  components/
    EventCard/
      EventCard.tsx
      EventCard.module.css
    EventDetails.tsx
    EventRoster.tsx
  hooks/
    useEvent.ts
    useEvents.ts
    useJoinEvent.ts
  pages/
    EventsPage.tsx
    EventDetailsPage.tsx
  schemas/
    eventSchema.ts
  types.ts
```

A new feature can start with only `EventCard.tsx`, its CSS Module when needed, and `types.ts`. Add internal `api`, `components`, `hooks`, or `schemas` directories as complexity warrants. When route pages exist, keep them recognizable under `pages`; colocate relevant tests with their owners. Do not force every feature into an identical tree.

Membership, participation, tenant context, table chat, and admin remain real product/authorization concerns even though they are absent from the compact tree. Decide whether each warrants its own feature or belongs to an existing owner when implementing its behavior. Omitting a directory does not defer MVP scope. Collections, messaging, notifications, and venues likewise need actual code and ownership justification before becoming directories.

## Page ownership and routing conventions

Pages that expose one capability belong to that feature; cross-feature orchestration belongs to `app`. The centralized router imports feature pages instead of requiring a global `src/pages` directory. This is an illustrative route map, not finalized URLs or a new set of bottom tabs:

| Example route | Illustrative page owner |
| --- | --- |
| `/` | `app/pages/MyHomePage/` |
| `/my-communities` | `features/communities/pages/MyCommunitiesPage.tsx` |
| `/communities/:slug` | `app/pages/CommunityHomePage/` |
| `/events` | `features/events/pages/EventsPage.tsx` |
| `/events/:eventId` | `features/events/pages/EventDetailsPage.tsx` |
| `/meet` | `features/meet-and-play/pages/MeetAndPlayPage.tsx` |
| `/championships` | `features/championships/pages/ChampionshipsPage.tsx` |
| `/championships/:id` | `features/championships/pages/ChampionshipDetailsPage.tsx` |
| `/communities/:slug/discussion` | `features/discussion/pages/DiscussionPage.tsx` |
| `/profile/:profileId` | `features/profile/pages/ProfilePage.tsx` |

The five community destinations are Community Home, Meet & Play, Championship, Discussion, and Profile. Each must resolve the browsed community; the example URLs above do not finalize how all tenant routes will be scoped. The account area contains My Communities and My Home. My Home is the personal landing/feed across the user's related communities; Community Home retains the official-event feed. Global accounts and community profiles are distinct. CA-001 is resolved by this split.

The current incremental implementation uses hashes: default/`#my-home`, `#my-communities`, `#community-home`, and `#discussion`; legacy `#home` and `#community` remain community aliases. Other community hashes are unchanged. Both personal pages are stubs; only a sample community is browsable. The working owner-only saved-community list remains separate.

`/auth/callback` and `/auth/reset-password` are working paths with configured redirect behavior, unlike the examples above. Preserve confirmation-to-home, recovery-to-password-change, and callback credential cleanup while migrating routing. Router selection, tenant slug routing/reserved names, and compatibility with existing hash links need explicit review (CA-002).

Configure `@` to represent `src` consistently in Vite, TypeScript, and test tooling when adopting it. Prefer `@/features/events/...` to long relative traversals. Expose selected public feature APIs where useful; avoid blanket `index.ts` files and circular imports. Admin orchestration should call the owning feature's authorized operations rather than duplicate domain rules. Share participation concepts only where useful, never a universal permission rule across official events and member tables.

Root `supabase/` remains the backend location; future synthetic seeds or trusted functions belong there when needed. Frontend end-to-end tests may live under root `tests/e2e/`. PWA assets/manifest/worker placement depends on the eventual tooling. Edge Function runtime dependencies should not implicitly depend on frontend packages.

## Current conflicts and refactor candidates

This inventory was first checked on 2026-10-02 and updated for the 2026-10-03 navigation slice. Unresolved rows are future migration candidates.

| Current code or previous plan | Difference from canonical direction / refactor candidate |
| --- | --- |
| `src/App.tsx` still composes the main shell, preview membership, notifications, and dialogs; navigation definitions now live in `src/app/navigation.ts`, and the sidebar/personal links in `src/app/layout/Sidebar.tsx`; `src/main.tsx` wraps it in `AuthShell` | Move application composition into `app`; extract shell/navigation and feature-owned behavior, keeping `App` small. Coordinate providers and startup without changing working Auth semantics. |
| Flat `src/features/Home.tsx`, `MeetPlay.tsx`, `Championship.tsx`, `Community.tsx`, `Profile.tsx`, plus account/community screens | Group by capability with route pages under `pages`. The personal stub now lives in `app/pages/MyHomePage`, and My Communities in `features/communities/pages`. Move the legacy Home's community composition to `app/pages/CommunityHomePage` later; put official-event behavior under `events`. Do not mistake every current screen or modal for a separate feature or route. |
| `src/components/ui.tsx` mixes controls, decorative/game art, and an import of mock `Art` | Extract generic primitives and remove domain/mock dependencies from them. Keep product visuals feature-local or genuinely shared according to actual consumers. |
| `src/components/Activity.tsx` combines a presentation card and a dialog using `MockModel`, seat actions, payments, and chat | Separate reusable presentation from domain/state coordination; decide Events/Meet & Play/shared ownership without merging their authorization. |
| `src/features/Auth.tsx`, `CreateCommunity.tsx`, and `OwnedCommunities.tsx` call Supabase directly | Put Supabase calls behind feature APIs and hooks/providers. Preserve the existing single atomic `create_tenant` RPC, owner-only reads, verification requirements, and callback/subscription cleanup. |
| `src/lib/tenantCreation.ts` holds tenant draft types, domain validation, and error copy | Move to the feature owning community creation; only genuinely generic validation/utilities belong in `lib`. Community management belongs to `communities`, social content to `discussion` (CA-003); moving existing live code remains a later slice. |
| `src/lib/supabase.ts` mixes SDK creation with Auth callback routing metadata/initialization; `src/lib/database.types.ts` holds generated types | Target `lib/supabase/client.ts` and `lib/supabase/database.types.ts`; place Auth-specific coordination with its owner while preserving capture before SDK credential consumption. Update imports, tests, and the type-generation command in `supabase/README.md` when files actually move. |
| `src/mock/data.ts` owns domain types/fixtures and the navigation `Page` type; `src/mock/useMockState.ts` owns behavior across features; UI accepts the whole `MockModel` | Move domain contracts to features and navigation types to the app. Narrow component props/hooks so fixtures no longer define production contracts. Keep a `mocks` area only as useful; moving/renaming it alone does not establish the data boundary. |
| `src/mock/format.ts` contains reusable date/time formatting | Move generic formatting to technical utilities when its contract is clear; review locale/timezone assumptions as real data arrives. |
| `OwnedCommunities.tsx` manages request/loading/error state with effects; `package.json` has no TanStack Query | Introduce query infrastructure for real server-state slices, preserving identity/tenant isolation and invalidation. Do not mechanically convert UI state or Auth subscriptions into resource queries. |
| Global `src/App.css`, `src/index.css`, `src/features/Auth.css`, and `CreateCommunity.css`; existing palette variables in `index.css` | Migrate component rules to CSS Modules and split base styles, semantic tokens, and controlled presets. Current palette variables are a starting point, not a tenant theme system. |
| `vite.config.ts`, `tsconfig.app.json`, and `vitest.config.ts` have no `@` alias; imports are relative | Configure alias resolution consistently during the refactor; this documentation task does not configure it. |
| Earlier plan used `features/home`, `official-events`, `meet-play`, singular `championship`, `components/ui`, `app/layouts`, and `types/database.ts` | This document supersedes those illustrative paths with app-owned My Home and Community Home, `events`, `meet-and-play`, `championships`, `components/primitives`, `app/layout`, and colocated Supabase types. Folder spelling is a convention; ownership is the decision. |
| Earlier docs said query/styling tools were unselected and no backend or real Auth existed | Reconciled here and in the architecture/prototype guides. CSS Modules and the planned TanStack Query direction are now recorded; router/form/PWA tool selection remains open. |

The 2026-10-03 product decision resolves the Home ambiguity: My Home is personal aggregation; Community Home is tenant-scoped. The sidebar reads a sample community identity object, while its lower account area reads a safe Auth account summary rather than the mock community profile. Full feed wiring, association listing, and real community switching remain future work; existing privacy/admission rules still apply.

## Recommended refactor progression

The purpose is to establish ownership boundaries before substantial new data and behavior arrive. Matching a theoretical tree is not the goal. Preserve the already-working Auth and community persistence alongside the mock screens.

1. Identify the domain capabilities represented by current screens, mixed activity components, and mock actions. Resolve the ownership questions needed for the first slice.
2. Move route composition under owning features, with separate app-owned My Home/Community Home and centralized application routing/layout/providers.
3. Extract reusable presentation components and narrow their props. Keep domain-aware components with their feature; promote genuinely generic visuals to primitives and proven cross-feature visuals to shared.
4. Define feature-local types independent of fixtures. Retain generated schema types as infrastructure; introduce row mapping only when necessary.
5. Put mock behavior behind useful feature interfaces/hooks, keeping pages focused on composition. An `EventCard` should accept an event whether supplied as `<EventCard event={mockEvent} />` or from `useEvent(eventId)`.
6. Introduce real feature API/data functions and query/mutation hooks slice by slice. Replace mock implementations with Supabase-backed calls while preserving presentation contracts and backend authority. Move existing live calls behind those boundaries too.
7. Migrate styles to CSS Modules and semantic tokens alongside their components. Align aliases, tests, imports, and generation/setup documentation with actual file moves.
8. Verify the affected behavior: visual/mobile/accessibility continuity, identity/tenant cache cleanup, privacy boundaries, mutation reconciliation, and existing Auth callback/recovery and community-creation flows. Keep mocks clearly separated from real access decisions.

Do not create speculative folders, universal repositories/services, mapper layers, or a global client-state store as prerequisites. Revisit boundaries when concrete coupling or duplication demonstrates a need; record changes in the decision register and related documents together.
