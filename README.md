# The Crowded Table

A gaming-community app where users can create and manage communities and belong to more than one. The frontend currently combines real account/community-creation flows, personal-page stubs, and a sample Tegucigalpa community. Built with React, TypeScript, Vite, and React Compiler.

## Run locally

From the repository root:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite to land on **My Home** (`#my-home`), a personal-feed stub. **My Communities** (`#my-communities`) is a separate stub for communities you belong to/manage. The community sections are **Community Home** (`#community-home`), **Meet & Play** (`#meet-play`), **Championship** (`#championship`), **Discussion** (`#discussion`), and **Profile** (`#profile`). Legacy `#home` and `#community` bookmarks still open Community Home and Discussion.

For real authentication, copy `.env.example` to ignored `.env.local` and set the Supabase project URL and public publishable (or legacy anon) key. Never use a secret/service-role key in Vite variables. Restart Vite after changing environment configuration. Use `http://localhost:5173` for the currently configured hosted redirects; do not silently switch ports. Without public client configuration, the preview remains available and account forms report that services are not configured.

The account bar supports email/password signup, confirmation/resend, sign-in, persistent sessions, sign-out on this browser, and password recovery. `/auth/callback` completes confirmation and returns to My Home; `/auth/reset-password` keeps the user in the password-change flow. Deployment hosting must serve the app at these paths. This client-only implementation explicitly uses Supabase's implicit flow and consumes/removes callback credentials through the SDK. Reassess PKCE when introducing server-side rendering. Authentication grants no simulated membership or tenant permissions.

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

After signing in with a verified account, choose **Start New Community** in the account bar. Enter a name, permanent unique handle, country, optional state/province and city, and community time zone. Participation is optional and unchecked initially. Creation calls `create_tenant` once: the database atomically creates the tenant, default settings, owner assignment, and (if selected) an approved community account. Ownership does not require participation.

**Your communities** reads saved tenants under owner-only database policies and remains available after refreshing and signing in again. It is an ownership list, not a public directory or tenant switcher. Profile setup, joining existing communities, and management screens remain follow-up work. If a request fails without a definite result, check this list before retrying creation.

## Explore the prototype

The sidebar's name, subtitle, location, five community links, and motto belong to the sample community. The lower account area contains My Communities and My Home and shows the real account identity when signed in. Personal links also appear above content on mobile. My Home has clearly marked placeholders for community updates, upcoming RSVPs, and interest/history-based event suggestions; it does not currently load personal activity. My Communities links to the sample community without claiming the user has joined it.

The community preview starts as sample member Ana M.; use **Preview as Member / Guest** to compare simulated access. Community activities/profile edits remain in-memory and refreshing restores sample data. Simulated payments never charge anyone. The separate account bar uses real Supabase Auth and supports persisted community creation and an owner list when configured. The five preview sections still use sample data. Client-side preview gating is not production security, and installed/offline PWA support remains unimplemented.

See the [prototype guide](docs/10-frontend-prototype.md) for the available flows, design decisions, and limitations. See [planning documents](docs/README.md) for the product and architecture plans, and `docs/visuals/` for the reference infographics.

## Source layout

These paths describe the current implementation. The [canonical client architecture](docs/05-frontend-patterns.md) and [illustrative layout/refactor inventory](docs/07-file-structure.md) guide upcoming work; they distinguish accepted boundaries from conventions and structures to introduce only when needed.

- `src/App.tsx`: application composition, membership preview, and shared dialogs; `src/app/navigation.ts` owns current hash navigation.
- `src/app/layout/`: community sidebar and personal navigation; `src/app/pages/MyHomePage/`: personal-feed stub.
- `src/features/`: community Home/events, Meet & Play, Championship, Discussion (legacy `Community.tsx`), and community Profile; `src/features/communities/pages/`: My Communities stub.
- `src/features/Auth.tsx`, `CreateCommunity.tsx`, `OwnedCommunities.tsx`: real account flows, community creation, and the owner list, alongside the preview screens.
- `src/features/auth/accountContext.ts`: safe account summary for application UI, separate from the mock community profile.
- `src/lib/`: Supabase setup/generated schema types and current tenant-creation helpers (domain helpers are a refactor candidate).
- `src/mock/`: typed sample data, in-memory state/actions, date formatting.
- `src/components/`: reusable controls, local vector game art, activity cards/details.
- `src/index.css`, `src/App.css`, and feature `.css` files: current global visual system and layouts; component styles will migrate to CSS Modules.

The illustrations and icons are local SVG components. Google Fonts supplies DM Sans and Libre Caslon Display when available; system sans-serif and Georgia are fallbacks. Real account flows use `@supabase/supabase-js`; component tests use Vitest and Testing Library.
