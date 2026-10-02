# Application file structure plan

Status: proposed production target, with an interactive frontend prototype now implemented.

## Existing repository

The accidental duplicate directory has been removed. The Vite app now lives directly at the repository root: `src/`, `public/`, `package.json`, and `vite.config.ts` sit alongside `docs/`. Run `npm run dev`, `npm run build`, `npm run lint`, and `npm run preview` from the repository root. The planned `supabase/` directory will also live at the root. Do not create speculative feature folders before they are needed.

## Target layout as features are implemented

The current prototype uses `src/App.tsx` for composition, `src/features/*.tsx` for the five sections, `src/components/` for shared UI/activity views, and `src/mock/` for typed fixtures, formatting, and in-memory actions. This is deliberately smaller than the production target below. See [the prototype guide](10-frontend-prototype.md) for coverage and limitations. No `supabase/` backend or PWA service worker has been created.

```text
repository/
├── docs/
├── public/icons/                      # PWA assets when created
├── src/
│   ├── app/
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── layouts/                   # Five-tab member/guest shell; admin
│   ├── features/
│   │   ├── auth/
│   │   ├── tenancy/                   # Current community context
│   │   ├── membership/                # Benefits, paywall, access state
│   │   ├── home/                      # Official feed and seasonal highlight
│   │   ├── official-events/           # List/calendar, admission, My Events
│   │   ├── meet-play/                 # Tables, requests, My Tables, matching
│   │   ├── participation/             # Shared seat-state presentation/contracts
│   │   ├── table-chat/
│   │   ├── championship/
│   │   ├── community/
│   │   ├── profile/
│   │   ├── notifications/
│   │   └── admin/                     # Authorized orchestration and audit UI
│   ├── components/ui/
│   ├── lib/
│   │   ├── supabase/client.ts
│   │   └── env.ts
│   ├── types/database.ts              # Generated
│   ├── pwa/
│   ├── styles/                        # Warm club design tokens
│   └── main.tsx
├── tests/e2e/
├── .env.example                       # Placeholders only
├── package.json
├── package-lock.json
├── README.md
├── index.html
├── eslint.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── supabase/
    ├── config.toml
    ├── migrations/
    ├── seed.sql                       # Synthetic people/locations/payments
    ├── tests/                         # Policies, commands, invariants
    └── functions/                     # Trusted delivery/integration as needed
        └── _shared/
```

The PWA plugin/manifest/worker layout depends on selected tooling. Do not create empty feature folders prematurely. Championship, Community, chat, and official events are now planned MVP domains, not speculative distant extensions.

## Module shape and dependencies

A substantial feature may contain routes, components, api, hooks, domain types, and co-located tests. Small features can begin with a few files. Dependencies flow from app composition to features to shared infrastructure/UI.

Use explicit feature APIs for cross-domain coordination. Home may consume the official-events public listing contract; it must not query a generic member-table feed. Championship can reference a table without importing its private browsing/data contract. The participation module shares concepts, not a universal permission rule.

Admin screens call the owning domain's authorized commands instead of duplicating entitlement or competition logic. Keep manual payment review with membership/admission orchestration; introduce a separate payment module only when complexity warrants it.

Frontend dependencies and scripts are defined in the root `package.json`. Planned Supabase configuration, migrations, and tests live under root `supabase/`; frontend end-to-end tests live under root `tests/e2e/`. Edge Function runtime dependencies should not implicitly depend on frontend packages.

## Future documentation

Once implemented and verified, update the existing root `README.md` with project-specific setup commands, environment requirements, frontend/backend commands, and operational links. Keep secrets, production data, and home-address examples out of source control.
