# The Crowded Table — planning documents

Status: revised from the user-supplied product handoff. Product direction below reflects that handoff; implementation designs remain proposals.

## Source and precedence

The user supplied an extensive summary of **Find Boardgame Cafe Ideas** after the chat reader returned only five recent prompts. That summary is now the product source for these plans. The earlier partial retrieval is no longer a blocker. Original graphics were not supplied, so brand direction is grounded in the written brief, not inspected mockups.

The user's explicit Vite + TypeScript + React Compiler, Supabase, multi-tenancy/RLS, and mobile PWA requirements take precedence over the handoff's tentative stack suggestions. Prices, example dates, and eventual features retain the tentative status given in the handoff.

## Planning set

| Document | Purpose |
| --- | --- |
| [Vision and concept](01-vision-and-concept.md) | Community-first vision, brand, functionality, navigation, and MVP |
| [Decisions and open questions](08-decisions-and-open-questions.md) | Established direction, proposed choices, and unresolved rules |
| [Architecture](02-architecture.md) | System boundaries, public/private data, and entitlements |
| [Database schema plan](03-database-schema.md) | Entities, relationships, constraints, and migration sequence |
| [Auth and multi-tenancy](04-auth-and-multi-tenancy.md) | Identity, paid access, roles, participation, and isolation |
| [Frontend patterns](05-frontend-patterns.md) | Mobile UI, feature boundaries, data, chat, and paywalls |
| [Backend patterns](06-backend-patterns.md) | Transactional commands, privacy, waitlists, results, and audit |
| [File structure](07-file-structure.md) | Proposed repository layout and module responsibilities |
| [PWA and delivery](09-pwa-and-delivery.md) | Incremental delivery, mobile behavior, and acceptance gates |

## Status language

- **Established:** explicit user requirement or product direction in the supplied handoff.
- **Proposed:** implementation recommendation or business idea still awaiting agreement.
- **Open:** a rule that needs resolution before its dependent implementation.
- **Later:** explicitly deferred or eventual functionality.

The MVP includes official events, membership gating, member tables, private table chat, Championship, minimal Community, Profile, and admin controls. Implementation milestones are smaller than the MVP; completing one milestone does not silently reduce the launch scope.

## Best next steps

1. Review the revised vision and settle tenant meaning, membership-state access, payment confirmation, and expiry effects on existing participation.
2. Draw the main mobile flows: nonmember drop-in, member hosting/requesting a seat, and championship registration/result confirmation.
3. Agree on the permission and state-transition rules before turning the schema plan into migrations.
4. Build the private-table flow with synthetic tenants and address-leak tests; then add the remaining MVP flows in the delivery plan.
5. Select routing, query, form, styling, and PWA tools against those needs.

Recommended additional artifacts: mobile wireframes with the warm club aesthetic, a concise visual system, and a state-transition/acceptance specification as the open rules are resolved. Operational setup instructions belong in a runbook before pilot deployment.

## Terminology

| Term | Meaning |
| --- | --- |
| Community / tenant | Proposed independent Crowded Table community boundary; initially Tegucigalpa |
| Community account | A user's association with a tenant, including a nonpaying participant |
| Membership entitlement | Time-bounded access to paid community benefits; independent of staff role and payment provider |
| Official event | Activity hosted by The Crowded Table and eligible for its own admission rules |
| Member table | A member-hosted activity in the private Meet & Play network |
| Championship entry | Access to one competition; never a substitute for private-network membership |
| Confirmed participant | A person whose seat/registration has completed the required checks |
| The Final Table | Official in-person championship final |

Keep product intent in the vision, permissions in the auth plan, structure in the schema, and unresolved choices in the decision register. Revise related documents together when a choice changes.
