# Application file structure and client refactor

## Approved client/server workspace restructuring — 2026-11-03

The user approved a dedicated `@crowded-table/client` npm workspace beside `server/`, with one root lockfile and root command orchestration. Move frontend source, public assets, HTML, Vite/Vitest/TypeScript configuration and browser environment files into `client/`; keep the internal feature organization and runtime behavior. Move generated database types into `shared/database.types.ts` so neither application imports the other's source. Existing shared HTTP contracts remain ordinary TypeScript source.

Implemented and verified locally. The current top-level layout is:

```text
client/     # src/, public/, index.html, package.json, Vite/Vitest/TypeScript, browser env files
server/     # src/, scripts/, tests/, package.json, TypeScript, private runtime env files
shared/     # HTTP contracts and database.types.ts
supabase/   # migrations, configuration and database tooling
docs/       # product and engineering documentation
package.json, package-lock.json, eslint.config.js, AGENTS.md, README.md
```

`npm run dev`/`dev:api` use hosted Supabase with local application processes; `dev:local`/`dev:api:local` use local Supabase. `npm test`, `build`, `lint` and `preview` remain root entry points. Frontend build output is `client/dist/`. See [verification](12-implementation-status.md#clientserver-workspace-restructuring).

Root dev/test/build/preview commands delegate to the client workspace, server commands retain the server workspace, and root lint covers TypeScript with React rules scoped to the client. Build output is `client/dist/`. Keep browser settings in client-local ignored environment files and database credentials in server-local files; update setup scripts, audit paths and current documentation. Preserve ports 5173/3001 and API forwarding. Do not add aliases, compatibility copies, dependencies upgrades, migrations, credential rotation or hosting changes. Dated descriptions below remain historical or illustrative; their `src/` examples are client-relative after this move.

Verify a clean root npm install from the lockfile, all frontend tests, server type checking, client build, root lint, local API suites and client access audit. Check both development targets, assets/deep links/proxying and authenticated browser behavior using local fixtures. Hosted verification is read-only. Record actual results in implementation status and leave both hosted-target application processes running locally.

**2026-11-03.** The [approved API transition](20-persistent-api-transition-proposal.md) governs new application-data paths. Earlier descriptions of direct browser access apply to the unmigrated implementation. Client feature boundaries, Supabase Auth and accepted product audiences continue to apply.

Footer extraction (2026-10-21): `app/layout/Footer.tsx` renders the shared footer in the existing App content position. Its colocated `Footer.module.css` owns the decorative text, border, spacing and mobile stacking rules previously in App.css. The footer continues to use the shared Icon primitive.

Sidebar style ownership (2026-10-21): `app/layout/Sidebar.module.css` now owns all sidebar-specific presentation, including brand/location/motto, account area and desktop/tablet/mobile rules. Sidebar.tsx uses only module classes for these elements. Shared primitives (Avatar, Botanical, NavItem) retain their shared base styles; the module scopes its Botanical positioning override. App.css retains main-content offsets, which belong to the application shell.

Implemented layout extraction (2026-10-21): `app/layout/Topbar.tsx` owns the shared breadcrumb, community preview controls, notification trigger, profile link and AccountActions composition. Its colocated `Topbar.module.css` owns top-bar presentation and responsive rules. App supplies route labels, preview values and callbacks; preview/dialog state and route effects remain in App. Shared Avatar and AccountActions retain their own presentation responsibilities.

Status: **current canonical client architecture direction**, recorded 2026-10-02. Updated 2026-10-03 for personal versus community navigation and 2026-10-15 for global/community profile ownership. Ownership boundaries are accepted; paths and examples below illustrate how to apply them as the client evolves. They are not a scaffold checklist or a claim about what already exists. Create directories and abstractions only when there is actual code to put in them.

The [frontend patterns](05-frontend-patterns.md) define the decisions and recommended conventions. This document owns the illustrative structure, current implementation inventory, and refactor sequence. Open choices are tracked in the [decision register](08-decisions-and-open-questions.md#client-architecture-review-questions).

## Existing repository — historical before the workspace move

Data API implementation (2026-10-24): `src/features/user-accounts/api.ts` owns global profile/preferences reads and direct writes. `src/features/communities/api.ts` owns separate community profile saving and consolidated community-account preference saving. The latter is not wired to the sample UI. Restricted administrative views and content/tenant-detail DML are available in the local schema for future management UI; no speculative screen or query layer was introduced.

The Vite app lives at the repository root alongside `docs/`: `src/`, `public/`, `package.json`, and `vite.config.ts`. Run frontend scripts from the root. Root `supabase/` already contains configuration, identity/tenant migrations, and database tests; see its [implementation guide](../supabase/README.md). PWA installation/offline support is not yet implemented.

The five preview sections still use fixtures and in-memory actions. Real Supabase Auth, community creation through `create_tenant`, and an owner-only saved-community list now coexist with that prototype. The current layout is described in the root [README](../README.md#source-layout); it is not the target architecture.

## Illustrative future structure

Accepted API organization (2026-10-25): one `api.ts` per feature is the standard, with any exception justified by a concrete need in feature documentation. `user-accounts/api.ts` owns global account behavior; `communities/api.ts` owns community-scoped behavior. The proposed Communities tab slice will consolidate the existing account-list `user-accounts/communities.ts` into `user-accounts/api.ts`, move its shared contracts to `user-accounts/types.ts`, update consumers/tests and remove the superseded file. No `user-accounts/communities.api.ts` will be introduced. This is a plan update; runtime consolidation is not yet implemented.

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
│   └── tokens/
│       ├── primitives.css
│       ├── semantic.css
│       └── index.css               # themes.css deferred until scoped themes
├── index.css                       # Existing global entry imports tokens
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
| `/account/home` | `features/user-accounts/pages/UserAccountPage.tsx` with `components/AccountHomeTab.tsx` |
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

The five community destinations are Community Home, Meet & Play, Championship, Discussion, and Profile. Each must resolve the browsed community; the example URLs above do not finalize how all tenant routes will be scoped. The account area currently contains My Communities and My Home; access to global profile editing belongs in this personal area, with editing on My Account → Profile (`/account/profile`). My Home is the personal landing/feed across the user's related communities; Community Home retains the official-event feed. Global user profiles and curated community profiles are distinct. CA-001 is resolved by this split; D-111/D-112 extend it without replacing the community Profile destination.

The community join page consumes the caller's global name/bio through the user-account feature's explicit contract, initializes an editable local draft, and submits community account/profile together through one communities command. Share form controls only where useful; shared fields do not imply shared persistence, audiences, or cache entries. `communities` owns `show_global_profile` (default false); `user-accounts` owns global `user_is_discoverable` and `enable_matchmaking` (both default true), plus private account labels. Global account search and global matchmaking consume separate eligibility contracts. Account-level blocking and private labels are selected; Q-016 retains detailed routes/audiences and label UX, not a choice of public identification codes.

The implemented router uses clean account paths and the explicit sample namespace `/community/preview`; see the route contract below. My Home remains a feed placeholder. My Communities combines the fetched owner list and sample row. Only the sample community is browsable.

`/auth/callback` and `/auth/reset-password` are working paths with configured redirect behavior, unlike the examples above. Preserve confirmation-to-home, recovery-to-password-change, and callback credential cleanup while migrating routing. React Router and current paths are implemented (D-121). Real tenant resolution is deferred; no old hash compatibility is retained.

Configure `@` to represent `src` consistently in Vite, TypeScript, and test tooling when adopting it. Prefer `@/features/events/...` to long relative traversals. Expose selected public feature APIs where useful; avoid blanket `index.ts` files and circular imports. Admin orchestration should call the owning feature's authorized operations rather than duplicate domain rules. Share participation concepts only where useful, never a universal permission rule across official events and member tables.

Root `supabase/` remains the backend location; future synthetic seeds or trusted functions belong there when needed. Frontend end-to-end tests may live under root `tests/e2e/`. PWA assets/manifest/worker placement depends on the eventual tooling. Edge Function runtime dependencies should not implicitly depend on frontend packages.

## Current conflicts and refactor candidates

This inventory was first checked on 2026-10-02 and updated for the 2026-10-03 navigation slice. Unresolved rows are future migration candidates.

| Current code or previous plan | Difference from canonical direction / refactor candidate |
| --- | --- |
| `features/communities/pages/CommunityProfilePage.tsx` receives one mock profile projected from `src/mock/useMockState.ts`; the backend has both profile types, while the community UI remains mocked | Add global profiles under `user-accounts`, retain curated profiles under `communities`, and wire editable pre-fill plus atomic join/profile submission. Preserve working Auth and existing profile data; global editing is implemented; curated community editing still uses mock UI and atomic join/profile submission remains planned. |
| `src/App.tsx` coordinates shell/route state and controlled feature dialogs; navigation/layout live in app, and main.tsx wraps AuthShell | App membership/notification/gate presentation is extracted. Preserve approved prototype commercial behavior during this structural pass; D-064 reconciliation remains future domain work. Moving the entry file alone is not required. |
| Completed account/community structural page extractions | Group by capability with route pages under `pages`. Account composition now lives in `features/user-accounts/pages`, with all four tabs and their account-specific children in `features/user-accounts/components`. Community Home now lives in `app/pages/CommunityHomePage.tsx`, with app-owned hero/schedule children and controlled official-event/calendar presenters under `features/events/components`; its pure event read/selection boundary is `features/events/api.ts`. Community Profile now lives in `features/communities/pages/CommunityProfilePage.tsx`. Do not mistake every current screen or modal for a separate feature or route. |
| `src/components/ui.tsx` collects shared Modal/Avatar/Tag/Heading/Tabs/Empty/Icon/Botanical helpers and scoped styles; controls and GameArt are separate | No current mock import in ui.tsx. Further family extraction requires useful ownership/reuse, rather than a file per helper by default. |
| Shared ActivityCard and controlled feature-owned ActivityDialog presenters replace `src/components/Activity.tsx`; app/ActivityDialogController bridges the App snapshot | The approved structural slice preserves current reservation/request/chat/checkout simulations through feature APIs. Real manually-confirmed/per-person/group/standing/chat lifecycle and commercial reconciliation remain deferred domain work. |
| Create Community now lives under `src/features/communities/pages` and `components` | Creation uses the existing communities/api.ts/types.ts, one hooks.ts and feature-owned creation.ts. Preserve the single atomic RPC, real failures and Auth identity boundaries. Auth and account data retain their own feature APIs/hooks. |
| Community creation domain hints and error copy live in `src/features/communities/creation.ts`; contracts live in types.ts | Removed lib/tenantCreation.ts. Only genuinely generic utilities belong in lib; community management belongs to communities and social content to discussion (CA-003). |
| `src/lib/supabase.ts` mixes SDK creation with Auth callback routing metadata/initialization; `src/lib/database.types.ts` holds generated types | Target `lib/supabase/client.ts` and `lib/supabase/database.types.ts`; place Auth-specific coordination with its owner while preserving capture before SDK credential consumption. Update imports, tests, and the type-generation command in `supabase/README.md` when files actually move. |
| `src/mock/data.ts` retains compatibility records/fixtures; `src/mock/useMockState.ts` applies feature-command results to App state; remaining App/router adapters accept `MockModel` | Move domain contracts to features and navigation types to the app. Narrow component props/hooks so fixtures no longer define production contracts. Keep a `mocks` area only as useful; moving/renaming it alone does not establish the data boundary. |
| `src/mock/format.ts` is the retained compatibility re-export of lib/dateTime | Generic formatting already moved. Remove the compatibility file only at its own zero-consumer cleanup checkpoint; real locale/timezone changes remain separate. |
| Account communities data uses user-accounts/hooks.ts/api.ts; package.json has no TanStack Query | Introduce the planned query layer when a real server-state slice needs it, preserving identity/tenant isolation and invalidation. The old OwnedCommunities component has been removed; do not convert ordinary UI state or Auth subscriptions into resource queries. |
| Global `src/App.css` and `src/index.css`; Auth/creation now use CSS Modules; CSS-native token definitions in `styles/tokens/` | Migrate remaining component rules and compatibility consumers in approved batches. Base styles remain in index.css; controlled presets and their fixture are deferred. See the token guide. |
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

Implement React Router in declarative BrowserRouter mode with nested routes and a shared app layout, centrally composed in `app/router.tsx`. This is a routing-only slice; persistence and community audiences are unchanged. Use `/account/profile` (Profile), `/account/home` (default landing), `/account/communities`, `/account/settings`, and `/account/premium-features`. Use `/community/preview` and its `meet-play`, `championship`, `discussion`, and `profile` children for the explicitly mocked community. Do not resolve arbitrary tenant slugs to sample data. Future real community routes can use the reserved `/communities` namespace without a root `/:slug` collision.

Auth pages use `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/check-email`, and the existing `/auth/callback` and `/auth/reset-password`. Community creation uses `/account/communities/new`, waits for session restoration and requires verified authentication. URLs, not separate hidden screen state, select all these screens. Preserve initialization metadata capture before Supabase consumes callback fragments; strip credentials through replacement navigation after initialization. Successful sign-in/confirmation/recovery returns to `/account/home`.

Redirect `/` and `/account` to personal home with replacement navigation. Per explicit user direction, do not preserve or redirect old hash routes: the application has no existing users. Auth token fragments remain solely the SDK's responsibility. Use router links, nested outlets, active-route matching, browser Back/Forward support, and a not-found destination. Existing auth callback URLs/allowlists stay unchanged. Production static hosting must rewrite non-asset application paths to `index.html`; Vite handles development fallback. No hosting deployment or schema migration is required by this slice.

Automated verification covers direct routes, root redirect and absence of legacy hash routing, unknown paths, sidebar/tab links, history traversal, community-creation session gates, and real-SDK callback-before-mount/recovery regression tests. See implementation status for results and deployment limits.


## Shared UI controls — 2026-10-16

`src/components/primitives/Controls.tsx` and its CSS Module implement Link, ActionLink, Button and NavItem, with behavioral tests alongside. Existing `components/ui.tsx` retains unrelated primitives and uses Button for local view selectors and modal dismissal. Token definitions belong in `src/styles/tokens/`, imported by `src/index.css`; Controls now consumes purpose-based --ct- roles with private variant variables. Shared action presentation has moved out of `App.css`; specialized legacy layout hooks and page styles remain until their feature slices migrate. Route callbacks have been removed from AccountContext: consumers use declarative destinations from the central path map. See the [UI style guide](13-ui-style-guide.md), [token guide](14-design-tokens.md), D-122 and D-123.

Route-loading refinement (2026-10-20): the central router now dynamically imports account and community feature pages; App retains the shell and wraps its Outlet with app/LazyContent loading/error recovery. The activity dialog is also loaded on demand. Account tabs share a module and shared profile presentation may be fetched with account content. AuthShell/session initialization stays eager. This changes loading boundaries only; the URL contract above remains unchanged. See implementation status for bundle measurements and verification limits.

Shared-bundle follow-up (2026-10-20): GameArt now lives in components/GameArt.tsx so deferred pages can import artwork without putting it in the shell UI helper module. AuthShell retains eager session initialization and lazily imports CreateCommunity after its verified-session gate. No URLs or feature ownership changed.

ActivityCard styling (2026-10-23, token batch eight awaiting review): components/Activity.tsx imports colocated ActivityCard.module.css for the card presenter. Exclusive card/artwork/date/footer rules and their responsive rules moved out of App.css. Shared grid, host/location/availability utilities, dots, Avatar and GameArt remain available to other consumers; the card now owns its local host/location/status composition. ActivityDialog remains in Activity.tsx with its existing global styles and behavior. No component API, domain ownership or routing refactor is included.

ActivityDialog styling (2026-10-23, token batch nine accepted): Activity.tsx now also imports ActivityDialog.module.css. Exclusive detail/reservation/request/chat-container/form rules moved from App.css; local copies of required host/description/title/chat-message helpers consume tokens directly. Global versions still used by Discussion/profile/account views remain unchanged. Modal shell/lifecycle, Notice, controls, artwork and ActivityCard retain their owners; no file split, API, domain or lazy-loading boundary change is included.

Shared Modal styling (2026-10-23, token batch ten accepted): ui.module.css replaces eight Modal aliases with existing role/primitive references. Modal stays in ui.tsx with the same API, native lifecycle and legacy class hooks. No new stylesheet, token definitions, component split or ownership change; unrelated presenters in the module retain their rules.

Shared Tabs styling (2026-10-23, token batch eleven accepted): ui.module.css consumes three new Tabs paint contracts from semantic.css and existing section/composition/palette tokens. Tabs remains in ui.tsx as local-view Buttons; account navigation still shares only the container class and uses NavItem links. Compact section-heading/Profile overrides stay in App.css. No file split, React API or other style ownership change.

Shared Heading styling (2026-10-23, token batch twelve accepted): eleven ui.module.css aliases now reference the existing body, page-title, eyebrow and section-spacing roles directly. Heading stays in ui.tsx with its h1 and optional paragraph/action; global typography and account-page overrides are unchanged. No new token, stylesheet, component API or ownership change; specialized cards' local Heading tag variables are unrelated.

## Implemented user-account structure — 2026-10-20

UserAccountPage replaces the flat AccountPage. It owns the shared heading/navigation, auth gate, account mock-state lifetime and global editor state, and imports the four tabs. Current source layout:

```text
src/features/user-accounts/
  pages/
    UserAccountPage.tsx
    UserAccountPage.module.css
    PremiumFeaturesPage.tsx
  components/
    AccountProfileTab.tsx
    AccountHomeTab.tsx
    AccountHomeTab.module.css
    MyCommunitiesTab.tsx
    MyCommunitiesTab.module.css
    AccountSettingsTab.tsx
    AccountPreferencesPanel.tsx
    AccountPreferencesPanel.test.tsx
    OwnedCommunities.tsx
    ProfileOverview.tsx
    PremiumFeaturesPanel.tsx
  api.ts
```

Current Home children are HomeWelcomePanel.tsx/HomeWelcomePanel.module.css and HomeFeedPlaceholderCard.tsx/HomeFeedPlaceholderCard.module.css, extracted on 2026-10-25; see the current Account Home ownership section below. The tab modules replace the old MyHomePage/MyCommunitiesPage files and no longer need standalone-page/embedded variants. Shared primitives/visuals remain in src/components by explicit user clarification. ProfileOverview is reused by the community Profile page with its separate mock profile. The community preferences presenter now lives at features/communities/components/AccountPreferencesPanel.tsx; personal Settings uses only its own persisted discovery AccountPreferencesPanel and PremiumFeaturesPanel. UserAccountPage does not import the community Profile page. OwnedCommunities retains its existing Supabase read and stylesheet dependency; moving that data access and shared legacy CSS is a later concern, not part of this structural change. PremiumFeaturesPage has its own lazy route module. All URLs are unchanged.

### App and shared presenter style ownership (2026-10-21)

`App.module.css` owns shell/content/skip-link styles. `components/ui.module.css` is colocated with the existing `ui.tsx` shared presenters (Avatar, Tag, Heading, Tabs, Empty, Modal), and `GameArt.module.css` owns artwork base styles. Account navigation reuses the tab-container module class. Temporary global component hooks support unmigrated feature overrides; they no longer own these components' base styles. Future component-file extraction should move each presenter's module rules with it. Shared tokens and typography utilities remain global; feature and remaining shared-pattern migration is incremental.

### Community Home style ownership (2026-10-22)

`features/Home.module.css` now owns Community Home's hero/artwork placement, avatar stack, weekly rhythm, event filter chips, calendar, seasonal banner and guest membership strip, including responsive rules. Home.tsx uses local classes; shared typography, grids, controls and ActivityCard remain shared. Scoped global selectors only target shared child visuals/controls such as GameArt, Botanical, eyebrow and button hooks. Calendar tone utilities remain shared.

### Shared filter chips (2026-10-22)

`components/primitives/FilterChip.tsx` exports controlled FilterChip and labeled FilterChipGroup with colocated FilterChip.module.css. Home supplies its single category state and filtering callbacks. FilterChip now consumes dedicated --ct-filter-* roles and shared focus tokens from styles/tokens/semantic.css directly; its obsolete aliases are removed. Home.module.css retains parent layout/results separation. This supersedes Home ownership of chip base styling from the previous migration milestone. Callouts remain unchanged.

### Shared Notice (2026-10-22)

`components/primitives/Notice.tsx` and Notice.module.css own contextual notices. Props enforce fixed positive/pending/caution icons; informational supports contextual icons or icon=false. Icon paths live in the existing shared Icon presenter. The component does not assign a live-region role by default; callers retain explicit announcements. All former .notice consumers now use Notice except shared-table advice, which uses the existing guidance-note presentation. Removed global notice rules and account overrides; the championship panel retains its local composition spacing through championship-note. Auth error/recovery paragraphs are outside this migration.

### Shared PromotionalBanner (2026-10-22)

`components/shared/PromotionalBanner.tsx` and PromotionalBanner.module.css own the compact promotional presentation. Home supplies its copy, optional icon, action and guest-only visibility; Home.module.css owns only the promotion's external spacing. This supersedes Home's ownership of membership-strip presentation above. No billing or membership state logic moved into the shared component.

### Shared FeaturedActivityCard (2026-10-22)

`components/shared/FeaturedActivityCard.tsx` and FeaturedActivityCard.module.css own the featured activity presentation, including its date/callout roles and responsive image placement. Home provides the sample data, shared Tag/GameArt and existing activity-open callback. Home.module.css now owns only the featured card's external spacing; obsolete season-banner rules were removed. This supersedes the earlier Home ownership milestone for the seasonal banner.

### Shared HeroFeaturePanel (2026-10-22)

`components/shared/HeroFeaturePanel.tsx` and HeroFeaturePanel.module.css own the reusable feature invitation content. MeetPlay.module.css owns its hero placement and responsive divider. Removed obsolete match-callout rules from App.css and scoped remaining hero text selectors to the introduction so they do not override the shared panel. The remainder of Meet & Play styling awaits incremental migration.

### Shared InsightCard (2026-10-22)

`components/shared/InsightCard.tsx` and InsightCard.module.css own informational insight presentation. ProfileOverview uses it for both account Overview and community Profile. ProfileOverview.module.css owns the three-section stack spacing, avoiding reliance on legacy panel sibling rules. Removed connection-panel styling from App.css. The shared card owns no profile data access or feature state.

### Shared GuidanceNote (2026-10-22)

`components/shared/GuidanceNote.tsx` and GuidanceNote.module.css own static guidance presentation. MeetPlay.module.css and Community.module.css own external spacing for the etiquette reminder and member-dialog advice. Removed obsolete community-note rules from App.css. Other community styles remain for later migration.

Shared Empty styling (2026-10-23, batch thirteen accepted): two surface/radius aliases migrated in ui.module.css. ui.tsx, global typography, consumers and local composition remain unchanged.

Shared Tag styling (2026-10-23, batch fourteen accepted): six ui.module.css substitutions consume metadata roles and the 4px spacing primitive. No new token definitions, files or React API changes. Local label paints/geometry and caller overrides retain ownership.

Shared Avatar styling (2026-10-23, batch fifteen accepted): ui.module.css replaces the serif compatibility alias with the serif primitive and classifies peach as local decorative paint. No new token definitions, files, React API or ownership changes.

Shared Botanical assessment (2026-10-23, batch sixteen accepted): no token substitutions or new files. Botanical stays in ui.tsx as currentColor SVG artwork with a documented ownership comment. Caller-specific placement/paint remains in its existing App.css or CSS Module owner; these callers are not claimed as migrated by this assessment.

Shared Icon assessment (2026-10-23, batch seventeen accepted): only an ownership comment in ui.tsx; no token substitutions, new files, SVG changes or API changes. Caller styles and global SVG alignment/shrink behavior retain ownership.

Shared GameArt styling (2026-10-23, batch eighteen accepted): GameArt.module.css owns seven complete private palette mappings. GameArt.tsx consumes those variables and appends its variant module class; the TypeScript palette table is removed. Existing APIs, legacy hooks, fixed SVG details and caller sizing/cropping retain ownership. No new file or dependency.

Sidebar styling (2026-10-23, batch nineteen accepted): Sidebar.module.css consumes existing metadata/navigation roles and font/divider primitives. Local shell/brand/mobile-selected styling remains in place. Two obsolete aliases removed from semantic.css after their last consumers migrated; Sidebar.tsx and navigation APIs are unchanged.

Topbar styling (2026-10-23, batch twenty accepted): Topbar.module.css directly consumes metadata and divider/outline tokens. Removed the last-consumer --cream alias from semantic.css. Topbar.tsx, AccountActions, controls, local indicator/hover paints and responsive geometry remain unchanged.

Footer styling (2026-10-23, batch twenty-one accepted): Footer.module.css uses existing divider/serif primitives and 8px/32px spacing primitives. Footer.tsx, local branding and responsive composition remain unchanged; no new definitions, files or APIs.

App shell styling (2026-10-23, batch twenty-two accepted): App.module.css replaces skip-link color/padding references with existing primitives. Shell/content dimensions, breakpoints, skip-link positions, App.tsx and all layout-component ownership remain unchanged. No new token definitions, files or APIs.

Global styling (2026-10-23, batch twenty-three accepted): index.css consumes existing type/focus/transition tokens and paragraph-spacing/checkbox palette primitives. Native-field and selection exceptions stay global pending design review. Removed obsolete --green alias after its last consumer migrated; imports, selector order and component overrides remain intact.

Remaining global styling (2026-10-23, batch twenty-four accepted): App.css retains its feature composition, responsive rules and interaction overrides while consuming existing purpose-based tokens directly. Removed three zero-consumer aliases; no files, APIs or ownership boundaries moved.

Auth styling (2026-10-24, batch twenty-five accepted): src/features/Auth.css retains global auth layout and selectors while consuming existing tokens directly. No file/API moves or dependencies; the temporary browser sample was removed.

Community creation styling (2026-10-24, batch twenty-six accepted): CreateCommunity.css consumes existing role/spacing tokens and remains global with unchanged imports and selectors. Temporary verification sample removed; no file moves or component refactor.

MyHomeTab.module.css (2026-10-24, batch twenty-seven accepted) consumes existing tokens directly. CSS Module, AccountPanel action ownership, placeholder feed and navigation remain intact. No files or APIs moved.

AccountPanel.module.css (2026-10-24, batch twenty-eight accepted) keeps shared action-footer ownership for MyHomeTab, AccountPreferencesPanel and PremiumFeaturesPanel. Two token substitutions only; no component/API/file moves.

UserAccountPage.module.css (2026-10-24, batch twenty-nine accepted) retains account-scoped overrides and CSS Module ownership, now using existing role tokens directly. No React, route or file moves.

ProfileOverview.module.css (2026-10-24, batch thirty accepted) retains shared account/community presenter ownership and directly consumes section-gap. One substitution; no API/file moves.

MyCommunitiesTab.module.css (2026-10-24, batch thirty-one accepted) directly consumes existing tokens; OwnedCommunities retains separate styling/query ownership. No files, APIs or route changes.

OwnedCommunities.module.css (2026-10-24, batch thirty-two accepted) uses ref-space-4 for local card text spacing. One declaration change; no file/API/query changes.

Home.module.css (2026-10-24, batch thirty-three accepted) directly consumes tokens and retains hero/rhythm/calendar composition, media queries and illustration ownership. No files or APIs moved; 20 obsolete compatibility aliases removed.

MeetPlay.module.css (2026-10-24, batch thirty-four accepted) directly consumes existing spacing tokens; no file, API or ownership changes.

Community.module.css (2026-10-24, batch thirty-five accepted) directly consumes section-gap for member-preview guidance. Removed the obsolete compatibility block from semantic.css; no files or APIs moved.

Final token audit (2026-10-24): all 32 source CSS files and 88 CSS/JS/TS-family files inspected for token references. No compatibility definitions remain. Audit findings live in docs/14-design-tokens.md; no new tooling, dependencies or application files.


## CommunitiesList replacement — current 2026-10-24

Removed user-accounts/components/OwnedCommunities.tsx and its module. MyCommunitiesTab now owns request/filter/state orchestration; user-accounts/communities.ts owns typed view reads and normalization. CommunitiesList.tsx/module own the semantic list and vertical spacing; CommunityCard.tsx/module own shared real/sample content and responsive layout. Previous OwnedCommunities references above describe historical migration stages, not current files or query ownership. Auth/CreateCommunity API extraction remains separate work; this slice adds no dependencies.


Account navigation refinement (2026-10-24): one ordered accountTabs definition in app/navigation.ts owns Home, Profile, Communities and Settings IDs/labels/paths and derives the narrow AccountTab type. Router registration, tab links and shell labels use that definition; UserAccountPage renders by stable ID without parallel arrays or a label-based fallback. Profile is /account/profile (account-profile ID); /account is a separate navigation root that replace-redirects to /account/home, as does /. Sidebar/mobile account links retain subtree matching. Personal breadcrumbs read My Account / destination. Premium Features remains separate. This supersedes earlier Overview-at-root and My Home/My Communities tab-label references; domain scope and auth return paths are unchanged.

## Settings presentation ownership — 2026-10-25

Implemented locally under the approved page-by-page refactor plan. AccountSettingsTab remains the coordinator and consumes hooks/useAccountPreferences.ts plus the synchronous readPremiumFeaturePlaceholders API. AccountPreferencesPanel, AccountPreferenceSwitch and PremiumFeaturesPanel receive controlled props/callbacks; their presentation files have no API, account-context or mock-store imports. Preference contracts and PremiumFeaturePlaceholder now live in user-accounts/types.ts; api.ts retains compatible preference type exports.

Each presenter/tab owns its new colocated CSS Module. AccountPanel.module.css still owns shared action footers, while the communication-heading rule belongs to AccountPreferencesPanel.module.css. Settings stack and premium-list ownership no longer live in UserAccountPage.module.css/App.css. Shared setting-row rules remain for account/premium/community consumers; the account switch owns a scoped control implementation with documented preserved local values. No new universal Card/switch primitive, shared token or dependency.

A pre-existing router mismatch passed tab to UserAccountPage, whose contract expects page. Corrected the prop at the route composition call so account contents render again. Profile/editor/mock-model ownership outside Settings remains for later reviewed slices. See docs/12 for verification and docs/15 for the workflow.

## Account Home presentation ownership — 2026-10-25

Current /account/home composition is UserAccountPage -> AccountHomeTab -> HomeWelcomePanel and three HomeFeedPlaceholderCard instances. MyHomeTab.tsx/MyHomeTab.module.css were renamed to AccountHomeTab.tsx/AccountHomeTab.module.css; UserAccountPage imports/renders the new name. Both children live under user-accounts/components beside their own CSS Modules. AccountHomeTab.module.css owns the inherited decorative color, external separation and grid/stack behavior. Child modules own welcome/illustration and placeholder-card internals respectively. AccountPanel.module.css remains shared and unchanged.

Static feedPlaceholders copy stays in AccountHomeTab; no feature API, hook, schema, dependency or shared primitive was added. Older dated MyHomeTab migration/consumer notes remain historical. Routes/auth gates are unchanged; see docs/12 for evidence.

## Account insights carousel — 2026-10-25

components/shared/InsightsCarousel.tsx and its CSS Module provide controlled collection presentation using the existing InsightCard and Button. UserAccountPage owns activeInsightIndex and maps the synchronous readAccountProfileInsights API data into visual card props. The feature AccountProfileInsight type contains text/icon-name data, not React elements.

AccountProfileTab passes the carousel through the current ProfileOverview's optional insights presentation slot. This is a temporary account-only integration seam while the broader Profile plan is under review; community Profile continues to use its existing InsightCard fallback. No profile-state/model sharing, community data/API changes or other Profile component extraction occurred. See docs/15 for the authorized scope and docs/12 for verification.


### Account Profile extraction — current 2026-10-25

- user-accounts/pages/UserAccountPage.tsx: account identity, editor/selection coordination and feature placeholder reads; no useMockState. Its page module retains general account typography; former profile-specific cascade/layout overrides have moved to the children.
- user-accounts/components/AccountProfileTab(.module.css): account columns/main stack and direct composition of ProfileSidebar, ProfileAboutPanel, InsightsCarousel and FavoriteGamesPanel.
- ProfileSidebar, ProfileAboutPanel, FavoriteGamesPanel and ProfileEditModal: feature-local controlled presenters with matching modules. Parent supplies mock details, real fields, editable drafts, feedback and callbacks.
- user-accounts/types.ts and api.ts: AccountProfilePlaceholders/ProfileFieldErrors and readAccountProfilePlaceholders; existing insights fixture and real profile read/save functions remain separate.
- communities/components/CommunityProfileOverview(.module.css): relocated legacy community-only overview, imported by features/Profile.tsx. Replaces the former user-accounts/components/ProfileOverview location and removes its temporary insights slot. Its legacy MockModel contract remains local to the unrefactored community composition.
- components/GameArt.tsx: owns GameArtVariant; mock/data.ts Art is a compatibility alias. Artwork and CSS unchanged.

These current paths supersede the earlier proposed/shared ProfileOverview descriptions. No account/community profile unification. Communities is the next account tab requiring its own plan review after Profile completion review.

User-account hooks plan clarification (2026-10-25): consolidate hooks/useAccountPreferences.ts into user-accounts/hooks.ts and add useAccountCommunities as another independent named export. Update consumer/test imports; do not add hooks/useAccountCommunities.ts. Existing hook tests may remain grouped by behavior. Current profile provider/context remain under auth and are not moved as part of this Communities plan; profile API/placeholder functions already live in user-accounts/api.ts. No runtime changes yet.

Agreed auth/account ownership target (2026-10-25, not yet implemented): user-accounts/hooks.ts owns useUserAccount data lifecycle and the useAccount context accessor; user-accounts/accountContext.ts declares AccountContext and types.ts owns AccountSummary. AuthShell calls the data hook once with verified identity and supplies one shared context, replacing the nested auth/AccountProfileProvider.tsx. auth/AccountActions.tsx remains sign-in/out UI. Auth.tsx/Auth.css retain current session/auth-form handling until their own page review. Earlier statements excluding shared-profile relocation from this account slice are superseded by the user's agreed hook-ownership simplification; see docs/15.


## Communities and account data ownership — current 2026-10-25

Implemented after the user's final plan approval; this inventory supersedes the preceding proposed hooks/provider locations and earlier MyCommunitiesTab/communities.ts runtime paths:

- user-accounts/api.ts now contains readMyCommunities, toCommunityCards and readAccountSampleCommunity alongside existing profile/preferences/mock functions. user-accounts/communities.ts is removed. API tests remain separated by behavior.
- user-accounts/types.ts owns AccountSummary, CommunityFilter, CommunitySummary and CommunityCardData alongside existing account contracts.
- user-accounts/hooks.ts exports useUserAccount, useAccount, useAccountPreferences and useAccountCommunities. Former hooks/useAccountPreferences.ts is consolidated here; preferences.hooks.test.ts preserves its coverage and profile.hooks.test.tsx replaces/extends the former provider tests.
- user-accounts/accountContext.ts declares the one shared AccountContext. AuthShell composes the profile hook result and session summary into it; the auth/AccountProfileProvider and auth/accountContext sources are removed. AccountActions stays under auth; all consumers use the relocated account hook/context imports.
- user-accounts/components/AccountCommunitiesTab(.module.css) replaces MyCommunitiesTab and coordinates the feature hooks/API fixture with controlled CommunitiesToolbar(.module.css), existing CommunitiesList and CommunityCard. Toolbar CSS owns responsive alignment/spacing; CommunityCard CSS now owns metadata typography. UserAccountPage no longer imports mock/data or forwards previewName/previewLocation.

No route changes, new API/schema behavior, query dependencies or auth-page redesign. Auth.tsx/Auth.css keep current session/forms/redirects; its single provider preserves identity-keyed child reset behavior. Earlier dated sections remain historical implementation/review records. See docs/12 for current verification.

### Community Home extraction — implemented 2026-10-25

Removed features/Home.tsx and Home.module.css. app/pages/CommunityHomePage.tsx and its module own outer composition, UI state and section placement. app/pages/components/CommunityHomeHero and CommunityWeeklySchedule own their internal presentation/modules. features/events/components/CommunityEventsSection and EventCalendar are controlled presenters with colocated modules. Shared Heading, Tabs, FilterChip/FilterChipGroup, Button, Empty, ActivityCard, FeaturedActivityCard, PromotionalBanner, Tag, Icon, Botanical and GameArt remain reused.

communities/api.ts adds readCommunityHomeContent and communities/types.ts defines its contract; no second community API file. New events/api.ts contains readCommunityHomeEvents and selectCommunityEvents; events/types.ts owns the card/feed/calendar contracts. Only the compatibility API imports legacy Activity/SeatStatus. App remains the single mock simulation owner and router bridges its current items/seats/callbacks into the new page. ActivityCard's data prop narrows without modifying legacy consumers; its shared dialog is retained. lib/dateTime.ts owns unchanged formatters, with mock/format.ts re-exporting them for remaining callers.

The preceding Home CSS/FilterChip/banner extraction entries are historical milestones, superseded by this file ownership. Calendar tone utilities and section-heading/card-grid shared styles remain reused. Paid preview removal is deferred for this structural iteration by the user's explicit preservation instruction; it remains a later domain-refactor discrepancy.

### Meet & Play extraction — implemented 2026-10-25

Replaced flat features/MeetPlay.tsx/MeetPlay.module.css with features/meet-and-play/pages/MeetPlayPage and components/MeetPlayHero, TableFilters, CreateTableModal and MatchingPreferencesModal, each with a colocated CSS Module. Page owns transient browsing/modal/draft/error state; children receive controlled props/callbacks and no fixture/store/API imports. Shared HeroFeaturePanel, ActivityCard, GuidanceNote, Modal, Tabs, Heading, Button, Notice, Empty, Icon and Botanical remain reused.

One meet-and-play/api.ts supplies readMeetPlayContent/readMeetPlayTables/selectMeetPlayTables/createMockTable/saveMockMatchingPreferences; types.ts owns their presentation/draft contracts and reuses ActivityCardData. Legacy Activity/SeatStatus stay at the API compatibility boundary. Router supplies narrow snapshot/actions, applying API command results to the same App-owned simulation. No new hook/store or real data source. Global meet-banner rules moved to MeetPlayHero.module.css and were removed after verifying zero remaining consumers. Shared search/filter/form rules remain for Discussion/other dialogs; TableFilters and modal modules own local placement. Earlier MeetPlay.module.css milestones above are historical, superseded by this ownership.

### Championship extraction — implemented 2026-10-25

Replaced flat features/Championship.tsx with features/championships/pages/ChampionshipPage and components/ChampionshipHero, ChampionshipStats, ChampionshipOverview, ChampionshipLeaderboard, ChampionshipMatches, ChampionshipFinalTable, PastChampions, ChampionshipEntryModal, MatchResultModal and ChampionshipRulesModal. Each page/presenter owns a colocated CSS Module; the page owns UI state and external stats-strip spacing. Shared primitives/artwork/native form conventions remain reused.

One championships/api.ts owns readChampionshipContent/readChampionshipStandings/readChampionshipMatches and registerMockChampionship/submitMockMatchResult/confirmMockMatchResult/disputeMockMatchResult. types.ts owns display/draft contracts; legacy Result stays at the API/router compatibility boundary. Router passes narrow props and applies command results to the existing App simulation; no hook/store is added. Only zero-consumer Championship-specific global rules were removed. Shared panel/form/host/actions/rules/small-art/tags conventions remain for other consumers. Earlier Championship-in-App.css milestones describe historical ownership; the domain route proposals above remain future designs.

### Discussion extraction — implemented 2026-10-25

Removed features/Community.tsx and Community.module.css. features/discussion/pages/DiscussionPage composes DiscussionHero, DiscussionTopics, DiscussionBoard, MemberDirectory, GameRecommendations, LocalSpots, NewDiscussionModal, DiscussionThreadModal, MemberPreviewModal, DiscussionGuidelinesModal and LocalSpotModal under components. Each page/presenter has a colocated CSS Module. The page owns browsing/modal/draft state and external hero/board placement; no generic row/card/map framework was added.

One discussion/api.ts exports readDiscussionContent/readDiscussionPosts/readDiscussionTopics/selectDiscussionPosts/selectDiscussionMembers/selectLocalSpots/createMockDiscussion/replyToMockDiscussion/toggleMockSavedGame. types.ts owns display/draft contracts. Existing App mock state remains authoritative and router applies command outcomes; legacy Post stays at that compatibility boundary. Sample members/topics can remain in mock/data for the API to project without UI imports. Discussion's social capability is separate from communities/api.ts, which continues owning community profiles/management content. No new hook/store or service.

Discussion-specific global hero/topic/post/member-card/recommendation/map/place-card/thread-title/reply-bubble rules moved to owning modules after consumer checks. Shared member-preview/description remain for community Profile; shared form/search/filter/panel/host/rules/small-art conventions remain for current consumers. ActivityDialog's separate scoped chat/detail styles are unchanged. Earlier Community.module.css guidance/token milestones describe historical ownership, superseded by MemberPreviewModal.module.css.

### Community Profile extraction — implemented 2026-10-27

Removed flat features/Profile.tsx. communities/pages/CommunityProfilePage and its module own coordination/external layout. communities/components now contains CommunityProfileSidebar, CommunityProfileOverview (retained), CommunityAboutPanel, CommunityFavoriteGamesPanel, CommunityActivityPanel, CommunityMembershipPanel, CommunityPreferencesPanel (renamed from the community AccountPreferencesPanel), CommunityProfileEditModal, CommunityProfilePreviewModal and CommunitySupportModal, each with colocated CSS. Account-owned profile components remain independent.

Extended the existing communities/api.ts/types.ts with readCommunityProfileContent/Details/Preferences/Activity, saveMockCommunityProfile, changeMockCommunityPreference, saveMockCommunityPreferences and saveMockCommunitySupportNote plus feature-owned contracts. No second community API. The current App simulation and router compatibility bridge remain; real community API functions are unchanged. UI has no mock/store imports or direct mutations. Activity listing excludes address/detail payload and uses lib/dateTime's unchanged formatter.

Moved zero-consumer global profile/sidebar/favorites/activity/achievement/membership/interest/support rules into owning modules. Shared switch row, benefits, member-preview/description, native-field/panel/host and other still-consumed conventions remain for account, Discussion and App dialogs. Earlier Profile/overview/preferences global ownership milestones are historical. Current source inventory supersedes the flat Profile path above; real profile-bearing joining and future domain work remain planned.

## Implemented Authentication structure — 2026-10-27

The flat features/Auth.tsx is replaced by features/auth/AuthShell.tsx and its CSS Module. auth/hooks.ts contains useAuth; auth/api.ts is the sole Auth service boundary; auth/types.ts owns narrow screen/credential/action contracts. auth/pages/AuthPage.tsx composes auth/components/AuthCredentialForm, ConfirmationEmailPanel, AuthNavigation and AuthFeedback, each with a colocated module. AuthShell.test.tsx moved into auth alongside api.test.ts/hooks.test.tsx and pages/AuthPage.test.tsx. lib/supabase.test.tsx retains the actual SDK pre-mount callback regression cases.

At the Auth completion checkpoint, Auth.css retained only auth-page/auth-links/auth-error rules required by CreateCommunity; that temporary stylesheet is now removed by the creation slice below. New Auth presenters use scoped modules and shared native form/panel/control conventions. The legacy auth-error hook remains for shared selectors/account exclusions. The Auth checkpoint retained App.css creation-card wrapping/shared error styling and removed zero-consumer auth-card; creation-card wrapping now belongs to the creation module. Earlier dated Auth.tsx/Auth.css descriptions are historical. Shared ActivityDialog and App-level dialogs/actions remain structural targets requiring separate plans. No extra Auth provider/store/barrel or dependencies were added.

## Implemented Create Community structure — 2026-10-27

Removed flat features/CreateCommunity.tsx/CreateCommunity.css and lib/tenantCreation.ts. communities/pages/CreateCommunityPage.tsx composes components/CommunityCreationForm.tsx and CommunityCreatedPanel.tsx, each with a colocated module. Participation remains inside the form. communities/hooks.ts contains useCommunityCreation; the existing api.ts/types.ts are extended and creation.ts owns domain helpers. Creation tests moved to pages/CreateCommunityPage.test.tsx; creation.api.test.ts and hooks.test.tsx cover the new boundaries. creation.api.test.ts is a test file, not a second API.

AuthShell lazily imports the new page and no longer imports Auth.css, which has no remaining consumers and is removed. Only zero-consumer App.css creation-card wrapping was removed; shared error styling/legacy hooks required by AuthFeedback and account exclusions remain. All other page routing, real persistence and mock ownership remain unchanged. See docs/12 for evidence and emitted-bundle tradeoff.

## Implemented shared activity presentation — 2026-10-27

components/shared/ActivityCard.tsx exports the controlled event/table card and ActivityCardData; its existing module moved unchanged alongside it. events/types.ts and meet-and-play/types.ts consume that shared shape via type-only imports. CommunityEventsSection and MeetPlayPage use the shared card directly. Removed components/Activity.tsx and its two old module locations.

App now lazily imports app/ActivityDialogController, which owns checkout/message draft state and adapts the App MockModel to feature projections/callbacks. events/components owns controlled ActivityDialog, ActivityDetailsPanel and ActivityReservationPanel; meet-and-play/components owns TableSeatRequestsPanel and TableConversationPanel. Each presenter has a module. Children slots keep cross-feature composition in app, with no events-to-Meet-&-Play runtime UI dependency. Modal, artwork, controls, avatars, tags and notices retain their owners.

The existing events/api.ts owns readActivityDetails/reserveMockActivity/cancelMockActivityReservation; meet-and-play/api.ts owns readTableSeatRequests/readTableConversation/decideMockTableSeatRequest/sendMockTableMessage. types.ts files own detail/status/request/message contracts. useMockState retains the same lifetime and functional setters, delegates join/cancel/decision transitions and exposes sendMessage instead of a public setMessages. No new store/hook/barrel/service or real API. Earlier Activity.tsx ownership records are historical; App membership/notification dialogs remain the next separately reviewed target.

## Implemented App dialogs and preview actions — 2026-10-27

communities/components/MembershipPreviewModal.tsx and CommunityGuestGate.tsx plus notifications/components/CommunityNotificationsModal.tsx own the extracted markup/CSS Modules. App imports controlled modal presenters and reads content through communities/notifications APIs; router replaces inline gate markup with CommunityGuestGate. Shared .benefits/.round-icon utilities retain their other consumers. Only zero-consumer membership/paywall-price/gate/notification rules and owned responsive overrides were removed from App.css.

Extended existing communities/api.ts/types.ts with preview identity/benefits/switching. Added one notifications/api.ts/types.ts and colocated API/presenter tests for the existing inbox; no other notification infrastructure. useMockState owns member/notices and applies named feature commands rather than exposing setMember/setNotices to UI. Initial unrelated prototype records and router outcome adapters remain intentionally retained. App's approved state names are selectedActivityId/isMembershipPreviewOpen/isNotificationsOpen; route/key/visibility behavior is unchanged. See docs/15 for the completed original page/dialog inventory and distinct remaining follow-ups.
