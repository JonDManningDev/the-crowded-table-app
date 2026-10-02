# The Crowded Table

Interactive frontend prototype for a private board-gaming community in Tegucigalpa. Built with React, TypeScript, Vite, and React Compiler.

## Run locally

From the repository root:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The five sections are also addressable with `#home`, `#meet-play`, `#championship`, `#community`, and `#profile`.

For real authentication, copy `.env.example` to ignored `.env.local` and set the Supabase project URL and public publishable (or legacy anon) key. Never use a secret/service-role key in Vite variables. Restart Vite after changing environment configuration. Use `http://localhost:5173` for the currently configured hosted redirects; do not silently switch ports. Without public client configuration, the preview remains available and account forms report that services are not configured.

The account bar supports email/password signup, confirmation/resend, sign-in, persistent sessions, sign-out on this browser, and password recovery. `/auth/callback` completes confirmation and returns home; `/auth/reset-password` keeps the user in the password-change flow. Deployment hosting must serve the app at these paths. This client-only implementation explicitly uses Supabase's implicit flow and consumes/removes callback credentials through the SDK. Reassess PKCE when introducing server-side rendering. Authentication grants no simulated membership or tenant permissions.

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

## Explore the prototype

The community preview starts as sample member Ana M.; use **Preview as Member / Guest** to compare simulated access. Community activities/profile edits remain in-memory and refreshing restores sample data. Simulated payments never charge anyone. The separate account bar uses real Supabase Auth when configured. Database migrations exist, but community screens are not yet connected to those commands. Client-side preview gating is not production security, and installed/offline PWA support remains unimplemented.

See the [prototype guide](docs/10-frontend-prototype.md) for the available flows, design decisions, and limitations. See [planning documents](docs/README.md) for the product and architecture plans, and `docs/visuals/` for the reference infographics.

## Source layout

- `src/App.tsx`: shell, hash navigation, membership preview, shared dialogs.
- `src/features/`: Home/events, Meet & Play, Championship, Community, Profile.
- `src/mock/`: typed sample data, in-memory state/actions, date formatting.
- `src/components/`: reusable controls, local vector game art, activity cards/details.
- `src/index.css`, `src/App.css`: shared visual system and responsive layouts.

The illustrations and icons are local SVG components. Google Fonts supplies DM Sans and Libre Caslon Display when available; system sans-serif and Georgia are fallbacks. Real account flows use `@supabase/supabase-js`; component tests use Vitest and Testing Library.
