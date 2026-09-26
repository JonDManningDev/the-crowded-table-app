# Application file structure plan

Status: proposed target; this revision changes planning documents only.

## Existing repository

The Vite app lives in the nested `the-crowded-table-app/` directory. Keep it there for now, with root `docs/` shared across frontend/backend plans. Run current app scripts from its directory. Do not reorganize source merely to make a speculative tree exist.

## Target layout as features are implemented

```text
repository/
├── docs/
├── the-crowded-table-app/
│   ├── public/icons/                  # PWA assets when created
│   ├── src/
│   │   ├── app/
│   │   │   ├── router.tsx
│   │   │   ├── providers.tsx
│   │   │   └── layouts/               # Five-tab member/guest shell; admin
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── tenancy/               # Current community context
│   │   │   ├── membership/            # Benefits, paywall, access state
│   │   │   ├── home/                  # Official feed and seasonal highlight
│   │   │   ├── official-events/       # List/calendar, admission, My Events
│   │   │   ├── meet-play/             # Tables, requests, My Tables, matching
│   │   │   ├── participation/         # Shared seat-state presentation/contracts
│   │   │   ├── table-chat/
│   │   │   ├── championship/
│   │   │   ├── community/
│   │   │   ├── profile/
│   │   │   ├── notifications/
│   │   │   └── admin/                 # Authorized orchestration and audit UI
│   │   ├── components/ui/
│   │   ├── lib/
│   │   │   ├── supabase/client.ts
│   │   │   └── env.ts
│   │   ├── types/database.ts          # Generated
│   │   ├── pwa/
│   │   ├── styles/                    # Warm club design tokens
│   │   └── main.tsx
│   ├── tests/e2e/
│   ├── .env.example                   # Placeholders only
│   └── vite.config.ts
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

Frontend packages stay in the app package boundary. Supabase migrations/tests stay at repository root; future scripts must identify the correct working directory. Edge Function runtime dependencies should not implicitly depend on frontend packages.

## Future documentation

Once implemented and verified, replace the generic app README with actual setup commands and environment requirements. Add a root entry point for frontend/backend commands and operational links. Keep secrets, production data, and home-address examples out of source control.
