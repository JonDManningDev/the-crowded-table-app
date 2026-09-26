# The Crowded Table

Interactive frontend prototype for a private board-gaming community in Tegucigalpa. Built with React, TypeScript, Vite, and React Compiler.

## Run locally

From the repository root:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The five sections are also addressable with `#home`, `#meet-play`, `#championship`, `#community`, and `#profile`.

```sh
npm run build
npm run lint
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

Start as Ana M., a member, and use **Preview as Member / Guest** in the header to compare access. All actions are in-memory; refreshing restores the sample data. Simulated payments never charge anyone. There is no auth server, API, database, or installed/offline PWA implementation yet. Client-side gating demonstrates the intended UX, not production security.

See the [prototype guide](docs/10-frontend-prototype.md) for the available flows, design decisions, and limitations. See [planning documents](docs/README.md) for the product and architecture plans, and `docs/visuals/` for the reference infographics.

## Source layout

- `src/App.tsx`: shell, hash navigation, membership preview, shared dialogs.
- `src/features/`: Home/events, Meet & Play, Championship, Community, Profile.
- `src/mock/`: typed sample data, in-memory state/actions, date formatting.
- `src/components/`: reusable controls, local vector game art, activity cards/details.
- `src/index.css`, `src/App.css`: shared visual system and responsive layouts.

The illustrations and icons are local SVG components. Google Fonts supplies DM Sans and Libre Caslon Display when available; system sans-serif and Georgia are fallbacks. No additional runtime packages were added for this prototype.
