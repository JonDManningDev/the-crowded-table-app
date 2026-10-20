# Application file structure and client refactor

Status: **current canonical client architecture direction**, recorded 2026-10-02. Updated 2026-10-03 for personal versus community navigation and 2026-10-15 for global/community profile ownership. Ownership boundaries are accepted; paths and examples below illustrate how to apply them as the client evolves. They are not a scaffold checklist or a claim about what already exists. Create directories and abstractions only when there is actual code to put in them.

The [frontend patterns](05-frontend-patterns.md) define the decisions and recommended conventions. This document owns the illustrative structure, current implementation inventory, and refactor sequence. Open choices are tracked in the [decision register](08-decisions-and-open-questions.md#client-architecture-review-questions).

## Existing repository

The Vite app lives at the repository root alongside `docs/`: `src/`, `public/`, `package.json`, and `vite.config.ts`. Run frontend scripts from the root. Root `supabase/` already contains configuration, identity/tenant migrations, and database tests; see its [implementation guide](../supabase/README.md). PWA installation/offline support is not yet implemented.

The five preview sections still use fixtures and in-memory actions. Real Supabase Auth, community creation through `create_tenant`, and an owner-only saved-community list now coexist with that prototype. The current layout is described in the root [README](../README.md#source-layout); it is not the target architecture.

## Illustrative future structure

This tree makes ownership visible. It does not require every feature, page, hook, schema, provider, or stylesheet to be created immediately. `user-accounts` owns global account/profile behavior; `communities` owns curated community profiles and joining. This replaces the earlier single `profile` feature suggestion. `championships` is the suggested directory name while the navigation label remains “Championship.”

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
│       └── CommunityHomePage/       # Composition scoped to the browsed community
├── features/
│   ├── auth/
│   ├── user-accounts/              # Global account and user_account_profiles
│   ├── events/
│   ├── meet-and-play/
│   ├── championships/
│   ├── communities/                # Management, associations, joining, community profiles
│   ├── discussion/                 # Social content within one community
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

Participation, tenant context, event/table chat, community DMs, and admin remain product/authorization concerns even though some are absent from the compact tree. Event and table features own their resource-specific chat behavior; `features/messaging` is a proposed owner for community DMs, participant/history authorization, and selected-message report UI when implementation begins. Main-account block/disciplinary identity crosses feature boundaries; place its implementation according to actual reuse without granting global staff powers. Group DMs are a future requirement, not a reason to scaffold their full UI now. Shared chat visuals/transport require actual reuse and must preserve each scope's authorization. Payments and paid memberships remain deferred: no current commercial modules, simulations, or gates are required. Collections, notifications, and venues still need concrete justification before becoming directories; no messaging framework or speculative folder scaffold is required.

## Page ownership and routing conventions

Pages that expose one capability belong to that feature; cross-feature orchestration belongs to `app`. The centralized router imports feature pages instead of requiring a global `src/pages` directory. This is an illustrative route map, not finalized URLs or a new set of bottom tabs:

| Example route | Illustrative page owner |
| --- | --- |
| `/account/home` | `features/user-accounts/pages/UserAccountPage.tsx` with `components/MyHomeTab.tsx` |
| `/account/communities` | `features/user-accounts/pages/UserAccountPage.tsx` with `components/MyCommunitiesTab.tsx` |
| `/communities/:slug` | `app/pages/CommunityHomePage/` |
| `/events` | `features/events/pages/EventsPage.tsx` |
| `/events/:eventId` | `features/events/pages/EventDetailsPage.tsx` |
| `/meet` | `features/meet-and-play/pages/MeetAndPlayPage.tsx` |
| `/championships` | `features/championships/pages/ChampionshipsPage.tsx` |
| `/championships/:id` | `features/championships/pages/ChampionshipDetailsPage.tsx` |
| `/communities/:slug/discussion` | `features/discussion/pages/DiscussionPage.tsx` |
| `/my-profile` | `features/user-accounts/pages/MyProfilePage.tsx` |
| `/communities/:slug/profile` | `features/communities/pages/CommunityProfilePage.tsx` |

The five community destinations are Community Home, Meet & Play, Championship, Discussion, and Profile. Each must resolve the browsed community; the example URLs above do not finalize how all tenant routes will be scoped. The account area currently contains My Communities and My Home; access to global profile editing belongs in this personal area, with editing on My Account → Overview (`/account`). My Home is the personal landing/feed across the user's related communities; Community Home retains the official-event feed. Global user profiles and curated community profiles are distinct. CA-001 is resolved by this split; D-111/D-112 extend it without replacing the community Profile destination.

The community join page consumes the caller's global name/bio through the user-account feature's explicit contract, initializes an editable local draft, and submits community account/profile together through one communities command. Share form controls only where useful; shared fields do not imply shared persistence, audiences, or cache entries. `communities` owns `show_global_profile` (default false); `user-accounts` owns global `user_is_discoverable` and `enable_matchmaking` (both default true), plus private account labels. Global account search and global matchmaking consume separate eligibility contracts. Account-level blocking and private labels are selected; Q-016 retains detailed routes/audiences and label UX, not a choice of public identification codes.

The implemented router uses clean account paths and the explicit sample namespace `/community/preview`; see the route contract below. My Home remains a feed placeholder. My Communities combines the fetched owner list and sample row. Only the sample community is browsable.

`/auth/callback` and `/auth/reset-password` are working paths with configured redirect behavior, unlike the examples above. Preserve confirmation-to-home, recovery-to-password-change, and callback credential cleanup while migrating routing. React Router and current paths are implemented (D-121). Real tenant resolution is deferred; no old hash compatibility is retained.

Configure `@` to represent `src` consistently in Vite, TypeScript, and test tooling when adopting it. Prefer `@/features/events/...` to long relative traversals. Expose selected public feature APIs where useful; avoid blanket `index.ts` files and circular imports. Admin orchestration should call the owning feature's authorized operations rather than duplicate domain rules. Share participation concepts only where useful, never a universal permission rule across official events and member tables.

Root `supabase/` remains the backend location; future synthetic seeds or trusted functions belong there when needed. Frontend end-to-end tests may live under root `tests/e2e/`. PWA assets/manifest/worker placement depends on the eventual tooling. Edge Function runtime dependencies should not implicitly depend on frontend packages.

## Current conflicts and refactor candidates

This inventory was first checked on 2026-10-02 and updated for the 2026-10-03 navigation slice. Unresolved rows are future migration candidates.

| Current code or previous plan | Difference from canonical direction / refactor candidate |
| --- | --- |
| `src/features/Profile.tsx` and `src/mock/useMockState.ts` have one mock profile; the backend has both profile types, while the community UI remains mocked | Add global profiles under `user-accounts`, retain curated profiles under `communities`, and wire editable pre-fill plus atomic join/profile submission. Preserve working Auth and existing profile data; global editing is implemented; curated community editing still uses mock UI and atomic join/profile submission remains planned. |
| `src/App.tsx` still composes the shell, legacy membership preview, notifications, and dialogs; navigation lives in `src/app/navigation.ts` and sidebar/personal links in `src/app/layout/Sidebar.tsx`; `src/main.tsx` wraps `AuthShell` | Move composition into `app` and extract feature behavior. Remove the obsolete paid-member preview/gates under D-064 while preserving working Auth/community persistence. |
| Flat `src/features/Home.tsx`, `MeetPlay.tsx`, `Championship.tsx`, `Community.tsx`, `Profile.tsx`, plus account/community screens | Group by capability with route pages under `pages`. Account composition now lives in `features/user-accounts/pages`, with all four tabs and their account-specific children in `features/user-accounts/components`. Move the legacy Home's community composition to `app/pages/CommunityHomePage` later; put official-event behavior under `events`. Do not mistake every current screen or modal for a separate feature or route. |
| `src/components/ui.tsx` mixes controls, decorative/game art, and an import of mock `Art` | Extract generic primitives and remove domain/mock dependencies from them. Keep product visuals feature-local or genuinely shared according to actual consumers. |
| `src/components/Activity.tsx` combines cards/dialogs with `MockModel`, seats, payment simulation, and chat | Split Events/Tables presentation and behavior. Replace old join/offer assumptions with `manually_confirm_seats` and atomic per-person groups; remove payment/member simulations rather than preserving them behind a new module. |
| `src/features/Auth.tsx`, `CreateCommunity.tsx`, and `user-accounts/components/OwnedCommunities.tsx` call Supabase directly | Put Supabase calls behind feature APIs and hooks/providers. Preserve the existing single atomic `create_tenant` RPC, owner-only reads, verification requirements, and callback/subscription cleanup. |
| `src/lib/tenantCreation.ts` holds tenant draft types, domain validation, and error copy | Move to the feature owning community creation; only genuinely generic validation/utilities belong in `lib`. Community management belongs to `communities`, social content to `discussion` (CA-003); moving existing live code remains a later slice. |
| `src/lib/supabase.ts` mixes SDK creation with Auth callback routing metadata/initialization; `src/lib/database.types.ts` holds generated types | Target `lib/supabase/client.ts` and `lib/supabase/database.types.ts`; place Auth-specific coordination with its owner while preserving capture before SDK credential consumption. Update imports, tests, and the type-generation command in `supabase/README.md` when files actually move. |
| `src/mock/data.ts` owns domain types/fixtures and the navigation `Page` type; `src/mock/useMockState.ts` owns behavior across features; UI accepts the whole `MockModel` | Move domain contracts to features and navigation types to the app. Narrow component props/hooks so fixtures no longer define production contracts. Keep a `mocks` area only as useful; moving/renaming it alone does not establish the data boundary. |
| `src/mock/format.ts` contains reusable date/time formatting | Move generic formatting to technical utilities when its contract is clear; review locale/timezone assumptions as real data arrives. |
| `OwnedCommunities.tsx` manages request/loading/error state with effects; `package.json` has no TanStack Query | Introduce query infrastructure for real server-state slices, preserving identity/tenant isolation and invalidation. Do not mechanically convert UI state or Auth subscriptions into resource queries. |
| Global `src/App.css`, `src/index.css`, `src/features/Auth.css`, and `CreateCommunity.css`; existing palette variables in `index.css` | Migrate component rules to CSS Modules and split base styles, semantic tokens, and controlled presets. Current palette variables are a starting point, not a tenant theme system. |
| `vite.config.ts`, `tsconfig.app.json`, and `vitest.config.ts` have no `@` alias; imports are relative | Configure alias resolution consistently during the refactor; this documentation task does not configure it. |
| Earlier plan used `features/home`, `official-events`, `meet-play`, singular `championship`, `components/ui`, `app/layouts`, and `types/database.ts` | This document supersedes those illustrative paths with app-owned My Home and Community Home, `events`, `meet-and-play`, `championships`, `components/primitives`, `app/layout`, and colocated Supabase types. Folder spelling is a convention; ownership is the decision. |
| Earlier docs said query/styling tools were unselected and no backend or real Auth existed | Reconciled here and in the architecture/prototype guides. CSS Modules and the planned TanStack Query direction are now recorded; form/PWA tool selection remains open; React Router is implemented. |

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

## Implemented router contract — 2026-10-16

Implement React Router in declarative BrowserRouter mode with nested routes and a shared app layout, centrally composed in `app/router.tsx`. This is a routing-only slice; persistence and community audiences are unchanged. Use `/account` (Overview), `/account/home` (default landing), `/account/communities`, `/account/settings`, and `/account/premium-features`. Use `/community/preview` and its `meet-play`, `championship`, `discussion`, and `profile` children for the explicitly mocked community. Do not resolve arbitrary tenant slugs to sample data. Future real community routes can use the reserved `/communities` namespace without a root `/:slug` collision.

Auth pages use `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/check-email`, and the existing `/auth/callback` and `/auth/reset-password`. Community creation uses `/account/communities/new`, waits for session restoration and requires verified authentication. URLs, not separate hidden screen state, select all these screens. Preserve initialization metadata capture before Supabase consumes callback fragments; strip credentials through replacement navigation after initialization. Successful sign-in/confirmation/recovery returns to `/account/home`.

Redirect `/` to personal home. Per explicit user direction, do not preserve or redirect old hash routes: the application has no existing users. Auth token fragments remain solely the SDK's responsibility. Use router links, nested outlets, active-route matching, browser Back/Forward support, and a not-found destination. Existing auth callback URLs/allowlists stay unchanged. Production static hosting must rewrite non-asset application paths to `index.html`; Vite handles development fallback. No hosting deployment or schema migration is required by this slice.

Automated verification covers direct routes, root redirect and absence of legacy hash routing, unknown paths, sidebar/tab links, history traversal, community-creation session gates, and real-SDK callback-before-mount/recovery regression tests. See implementation status for results and deployment limits.


## Shared UI controls — 2026-10-16

`src/components/primitives/Controls.tsx` and its CSS Module implement Link, ActionLink, Button and NavItem, with behavioral tests alongside. Existing `components/ui.tsx` retains unrelated primitives and uses Button for local view selectors and modal dismissal. Root semantic tokens remain in `src/index.css`. Shared action presentation has moved out of `App.css`; specialized legacy layout hooks and page styles remain until their feature slices migrate. Route callbacks have been removed from AccountContext: consumers use declarative destinations from the central path map. See the [UI style guide](13-ui-style-guide.md) and D-122.

Route-loading refinement (2026-10-20): the central router now dynamically imports account and community feature pages; App retains the shell and wraps its Outlet with app/LazyContent loading/error recovery. The activity dialog is also loaded on demand. Account tabs share a module and shared profile presentation may be fetched with account content. AuthShell/session initialization stays eager. This changes loading boundaries only; the URL contract above remains unchanged. See implementation status for bundle measurements and verification limits.

Shared-bundle follow-up (2026-10-20): GameArt now lives in components/GameArt.tsx so deferred pages can import artwork without putting it in the shell UI helper module. AuthShell retains eager session initialization and lazily imports CreateCommunity after its verified-session gate. No URLs or feature ownership changed.

## Implemented user-account structure — 2026-10-20

UserAccountPage replaces the flat AccountPage. It owns the shared heading/navigation, auth gate, account mock-state lifetime and global editor/support state, and imports the four tabs. Current source layout:

```text
src/features/user-accounts/
  pages/
    UserAccountPage.tsx
    UserAccountPage.module.css
    PremiumFeaturesPage.tsx
  components/
    AccountOverviewTab.tsx
    MyHomeTab.tsx
    MyHomeTab.module.css
    MyCommunitiesTab.tsx
    MyCommunitiesTab.module.css
    AccountSettingsTab.tsx
    AccountPreferences.tsx
    AccountPreferences.test.tsx
    OwnedCommunities.tsx
    ProfileOverview.tsx
    ProfilePreferences.tsx
  api.ts
```

The tab modules replace the old MyHomePage/MyCommunitiesPage files and no longer need standalone-page/embedded variants. Shared primitives/visuals remain in src/components by explicit user clarification. ProfileOverview/ProfilePreferences are the existing stateless/stateful presenters moved intact; the community Profile page imports them too, passing its separate mock profile/preferences. UserAccountPage does not import the community Profile page. OwnedCommunities retains its existing Supabase read and stylesheet dependency; moving that data access and shared legacy CSS is a later concern, not part of this structural change. PremiumFeaturesPage has its own lazy route module. All URLs are unchanged.
