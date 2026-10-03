# Architecture plan

Status: required stack and current canonical client architecture direction established; broader backend implementation designs remain proposals where identified.

## Baseline

Use Vite, TypeScript, React Compiler, Supabase with multi-tenancy/RLS, and one mobile-first responsive web/PWA application. These explicit user choices override the handoff's tentative stack suggestions.

The Vite app lives directly at the repository root, with `src/`, `public/`, `package.json`, and `vite.config.ts` alongside `docs/`. React Compiler is configured. Run app scripts from the repository root. An [interactive frontend prototype](10-frontend-prototype.md) implements the five main sections with mock data and in-memory actions. Real Supabase Auth, identity/tenant migrations, atomic community creation, and an owner-only saved-community list now coexist with that prototype. Most domain persistence and PWA installation/offline behavior remain future work.

## Client architecture direction

The current canonical direction is pragmatic feature-oriented / vertical-slice organization: `app` composes startup, providers, routing, layout, and cross-feature pages; features own domain behavior and their route pages; generic primitives and proven shared product visuals have distinct homes; `lib` provides technical infrastructure. Feature UI reaches Supabase through feature data access and appropriate hooks/providers.

Plan for TanStack Query as the server-state layer and local React state for ordinary UI state. Use colocated CSS Modules and semantic CSS custom properties for controlled community theme presets. These are accepted directions for the upcoming refactor, not a claim that the prototype already follows them. Grow directories and abstractions only as actual code warrants; revisit choices when requirements change.

The [frontend patterns](05-frontend-patterns.md) own these boundaries and conventions, the [file structure plan](07-file-structure.md) distinguishes illustrative paths from current implementation/refactor candidates, and the [decision register](08-decisions-and-open-questions.md#client-architecture-review-questions) records open review points. This architecture update does not expand product scope or finalize routes.

## System responsibilities

```mermaid
flowchart LR
    UI[React browser / PWA] --> AUTH[Supabase Auth]
    UI --> API[Data API and transactional RPC]
    API --> DB[Postgres constraints and RLS]
    DB --> RT[Authorized Realtime updates]
    RT --> UI
    UI --> MEDIA[Protected Storage when needed]
    DB --> JOBS[Durable notification jobs]
    JOBS --> WORKER[Trusted worker / Edge Function]
```

Simple permitted reads and narrow updates use caller-scoped data access. Atomic seat, entitlement, result, and administrative operations use database commands. Edge Functions handle external services, future payment integrations, or delivery workers where required. Several independent database calls from an Edge Function do not form one transaction.

Supabase Realtime is the proposed transport for table chat updates, with durable database messages as the source of truth. Storage supports profile photos if introduced; its access rules must match the profile audience. No general-purpose server or external chat network is needed by default.

## Tenant and identity design

Use **one independently operated community per tenant**, initially The Crowded Table in Tegucigalpa (D-031). A home, café, or rented space is a location within a community, not a tenant. Accounts can associate with multiple communities structurally without requiring a launch tenant switcher.

The precise future tenant business model still needs agreement. Do not create a commercial venue-management system or per-table tenants. Domain examples use `tenant_id`; a selected slug/ID is never authority.

Keep four independent concepts:

1. Account identity: who is signed in.
2. Community association and standing: tenant participation, approval, suspension/removal.
3. Membership entitlement: time-bounded access to paid benefits.
4. Resource participation: a particular confirmed seat, chat, or championship entry.

A nonmember may have a community account and buy a drop-in/competition entry. A paid member may be suspended. A staff role does not automatically mean paid benefits.

## Domain boundaries

| Domain | Responsibility |
| --- | --- |
| Official events | Public discovery, member admission, eligible drop-ins, separate special tickets |
| Meet & Play | Member-created tables, requests, confirmation, waiting, and matching requests |
| Membership | Access periods and manual grant/revocation independent of payment provider |
| Participation | Resource-specific eligibility, capacity, seat states, attendance |
| Chat | Confirmed table participants, durable messages, archival |
| Championship | Registrations, versioned rules, match evidence/confirmation, standings, finals |
| Community | Private discussions, directory, moderation |
| Admin | Authorized commands with audit records |
| Notifications | Durable in-app notices and retryable delivery; external channels undecided |

Official events and member tables have distinct roots and authorization. A shared scheduling/seat-control record is proposed to support common capacity and location invariants; see the schema plan. Sharing UI or transaction helpers must not share admission permissions accidentally.

## Data exposure

- Public: published official-event summaries, safe display locations, membership information, and championship overview. Public leaderboard identity details remain open.
- Member-only: member tables, directory, and Community content.
- Confirmed-participant-only: private addresses and table chat, subject to lifecycle rules.
- Self-only: private account preferences, payment/entitlement history, pending requests.
- Staff-restricted: manual grants, disputes, moderation reports, and audit data.

Store exact addresses separately from safe location summaries. Never include private addresses in list/detail payloads, public views, notifications, logs, or Realtime broadcasts. Access to an address needs a dedicated authorized read.

## Money versus access

Prices and entitlement rules are configuration. Manual verification can satisfy a payment requirement initially. Record payment evidence and approval separately from the entitlement or seat it enables. A claimed payment, uploaded proof, or browser success state is not trusted confirmation. Future provider webhooks must feed the same audited commands.

Payment automation is deferred; paid admission and membership workflows are MVP scope. Expiry and refund behavior must be resolved before dependent flows ship.

## Operations and tooling

Use separate local, non-production, and production data/configuration. Version migrations, grants, policies, functions, and generated types. Keep Supabase secret/service credentials in trusted runtimes; only public configuration goes to the browser. [Vite environment guidance](https://vite.dev/guide/env-and-mode) explains client-exposed environment variables.

Router, form/validation libraries, any primitive-component library, PWA tooling, and hosting remain unselected. TanStack Query is the planned server-state choice; CSS Modules and token-based preset theming are the client styling direction. Resend is selected for initial Auth email; broader notification delivery channels remain open. Keep the app at the repository root. Add scheduled work for waitlist expiry and chat archival only with an explicit reliable execution mechanism and retry/monitoring plan.
