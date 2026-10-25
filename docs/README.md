# The Crowded Table — planning documents

Status: revised from the user-supplied product handoff and subsequent explicit decisions. Current implementation/deployment evidence is in [implementation status](12-implementation-status.md). The client architecture direction recorded on 2026-10-02, clarified on 2026-10-03 for personal versus community scope, is current and canonical; other implementation designs remain proposals where identified.

## Source and precedence

The user supplied an extensive summary of **Find Boardgame Cafe Ideas** after the chat reader returned only five recent prompts. That summary is the product source for these plans. The five reference infographics in `visuals/` have now also been reviewed and used for the interactive frontend prototype. Where generated imagery conflicts with the settled brief, the brief takes precedence.

The user's explicit Vite + TypeScript + React Compiler, Supabase, multi-tenancy/RLS, and mobile PWA requirements take precedence over the handoff's tentative stack suggestions. Prices, example dates, and eventual features retain the tentative status given in the handoff.

The later client architecture decisions supersede overlapping tentative frontend/layout proposals. Read [frontend patterns](05-frontend-patterns.md) for accepted boundaries, data/state, and styling; [file structure](07-file-structure.md) for illustrative paths, current conflicts, and refactor progression; and [client review questions](08-decisions-and-open-questions.md#client-architecture-review-questions) for unresolved choices. The direction is reviewable, not immutable, and does not require empty folders or immediate implementation of every example.

The platform supports user-created communities and multi-community accounts. **My Home** is the personal landing/feed; **My Communities** is the user's community hub. My Home remains a feed placeholder; My Communities now uses All/Managed/Owned relationship filters and shared community cards under My Account; the summary-view migration is deployed to the selected hosted testing project and verified against existing hosted data. **Community Home**, Meet & Play, Championship, **Discussion**, and Profile belong to the community being browsed. The Tegucigalpa sample community is not the whole platform; see D-043 through D-045.

The 2026-10-12 decisions also settle per-person event/table records, atomic groups, pending-group edit priority, and `tables.manually_confirm_seats` (default false). Automatic tables confirm eligible whole groups as seats allow; manual tables use manager decisions with no second acceptance or deadline. Rejections leave the queue and notify the booker with timestamp, rejecting user, and optional reason. Payments and paid memberships are deferred until a late stage; current feature design must ignore them. Legacy prototype payment/member UI is a refactor discrepancy, not an accepted requirement.

## Planning set

| Document | Purpose |
| --- | --- |
| [Implementation status](12-implementation-status.md) | Account/navigation audit, deployed migrations, verification boundaries and remaining work |
| [Vision and concept](01-vision-and-concept.md) | Community-first vision, brand, functionality, navigation, and MVP |
| [Decisions and open questions](08-decisions-and-open-questions.md) | Established direction, proposed choices, and unresolved rules |
| [Architecture](02-architecture.md) | System boundaries, public/private data, and commercial deferral |
| [Database schema plan](03-database-schema.md) | Entities, relationships, constraints, and migration sequence |
| [Auth and multi-tenancy](04-auth-and-multi-tenancy.md) | Identity, community standing, roles, participation, and isolation |
| [UI style guide](13-ui-style-guide.md) | Canonical navigation, links, buttons, shared appearances, tokens and accessibility |
| [CSS-native design tokens](14-design-tokens.md) | Approved token grammar, scales, ownership, theme contracts and gated migration |
| [Frontend patterns](05-frontend-patterns.md) | Canonical client boundaries, data/state, CSS Modules/theming, and product UI conventions |
| [Backend patterns](06-backend-patterns.md) | Transactional commands, privacy, waitlists, results, and audit |
| [File structure](07-file-structure.md) | Illustrative client layout, ownership, current-code conflicts, and refactor sequence |
| [PWA and delivery](09-pwa-and-delivery.md) | Incremental delivery, mobile behavior, and acceptance gates |
| [Frontend prototype guide](10-frontend-prototype.md) | Interactive pages, walkthroughs, reconciled visuals, and simulation limits |
| [Auth operations and review checkpoints](11-auth-operations.md) | Supabase dashboard recommendations, Resend setup, verification status, and triggers for revisiting configuration |

## Status language

- **Established:** explicit user requirement or accepted product direction from the handoff or subsequent decisions.
- **Current canonical direction:** accepted architecture used to guide new work; revise explicitly as evidence warrants. It does not imply already-implemented code.
- **Recommended convention:** the preferred way to apply an accepted direction; scale it to actual complexity.
- **Illustrative future structure:** an example of possible paths, routes, components, or configuration, not a required inventory.
- **Introduce when needed:** an abstraction, directory, or tool contingent on a concrete use; do not scaffold it speculatively.
- **Proposed:** implementation recommendation or business idea still awaiting agreement.
- **Open:** a rule that needs resolution before its dependent implementation.
- **Later:** explicitly deferred or eventual functionality.

The current build combines real Auth, global profiles, discovery preferences, community creation and relationship-summary reads with mock community screens. The target excludes paid gates; legacy community simulations remain pending refactor, and D-120 explicitly retains account premium placeholders without billing. See [implementation status](12-implementation-status.md) for verified boundaries.

The 2026-10-24 direct Data API/content-permission refactor is implemented and its migration is deployed to hosted testing. It replaces eight RPCs with narrow DML/views and adds `can_modify_content`; community preferences have one save API. All seven migration versions match, the final dry run is empty, and 48 hosted PostgREST checks passed with fixture cleanup. Frontend hosting deployment remains separate. See [backend patterns](06-backend-patterns.md#direct-data-api-edits--accepted-2026-10-24) and the implementation record.

## Best next steps

1. Preserve Auth/community persistence; implement the settled standing, per-person reservation, automatic/manual confirmation, group-edit, and notification rules without payment/member dependencies.
2. Draw mobile account-holder/guest registration, automatic confirmation, manager approve/reject/issue, and group-edit flows; keep championship design separate.
3. Use the canonical client boundaries to refactor the prototype incrementally, preserving working Auth and community persistence; resolve the review questions needed for each slice.
4. Agree on permission/state-transition rules for subsequent domain migrations; build the private-table flow with synthetic tenants and address-leak tests, then the remaining MVP flows.
5. The CSS-native token batches through Community are accepted. The final token audit and cascade correction are accepted. Review the completed premium setting-row alignment in docs/14-design-tokens.md before further changes; active spacing candidates and visual/accessibility decisions remain open. Scoped themes and their browser fixture remain deferred. Select form/validation and PWA tools and adopt the planned TanStack Query layer as relevant slices need them.

Recommended additional artifacts: mobile wireframes with the warm club aesthetic, a concise visual system, and a state-transition/acceptance specification as the open rules are resolved. Operational setup instructions belong in a runbook before pilot deployment.

## Terminology

| Term | Meaning |
| --- | --- |
| Community / tenant | Established independently operated Crowded Table community boundary; initially Tegucigalpa |
| Community account | A user's association with a tenant, including a nonpaying participant |
| Membership entitlement | Deferred paid-access concept; no current gate or implementation dependency |
| Official event | Activity hosted by The Crowded Table and eligible for its own admission rules |
| Member table | Legacy term for a community-hosted game table; no paid membership implied |
| Championship entry | Participation in one competition; does not grant unrelated private-resource access |
| Confirmed participant | A person whose seat/registration has completed the required checks |
| The Final Table | Official in-person championship final |

Keep product intent in the vision, permissions in the auth plan, structure in the schema, and unresolved choices in the decision register. Revise related documents together when a choice changes.
