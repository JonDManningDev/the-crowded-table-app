# Project documentation and workflow

- Before giving a substantive response or executing a request, review relevant in-repo decisions and design documentation. Start with `docs/README.md`, search the decision register (`docs/08-decisions-and-open-questions.md`), and read the applicable feature, architecture, schema, authorization, and operational documents. Do not treat current code or mocks as the product specification.
- Follow **Brainstorm → Create Documentation → Execute according to documentation → Verify according to documentation → Update Documentation**. Continue from the established stage; do not restart brainstorming or request approval for decisions already documented and authorized.
- Distinguish accepted decisions from proposals, open questions, historical milestones, and deferred features. Current explicit user instructions take precedence. Resolve material conflicts or missing business rules before implementing dependent behavior; do not silently invent policy or expand scope.
- Design tables, grants, RLS policies, and queries/functions for the accepted intended product use, including features whose UI is not built yet. Do not make an unfinished feature a reason for a permanent access restriction or treat deployed milestone policies as canonical requirements. Distinguish current behavior, intended audiences, and genuinely unresolved rules; resolve the latter before dependent access changes. Evaluate direct Data API/RLS, safe projections, and RPCs against the intended contract rather than adding workarounds to preserve temporary restrictions.
- Implement and verify against the applicable documented requirements, including acceptance criteria, privacy, authorization, and lifecycle rules. Report verification results and any unverified behavior accurately.
- Before finishing implementation, update the relevant documentation with implementation and deployment status, remaining work, and any variances agreed upon with the user during execution. Reconcile affected documents; do not rewrite requirements merely to match an accidental implementation difference.

# Application data and authorization

- Follow the approved persistent API plan in `docs/20-persistent-api-transition-proposal.md`, as revised by `docs/adr/0001-api-policy-ownership.md` and `docs/23-api-policy-implementation-plan.md`. The policy design is confirmed; implementation requires a separate instruction to start and initially ends at complete local verification. Browser Supabase Auth supplies identity tokens. Feature adapters call typed HTTP operations for migrated data.
- Define each actor, operation, row, field, enumeration and context from the intended access matrix. Authorize from verified identity and current database state. Serialize sensitive checks and writes together.
- Use the dedicated least-privileged application role. Preserve database integrity, trusted attribution and G-02 archive RLS. For remaining direct surfaces verify grants, RLS, functions and embeddings until the whole dependency group cuts over.
- Pair each allowed operation with its nearest denial and a direct-bypass test using the real runtime role and clients. Verify stale inputs, retries and concurrent transitions.

# Persistent API architecture

