# The Crowded Table — planning documents

Status: revised from the user-supplied product handoff and subsequent explicit decisions. The client architecture direction recorded on 2026-10-02 is current and canonical; other implementation designs remain proposals where identified.

## Source and precedence

The user supplied an extensive summary of **Find Boardgame Cafe Ideas** after the chat reader returned only five recent prompts. That summary is the product source for these plans. The five reference infographics in `visuals/` have now also been reviewed and used for the interactive frontend prototype. Where generated imagery conflicts with the settled brief, the brief takes precedence.

The user's explicit Vite + TypeScript + React Compiler, Supabase, multi-tenancy/RLS, and mobile PWA requirements take precedence over the handoff's tentative stack suggestions. Prices, example dates, and eventual features retain the tentative status given in the handoff.

The later client architecture decisions supersede overlapping tentative frontend/layout proposals. Read [frontend patterns](05-frontend-patterns.md) for accepted boundaries, data/state, and styling; [file structure](07-file-structure.md) for illustrative paths, current conflicts, and refactor progression; and [client review questions](08-decisions-and-open-questions.md#client-architecture-review-questions) for unresolved choices. The direction is reviewable, not immutable, and does not require empty folders or immediate implementation of every example.

## Planning set

| Document | Purpose |
| --- | --- |
| [Vision and concept](01-vision-and-concept.md) | Community-first vision, brand, functionality, navigation, and MVP |
| [Decisions and open questions](08-decisions-and-open-questions.md) | Established direction, proposed choices, and unresolved rules |
| [Architecture](02-architecture.md) | System boundaries, public/private data, and entitlements |
| [Database schema plan](03-database-schema.md) | Entities, relationships, constraints, and migration sequence |
| [Auth and multi-tenancy](04-auth-and-multi-tenancy.md) | Identity, paid access, roles, participation, and isolation |
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

The MVP includes official events, membership gating, member tables, private table chat, Championship, minimal Community, Profile, and admin controls. Implementation milestones are smaller than the MVP; completing one milestone does not silently reduce the launch scope.

## Best next steps

1. Preserve the established community/tenant and Auth decisions; settle membership-state access, payment confirmation, and expiry effects on existing participation.
2. Draw the main mobile flows: nonmember drop-in, member hosting/requesting a seat, and championship registration/result confirmation.
3. Use the canonical client boundaries to refactor the prototype incrementally, preserving working Auth and community persistence; resolve the review questions needed for each slice.
4. Agree on permission/state-transition rules for subsequent domain migrations; build the private-table flow with synthetic tenants and address-leak tests, then the remaining MVP flows.
5. Select routing, form/validation, and PWA tools; adopt the planned TanStack Query layer and CSS Modules/token styling as the relevant slices need them.

Recommended additional artifacts: mobile wireframes with the warm club aesthetic, a concise visual system, and a state-transition/acceptance specification as the open rules are resolved. Operational setup instructions belong in a runbook before pilot deployment.

## Terminology

| Term | Meaning |
| --- | --- |
| Community / tenant | Established independently operated Crowded Table community boundary; initially Tegucigalpa |
| Community account | A user's association with a tenant, including a nonpaying participant |
| Membership entitlement | Time-bounded access to paid community benefits; independent of staff role and payment provider |
| Official event | Activity hosted by The Crowded Table and eligible for its own admission rules |
| Member table | A member-hosted activity in the private Meet & Play network |
| Championship entry | Access to one competition; never a substitute for private-network membership |
| Confirmed participant | A person whose seat/registration has completed the required checks |
| The Final Table | Official in-person championship final |

Keep product intent in the vision, permissions in the auth plan, structure in the schema, and unresolved choices in the decision register. Revise related documents together when a choice changes.
