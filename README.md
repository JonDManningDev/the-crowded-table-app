# The Crowded Table

A gaming-community app where users can create and manage communities and belong to more than one. The frontend currently combines real account/community-creation flows, personal-page stubs, and a sample Tegucigalpa community. Built with React, TypeScript, Vite, and React Compiler.

## Run locally

From the repository root:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite to land on **My Home** (`/account/home`), a personal-feed stub. **My Communities** (`/account/communities`) combines fetched owned communities and the sample row. Both are tabs of **My Account**, alongside **Overview** (`/account`) and **Settings** (`/account/settings`). The community sections are **Community Home** (`/community/preview`), **Meet & Play** (`/community/preview/meet-play`), **Championship** (`/community/preview/championship`), **Discussion** (`/community/preview/discussion`), and **Profile** (`/community/preview/profile`). Old hash routes are unsupported; no compatibility redirects are installed.

For real authentication, copy `.env.example` to ignored `.env.local` and set the Supabase project URL and public publishable (or legacy anon) key. Never use a secret/service-role key in Vite variables. Restart Vite after changing environment configuration. Use `http://localhost:5173` for the currently configured hosted redirects; do not silently switch ports. Without public client configuration, the preview remains available and account forms report that services are not configured.

Auth supports email/password signup, confirmation/resend, sign-in, persistent sessions, sign-out on this browser, and password recovery. `/auth/callback` completes confirmation and returns to My Home; `/auth/reset-password` keeps the user in the password-change flow. Deployment hosting must serve `index.html` for direct application-route requests (SPA fallback), including all account, auth, and sample-community paths, while serving assets normally. Vite supplies this fallback locally. This client-only implementation explicitly uses Supabase's implicit flow and consumes/removes callback credentials through the SDK. Reassess PKCE when introducing server-side rendering. Authentication grants no simulated membership or tenant permissions.

```sh
npm run build
npm run lint
npm test
npm run preview
```

If the machine's global npm launcher is broken but dependencies are already installed, use the local entry points:

```sh
node node_modules/vite/bin/vite.js --host 127.0.0.1
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
node node_modules/eslint/bin/eslint.js .
```

## Create a community

After signing in with a verified account, choose **Start New Community** in the My Communities tab. Enter a name, permanent unique handle, country, optional state/province and city, and community time zone. Participation is optional and unchecked initially. Creation calls `create_tenant` once: the database atomically creates the tenant, default settings, owner assignment, and (if selected) an approved community account. Ownership does not require participation.

**My Communities** reads saved tenants under owner-only database policies and remains available after refreshing and signing in again. It is an ownership list, not a public directory or tenant switcher. Global name/bio editing is implemented; curated profile UI, joining existing communities, and community management screens remain follow-up work. If a request fails without a definite result, check this list before retrying creation.

## Account implementation and deployment

Global display name/bio and the two discovery preferences persist through verified-caller commands. Account Overview alone shows the profile summary. Other overview statistics/interests/games, notification preferences, premium subscriptions and the Explore Premium Features destination remain explicit placeholders. `/community/preview/profile` still edits the sample community profile in memory, separately from the global profile.

All five migration versions through `20261016000200` were applied to local and hosted testing Supabase (`fsnipgsrlclbnfepcbvz`). Hosted migration history matched and the post-deployment dry run was empty on 2026-10-16. Frontend changes are local source/build work; no frontend hosting deployment was performed. See the [implementation audit](docs/12-implementation-status.md) for verification and remaining scope.

## Explore the prototype

Current design note (2026-10-12): the member/guest paywalls and payment simulations described below are legacy prototype behavior awaiting removal in the domain refactor. [Accepted plans](docs/08-decisions-and-open-questions.md#events-tables-and-invitations--2026-10-12) defer payments and paid memberships to a late stage. The planned table flow supports automatic/manual whole-group confirmation with no response window; the prototype does not yet implement the complete new domain model.

The sidebar's name, subtitle, location, five community links, and motto belong to the sample community. The lower account area contains a single padded account link and shows the real account identity when signed in. It stays active across account pages; the mobile personal navigation uses the same single account destination. My Communities and My Home remain in the account tabs. My Home has clearly marked placeholders for community updates, upcoming RSVPs, and interest/history-based event suggestions; it does not currently load personal activity. My Communities includes the sample as a labeled row alongside fetched owned communities, without claiming it is joined. The account row links to Overview and uses the persisted display name with a one-character badge and ellipsis truncation.

The community preview starts as sample member Ana M.; use **Preview as Member / Guest** to compare simulated access. Community activities/profile edits remain in-memory and refreshing restores sample data. Simulated payments never charge anyone. The auth bar and global preview disclaimer are removed. Sign Out is at the right of the breadcrumb; signed-out users get Sign in/Create Account there. Community creation returns to the consolidated My Communities tab. The five preview sections still use sample data. Client-side preview gating is not production security, and installed/offline PWA support remains unimplemented.

See the [prototype guide](docs/10-frontend-prototype.md) for the available flows, design decisions, and limitations. See the [UI style guide](docs/13-ui-style-guide.md) for canonical control patterns. See [planning documents](docs/README.md) for the product and architecture plans, and `docs/visuals/` for the reference infographics.

## Source layout

These paths describe the current implementation. The [canonical client architecture](docs/05-frontend-patterns.md) and [illustrative layout/refactor inventory](docs/07-file-structure.md) guide upcoming work; they distinguish accepted boundaries from conventions and structures to introduce only when needed.

- `src/App.tsx`: application composition, membership preview, and shared dialogs; `src/app/router.tsx` composes React Router routes and `src/app/navigation.ts` owns shared URL constants.
- `src/app/layout/`: community sidebar and personal navigation.
- `src/features/`: community Home/events, Meet & Play, Championship, Discussion (legacy `Community.tsx`), and community Profile.
- `src/features/Auth.tsx`, `CreateCommunity.tsx`: real authentication flows and community creation.
- `src/features/user-accounts/pages/`: UserAccountPage and PremiumFeaturesPage; `components/`: AccountOverviewTab, MyHomeTab, MyCommunitiesTab, AccountSettingsTab and their account-specific children (including OwnedCommunities and AccountPreferences).
- `src/features/auth/accountContext.ts`: safe account summary for application UI, separate from the mock community profile.
- `src/lib/`: Supabase setup/generated schema types and current tenant-creation helpers (domain helpers are a refactor candidate).
- `src/mock/`: typed sample data, in-memory state/actions, date formatting.
- `src/components/`: reusable controls, local vector game art, activity cards/details; `primitives/Controls.tsx` provides semantic links, action links, buttons and route-aware navigation with shared CSS Module styles.
- `src/index.css`, `src/App.css`, and feature `.css` files: current global visual system and layouts; component styles will migrate to CSS Modules.

The illustrations and icons are local SVG components. Google Fonts supplies DM Sans and Libre Caslon Display when available; system sans-serif and Georgia are fallbacks. Real account flows use `@supabase/supabase-js`; component tests use Vitest and Testing Library.