- Preserve the completed architecture and verification history in `docs/22-fastify-architecture-refactoring-plan.md`. The current implementation has four-file community/user-account features; the confirmed policy follow-up in document 23 adds feature-local policy ownership when implementation is authorized. Preserve the HTTP baseline and explicit service/plugin boundaries. Health remains outside authentication with no runtime schemas; do not restart the completed migration.
- Match backend HTTP feature names to frontend feature ownership by default. Assign each operation one authoritative owner and document functional exceptions. Do not reorganize the frontend for symmetry.
- The accepted target for communities and user accounts is `routes.ts`, `json-schema.ts`, `types.ts`, `policies.ts`, and `service.ts`; health retains `routes.ts`, `schema.ts`, and `service.ts`. Maintain matching operation sections/order across routes, HTTP schemas and services; organize contracts and policies consistently where applicable.
- Routes own endpoint paths and HTTP integration; JSON schemas own TypeBox transport validation/serialization; types own service contracts/dependencies and associated declarative constants. Policies own named action fact loaders, pure decisions, denial requirements, SQL audience predicates and their fact/decision types. Services coordinate transactions/locks, policy calls, mutations, workflow effects and semantic audits. Keep runtime HTTP schemas out of policy/service logic and SQL projections. Follow the workspace HTTP ownership decision and document 23's complete Kysely-native public/private application query model, independent of grants.
- Register encapsulated feature plugins. Put shared authentication in the authenticated parent and feature hooks in their proper scope. Keep public/protected registrations in the same feature directory when they share ownership; do not add nesting merely to mirror files.
- Construct resources and service instances centrally and pass narrow explicit dependencies. Do not introduce a global service locator. Keep token verification, HTTP authentication, transaction eligibility and error translation under their designated owners.
- Use request decorators for verified context; permit infrastructure decorators only for a concrete lifecycle or encapsulation benefit. Keep feature responsibilities within the accepted target above; use erased type-only references for schema-derived types and factory-derived service facades.
- Preserve PostgreSQL storage/integrity authority, G-02, protected Auth access, trusted attribution and append-only audit storage. Under the confirmed policy follow-up, the API owns product authorization and semantic audit correctness/completeness; do not claim independent database semantic-event completeness. Follow document 23's individual function dispositions and explicit exceptions. Injection tests establish HTTP wiring, not database correctness. Keep the reviewed HTTP baseline intact; do not regenerate it merely to clear a refactor failure.
- Follow the verification gates in documents 22 and 23. Preserve the five-phase and eight-community-checkpoint history. Each authorized checkpoint must pass the relevant integration, authorization and concurrency checks, receive a diff review and be committed independently. Distinguish API authorization/semantic audit checks, retained runtime database safeguards and external Data API denial. A failed or unavailable required check blocks completion until resolved or explicitly adjudicated by the user.
- Update documentation when ownership or boundaries change. Do not add compatibility aliases, duplicate registrations or parallel legacy interfaces during the transition.

# Development-only compatibility policy

- This application is still in development. Do not spend effort introducing backward compatibility to support previous implementations. Remove existing backward-compatibility mechanisms when discovered, including obsolete compatibility wrappers, aliases, fallback paths and parallel legacy interfaces; update current callers to the intended implementation.
- When a transition to a live production state with real users is proposed, remove these development-only compatibility instructions and document the appropriate production compatibility and migration requirements before proceeding with that transition.

# Design tokens and styling

- Follow `docs/13-ui-style-guide.md` for approved presentation and `docs/14-design-tokens.md` for token ownership, naming, admission, themes, and migration gates. CSS custom properties in `client/src/styles/tokens/` are authoritative; preserve CSS Modules. Do not add token generators, JSON sources, or styling dependencies.
- Select semantic tokens by the element's actual purpose, not by a coincidentally matching value. Keep heading, eyebrow, navigation, action, feedback, and decorative roles distinct. Use the approved 4/8/12/16/24/32px primitive spacing scale for general composition without an applicable semantic role; preserve approved role-specific measurements.
- Prefer existing tokens. Do not introduce an unapproved raw shared design value or promote a legacy discrepancy to a permanent role. For each new component-local design value, document its purpose, why existing roles/scales are unsuitable, and why local ownership is appropriate, in a nearby comment or the design documentation. Geometry and structural CSS do not automatically require tokens.
- Before changing a shared token, analyze direct and aliased consumers, component families, interaction states, responsive mappings, and theme/overlay effects. Record the intended impact and required verification; obtain approval for visual changes before applying them. Numerical equality alone never justifies consolidation.
- Keep token extraction separate from design refinement. Preserve computed rendering, verify affected routes/states at relevant widths, run build/lint and relevant tests, and check undefined properties, cycles, and unused aliases. Deprecate only with a replacement, consumer list, and removal checkpoint. Follow the documented batch review gate; do not continue into remaining families without authorization.

## Agent skills

### Issue tracker

GitHub Issues in `JonDManningDev/the-crowded-table-app`. See `docs/agents/issue-tracker.md` for publishing, fetching and coordinating tickets.

### Triage labels

Use the five default triage labels. See `docs/agents/triage-labels.md` for the role mapping.

### Domain docs

Single context across the application. See `docs/agents/domain.md` before exploring domain terminology or decisions.
