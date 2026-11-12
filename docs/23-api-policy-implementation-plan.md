# API policy ownership implementation plan

**Actor-context follow-up - local implementation 2026-11-11.** The separately authorized A+B checkpoint adds `begin_actor_context(uuid,uuid)` as restricted transaction infrastructure, bringing the local application-function catalog from 18 to 19. Existing function bodies and relation/external grants are preserved. This addition is outside the original 31-function disposition inventory below. Correctness, migration and four-variant local measurement gates pass; A+B is adopted with the first-request/history-tail limitations recorded in the [measurement record](research/auth-transaction-optimization.md#candidate-a-ordered-context-setup-and-locked-eligibility). No hosted application of this migration is included.

**Issue #15 complete local policy migration — 2026-11-10.** All current local gates pass through migration `20261110000800`: real Auth/HTTP and concurrency/retry/semantic-audit suites, the unchanged HTTP baseline, full client/database/type/lint/build checks, clean replay and populated forward upgrade preserving all application data/history. All 31 original function dispositions reconcile to 18 final functions; the exact restricted runtime manifest and G-02 remain intact with zero external application grants. See [policy migration verification summary](12-implementation-status.md#policy-migration-verification-summary) for commands, trust boundaries and independent full-integration review. Current communities/user accounts use routes, JSON schemas, types, policies and services; health retains its schema-free HTTP boundary and existing triad. Use the explicit local target for local fixture suites. The separately authorized hosted migration and verification are complete; parent #5 and #15 are closed. See [hosted completion summary](12-implementation-status.md#policy-migration-verification-summary). Deferred features and frontend/API hosting remain separate. Earlier unstarted/four-file/hosted-ready statements below record prior milestones, not current-source readiness.

**Issue #14 global profile/block checkpoint - 2026-11-10.** Authorized local implementation moves global discovery/exact-profile audiences and profile-sourced block authorization into user-account policies, composing community-owned sharing/source predicates. Local migration 20261110000800 retires all four replaced functions and dependent business RLS; runtime fact reads, self mutations, trusted attribution, G-02 and external denial remain distinct. See [checkpoint summary](12-implementation-status.md#policy-migration-verification-summary) for verification and review. Issue #13 is closed; issue #15 and hosted deployment retain separate scope. Earlier pending statements describe prior stages.

**Issue #13 public community query checkpoint - 2026-11-10.** Authorized local implementation moves exact-slug landing and public-directory queries/audiences into the community API. Local migration 20261110000700 retires both projection functions; narrow anonymous runtime read/root-lock scope retains G-02, write denial and external Data API denial. See [checkpoint summary](12-implementation-status.md#policy-migration-verification-summary) for the boundary, verification and review. Issues #14-#15 and hosted deployment retain separate scope. Earlier pending statements describe prior stages.

**Issue #10 account-record checkpoint - 2026-11-10.** Authorized local implementation moves owner/exact account facts, staff/participant record audiences and participant-management authority into community policies. Local migration 20261110000400 retires the management function and participant business policies; scoped storage, G-02, attribution and existing audit classification remain. Permission responses reuse locked/updated rows. See [checkpoint summary](12-implementation-status.md#policy-migration-verification-summary) for verification and review. Issue #9 is closed; #11-#15 and hosted deployment retain separate scope. Earlier pending/unstarted statements describe prior stages.

**Issue #9 configuration/archive checkpoint - 2026-11-10.** Authorized local implementation moves configuration reads/detail/settings/copy writes and archive/restore decisions into community policies. Local migration 20261110000300 retires the configuration permission functions, dependent business policies and tenant normalization trigger; scope, canonical storage, G-02, profile normalization and automatic audit loggers remain. See [checkpoint summary](12-implementation-status.md#policy-migration-verification-summary) for the exact runtime boundary, verification and review. Issues #10-#15 and hosted deployment retain separate scope. Earlier pending/unstarted statements describe prior stages.

**Issue #8 community action-policy checkpoint - 2026-11-10.** Authorized local implementation introduces community lifecycle/staff policies, a fact-only protected Auth primitive, explicit API sharing cleanup and rejection-only database integrity. Local migrations 20261110000100 and 20261110000200 replace the mixed candidate function and enable tenant-scoped lifecycle clearing; external grants and the archive fence remain. See [checkpoint summary](12-implementation-status.md#policy-migration-verification-summary) for the exact runtime boundary, verification and review. Issue #7 is complete and closed; #9-#15 and hosted deployment remain pending. Earlier unstarted/four-file statements describe prior stages.

**Issue #7 transaction-retry checkpoint - 2026-11-10.** Authorized implementation adds at most three complete transaction attempts for confirmed PostgreSQL 40001/40P01 errors, with fresh context/eligibility/authorization and one correlation identity. Anonymous community reads retain their identity contract. Business/stale errors and uncertain commits are not replayed. See [checkpoint summary](12-implementation-status.md#policy-migration-verification-summary) for commands, verification and review. Issue #6 is complete and closed; policy/workflow cutovers in #8-#15 and hosted work remain pending. Earlier unstarted statements describe the design/publication stage.

**Issue #6 query-schema checkpoint - 2026-11-10.** The user authorized implementation of issue #6. Complete Kysely-native public/private application types, local-only generation and drift verification, generated-column compiler checks and driver-accurate query declarations are implemented. See [checkpoint summary](12-implementation-status.md#policy-migration-verification-summary) for verification and run commands. This checkpoint leaves product authorization, workflow/audit placement and retries at their existing boundaries; issues #7-#15 and hosted work remain pending. Earlier statements that implementation had not begun describe the design/publication stage.

**Historical design confirmation before implementation authorization, 2026-11-10.** [ADR 0001](adr/0001-api-policy-ownership.md) records all fourteen accepted interview choices. This plan documents their implementation and verification obligations. Implementation has not been authorized or started; no application changes, migrations, commits or hosted deployment are authorized by agreement with this plan alone.

## Scope and ownership

Apply the accepted boundary to the currently persisted accounts/communities foundation. Preserve product audiences, HTTP paths/statuses/projections, input normalization, pagination/cursors and error privacy. Health retains its existing structure. Deferred messaging/activity/resource domains remain deferred; the policy design must accommodate their accepted rules without implementing those domains.

| Owner | Target responsibility |
| --- | --- |
| Feature `routes.ts` | Existing HTTP integration and operation invocation. |
| Feature `json-schema.ts` | Existing TypeBox transport validation/serialization. |
| Feature `types.ts` | Operation input/result contracts, service dependencies and associated constants. |
| Feature `policies.ts` | Named action fact loaders, pure decisions, denial requirements, SQL audience predicates and their fact/decision types. |
| Feature `service.ts` | Transaction/lock coordination, policy invocation, mutations, workflow effects and semantic audit creation. |
| Shared auth/database infrastructure | Verified identity, connection lifecycle, transaction context/eligibility and bounded whole-transaction retry. |
| PostgreSQL | Authoritative storage, constraints, G-02 archive RLS, protected Auth access, trusted metadata and append-only audit protection. |

Community policy exports provide community audience/sharing facts to user-account policies. User accounts own global discoverability, bilateral blocks and the composed global-profile/block decisions. Ordinary community profiles remain independent of personal blocks. Reuse fresh facts within an operation; do not introduce cross-request authorization caching or a universal permission object. Keep SQL list predicates before count, ordering, cursors and pagination. A policy name never substitutes for an invocation from the protected operation.

**Community policy organization — locally verified 2026-11-11.** The accepted structure for `communities/policies.ts` is five sections: `Types`, `Fact Loaders`, `Helpers`, `Requirements and Decisions`, and `Audience Predicates`. Types, loaders, helpers and audience predicates are alphabetical by name. Requirements immediately precede their associated decisions; pairs and standalone decisions are sorted by decision name. The private owner audience remains with audience predicates, and `requireDecision` is the shared helper. Declaration bodies and exports are unchanged; comments retain their relevant context. Server TypeScript, root lint, declaration-content comparison and all 35 community/HTTP-baseline tests passed. This source-only organization change requires no deployment; no remaining work is identified for this change.

**User-account policy organization — locally verified 2026-11-11.** `user-accounts/policies.ts` follows the same five-section structure and alphabetical ordering. It currently has one fact loader and nine audience predicates, including the two private SQL predicates. Types, Helpers, and Requirements and Decisions are explicitly empty. Declaration bodies and exports are unchanged. Server TypeScript, root lint, declaration-content comparison and all 30 user-account/HTTP-baseline tests passed. No deployment or further work is required for this source-only organization change.

## Database type generation

Use `kysely-codegen` as a server development dependency, with checked-in output at `server/src/database.types.ts`. Version 0.20.0 is the reviewed implementation candidate; its declared Node/Kysely/pg ranges fit the inspected environment, while actual generation and integration remain unverified. The investigated `kysely-typegen@2.1.0` requires Node 24, beyond the current server minimum, so it would introduce unrelated runtime work. [Codegen documentation](https://github.com/RobinBlomberg/kysely-codegen#readme) · [Typegen documentation](https://github.com/theoludwig/kysely-typegen)

Run against the replayed local schema using a tooling credential, independent of the restricted runtime connection factory. Restrict introspection output to application-owned `public` and `app_private` relations; exclude platform/Auth objects. Keep `defaultSchemas: ["public"]` so private relation keys retain schema qualification. Use the existing default pg representations, type-only imports, snake_case identifiers and the generator's verification mode. Do not add a hand-edited generated file or second schema source. A new introspection dependency does not widen runtime grants.

One reviewed configuration override is currently required:

```json
{
  "overrides": {
    "columns": {
      "public.tenant_staff_assignments.required_account_standing":
        "ColumnType<string | null, never, never>"
    }
  }
}
```

That column is stored `GENERATED ALWAYS` in migration `20261103000600`. Version 0.20.0 does not independently infer all generated-always write prohibitions. Its published transformer accepts this fully qualified override before default/nullability processing. Verify selected nullability and rejected insert/update values with the installed compiler. Add a catalog-based inventory check for stored/identity generated columns so future additions cannot silently inherit incorrect types. Schema types do not claim to encode all constraints, trigger behavior, privileges or actor permissions. [Published transformer](https://unpkg.com/kysely-codegen@0.20.0/dist/generator/transformer/transformer.js)

Preserve HTTP date serialization and explicit microsecond cursor formatting. Update raw-query result declarations touched by the migration to reflect actual driver values. Use Kysely for ordinary typed queries; keep parameterized raw SQL for database constructs where it is clearer. A blanket rewrite of unrelated SQL is outside this scope.

## Function disposition

The checked-in [historical access-audit summary](21-final-local-access-audit.md#verification) and migrations through `20261103001700` show 31 surviving application functions, all in `app_private`, and no public application functions. This is a source/catalog review, not a fresh live-catalog check. Reconcile the live local catalog and all trigger/RLS/default dependencies before dropping anything. Update exact privileges and readiness checks by reviewed changes, not by regenerating an expected manifest to accept unexplained drift.

| Existing function | Intended disposition under the accepted boundary |
| --- | --- |
| `can_block_from_profile` | Move action/source authorization into user-account policies, composing community-source access; remove SQL function and business RLS dependency. |
| `can_discover_global_profile` | Move discovery/bilateral-block audience to user-account SQL predicates. |
| `can_edit_configuration` | Move owner/settings/copy decisions to community policies; remove related business RLS/trigger checks in the same checkpoint. |
| `can_inspect_global_profile` | Move exact global-profile audience to user-account policies. |
| `can_manage_account_records` | Move staff/participant-management decisions to community policies. |
| `can_read_account_action` | Move history audience/category authorization to community policies. |
| `inspect_global_profile` | Replace with the API's authorized query and explicit projection. |
| `community_landing` | Replace with API exact-slug audience/projection. |
| `public_community_directory` | Replace with API audience/pagination; preserve root locking and post-wait gate reread. |
| `guard_configuration_details` | Remove actor-permission trigger after API cutover; retain separate stored-state constraints. |
| `append_admin_action` | Move configuration/archive/restore semantic event creation to API transactions. Inventory all attached generic loggers and preserve required events without duplicates. |
| `classify_command` | Move semantic history-category selection to API; grant only reviewed category insert fields and retain append-only/reference integrity. |
| `normalize_editable_text` | Move trim/empty-to-null transformations to API callers; retain constraints rejecting noncanonical stored values. Preserve current HTTP normalization behavior. |
| `guard_community_sharing` | Replace automatic clearing with API workflow writes. Retain independently enforced inactive-sharing rejection, including concurrency and final-state checks. |
| `is_staff_candidate` | Replace mixed product/Auth logic: community policies own grant authority, tenant and standing checks; a narrow private primitive returns necessary Auth eligibility and performs required Auth locking. |
| `validate_command_details` | Retain structural field/type/value/reference validation; move action selection, history classification and semantic reason placement to API. Specify the exact surviving checks in the migration review. |
| `active_tenant` | Retain only for the independent archive fence; API decisions query lifecycle facts directly. |
| `is_approved_owner` | Retain the narrow owner fact for archive RLS without recursive policy joins. |
| `my_community_relationships` | Accepted explicit exception: retain a fixed caller-only projection for archived relationship cards, without granting raw archived account/profile access. Community feature owns its adapter; user accounts own the personal summary operation. |
| `lock_eligible_actor` | Retain narrow privileged Auth access and locking to coordinate current actor eligibility with bans/deletion. |
| `begin_actor_context` (authorized follow-up 2026-11-11) | Add a restricted volatile invoker that sequentially sets transaction-local actor/operation context, then calls `lock_eligible_actor`. This is transaction infrastructure, not product policy or independently verified identity. Retain the Auth definer as an active dependency; do not grant raw Auth access. Local verification and measurement are tracked in the authorization optimization report and document 12; deployment remains separate. |
| `verified_user` | Retain trusted identity/eligibility needed by remaining guards/defaults/stamps; remove obsolete transport branches only after proving callers. Avoid redundant checks where one locked context suffices. |
| `command_scope` | Retain transaction-local tenant scope only where retained structural/tenant fences need it; it must not decide action permissions. |
| `attribute_command` | Retain trusted actor/operation stamps and tenant linkage; remove retired semantic-code branches while preserving provenance. |
| `stamp_audit` | Retain protected creation/update metadata and genuine provisioning/maintenance callers. |
| `stamp_first_approval` | Retain protected first-approval metadata and immutability; API authorizes the approval. |
| `stamp_community_revision` | Retain stale-state revision metadata; API decides which workflow changes invalidate previews. |
| `protect_invariants` | Retain immutable identifiers/slugs/content keys and valid stored timezone. Remove the dormant staff branch referring to old `can_create_admin` and auto-enabling owner flags; its trigger was replaced in migration 006. |
| `protect_staff_assignment` | Retain immutable staff identity/owner assignment. |
| `require_tenant_roots` | Retain deferred required settings/owner roots and valid owner state, alongside the approved-standing staff FK. |
| `reject_audit_mutation` | Retain append-only audit rows and categories. |
| `provision_user_account` | Accepted explicit exception: retain the Auth-insertion trigger as an atomic platform integration that creates the required application account. Moving it requires a new provisioning entry point and failure/recovery contract. |

Retained functions are not a blanket endorsement of their current bodies or grants. Drop dead dependencies without compatibility aliases. Preserve historical audit rows/codes and actual Auth provisioning/maintenance paths; these are not obsolete client compatibility.

## Audit contract and trust boundary

The accepted API semantic audit decision in ADR 0001 supersedes the earlier independent database semantic-event completeness requirement. The API derives actual before/after values under the mutation locks, selects action/category/reason, writes the event/categories in the same transaction, and emits no duplicate event on a successful no-op/replay. PostgreSQL supplies trusted provenance, validates stored structure/references and prevents later alteration. It does not prove semantic completeness or correspondence for a defective trusted writer.

Preserve existing action identifiers, details shapes, audiences and historical rows. Field allowlists, JSON value types, identifiers and reference validity can remain structural constraints. Whether an operation needs a reason, which history categories apply and which action represents a transition belong to API semantics. Check every current validator clause against that distinction. Keep audit-read audience predicates before pagination and apply independent authorization when following event links.

## Concurrency and retries

**Eligibility contract follow-up - accepted 2026-11-11.** The shared actor transaction facility returns callback values directly and throws database-owned `IneligibleActorError` on denial, rolling back before work. This error never retries. Confirmed 40001/40P01 retries still rebuild trusted context, locks and eligibility; an actor becoming ineligible between attempts fails immediately. HTTP translation remains outside database infrastructure, including the account-review exception. See the decision register and document 22 for ownership; verification is recorded in document 12.

Preserve actor Auth eligibility locking and transaction-local attribution. Services coordinate locks before loading the policy facts used for a write. All writers changing those facts must share compatible locks; an ordinary snapshot or a missing-row lock is insufficient. Reuse facts only within the operation and locking/snapshot conditions that make them valid.

| Dependency group | Required implementation verification |
| --- | --- |
| Community lifecycle, configuration, staff and records | Preserve the tenant root coordination and target account locks; evaluate facts after any lock wait. Include permission revocation, archive, stale request IDs/revisions and target Auth changes. |
| Own preferences and deactivation | Preserve account-before-preference coordination without adding an unnecessary tenant lock to independent preference saves. Verify inactive-sharing rejection from both relation updates and both concurrent commit orders. |
| Global profiles, blocks and community sharing | Define the statement/snapshot boundaries for reads and shared roots for writes using the same facts. Preserve bilateral effects, source proof and exact-versus-enumerated audiences. |
| Directories and history | Preserve pre-pagination audience filtering, cursor stability, archive gating and post-wait rereads where current operations lock a root. |
| Semantic audits | Mutation, event and category writes roll back together. Verify deliberate failures between each stage and no duplicate successful events after transaction retries. |

Implement at most three total attempts for `40001`/`40P01` in shared database infrastructure, rebuilding context/eligibility, locks and decisions each time. Keep one operation correlation identity across attempts; only committed events survive. Keep callbacks free of external effects. Preserve current exhausted-error HTTP behavior and keep business/stale errors and uncertain commits outside the retry rule. Review a concrete lock order per migrated dependency group, including target Auth locks; do not describe the existing implementation as having proved a universal lock order.

## Accepted local checkpoint scope

Use forward migrations; preserve historical migration/evidence files. Each checkpoint passes its relevant gates, receives a diff review and is committed independently after implementation authorization. Agent and current ownership guidance now reflect the confirmed scope; reconcile any further implementation-specific changes before application edits and preserve the completed five-phase/eight-community-checkpoint history.

1. **Query types.** Install/configure generation, cover public/private tables and the generated column, update actual driver result typing, remove the Supabase generation path, and verify drift detection plus HTTP/cursor parity.
2. **Policy boundary and retries.** Establish feature-local named policies and narrow cross-feature composition for existing API rules. Add whole-transaction retry handling and failure/fresh-authorization tests. Preserve existing SQL authority until each dependent group below cuts over; extraction must not create a permanent parallel policy system.
3. **Community rules and workflows.** Cut over configuration, account/staff authority, candidate Auth split, sharing normalization/invariants and their dependent RLS/triggers/grants as coordinated groups. Preserve creation/owner, stale-input and concurrency contracts. Review the private Auth primitive and platform provisioning boundary.
4. **Audits and history.** Move action/category/configuration/archive semantic event creation and history audience policies together with insert privileges/validators. Verify exact event contents, visibility, append-only storage, rollback and historical preservation.
5. **Public/profile/directory reads and blocks.** Move remaining landing/directory/global-profile functions and source predicates, with narrow community policy exports and the reviewed archive-safe relationship exception. Retire all replaced functions and business RLS dependencies.
6. **Final local verification and reconciliation.** Confirm the final function catalog, privilege manifest/readiness checks, schema types and absence of old interfaces. Complete clean replay and populated forward upgrade, full local suites and documentation reconciliation.

These are dependency checkpoints, not a requirement to combine unrelated large changes into one commit. Split a checkpoint further if needed while retaining a coherent authoritative writer and passing applicable gates at every committed boundary. Do not drop a shared helper while another group still needs it. Hosted migration/verification is a separate scope decision; current application startup defaults to the hosted database, so keep local work on the explicit local target.

## Verification and completion

- Keep the reviewed HTTP baseline: routes, validation, status/error privacy, projection and serialization. Do not regenerate it just to accept refactor failures.
- Pair allowed API operations with closest denials, cross-tenant/source misuse, extra fields, hidden/absent targets, stale requests/revisions and repeated inputs.
- Separate HTTP semantic authorization/audit tests from raw-runtime integrity/archive/attribution/append-only tests and external REST/GraphQL denial tests. Deliberately replace only SQL business-denial assertions whose enforcement has moved; preserve all still-required defenses.
- Run server TypeScript and HTTP tests at structural checkpoints, relevant real Auth/HTTP and pgTAP/concurrency suites for each changed group, and root lint/build/client tests where required by document 22. The final checkpoint includes all current local suites, client boundary scan, SQL lint, clean replay, populated upgrade and generated-type drift verification.
- Prove retry limits and full fresh decisions, including a successful retry, authorization revoked between attempts, exhausted attempts, no retry of stale/business/uncertain-commit errors, and one committed semantic event set.
- Inspect live local grants, policies, functions, trigger dependencies and defaults. Preserve non-owner runtime privileges, no raw Auth access, G-02 and empty external application grants.
- Record executed commands/results and limitations. No checkpoint is complete with an unavailable required gate unless explicitly adjudicated by the user. The original plan recorded design/source inspection only; the issue #15 evidence above now records complete local runtime/generation/replay verification.

## Final confirmation and execution boundary

All fourteen interview choices are accepted, including the Auth-provisioning/archive-read exceptions, generator and local checkpoint scope. No design-choice frontier remains. The user confirmed shared understanding and then requested parent-spec publication while explicitly deferring execution. Implementation requires an explicit instruction to start; hosted migration/verification remains a separate subsequent scope. Agreement with the design questions has not authorized or started implementation.

## Parent spec publication status

The `to-spec` synthesis is published as [issue #5 — Move authorization and workflows into feature policies with complete Kysely database types](https://github.com/JonDManningDev/the-crowded-table-app/issues/5), labelled `ready-for-agent`, with 42 user stories, implementation decisions and the previously accepted testing boundaries. Read-back verified that the published body matches the approved [published parent specification](https://github.com/JonDManningDev/the-crowded-table-app/issues/5) and that the issue is open with the requested label. The issue body contains no implementation file paths or code snippets and is self-contained for later ticketing.

The GitHub CLI lacked authentication, so the connected GitHub app verified the repository and published the issue. Automatic approval review initially rejected public disclosure; the user then explicitly approved publication of the exact detailed draft, and the subsequent creation succeeded. Publication does not authorize implementation or hosted work. The subsequent dependency-linked ticket publication is recorded below.

## Child ticket breakdown — published 2026-11-10

The user approved the [approved ticket map](#child-ticket-breakdown--published-2026-11-10). The invoked `to-tickets` workflow published all ten children with individual acceptance criteria, the `ready-for-agent` label and native parent/blocker relationships. It preserves the six governing checkpoints while splitting their implementation into complete verifiable dependency groups. Membership/staff discipline stays together; semantic audit cutover follows all affected event writers. The query-model and retry prerequisites precede those feature cutovers.

| Issue | Delivery | Blocked by |
| --- | --- | --- |
| [#6](https://github.com/JonDManningDev/the-crowded-table-app/issues/6) | Complete, driver-accurate database types | None |
| [#7](https://github.com/JonDManningDev/the-crowded-table-app/issues/7) | Whole-transaction retries with fresh authorization | #6 |
| [#8](https://github.com/JonDManningDev/the-crowded-table-app/issues/8) | Community lifecycle and staff policies | #7 |
| [#9](https://github.com/JonDManningDev/the-crowded-table-app/issues/9) | Configuration and archive authorization | #8 |
| [#10](https://github.com/JonDManningDev/the-crowded-table-app/issues/10) | Account records and participant permissions | #8 |
| [#11](https://github.com/JonDManningDev/the-crowded-table-app/issues/11) | Semantic audits and history audiences | #9, #10 |
| [#12](https://github.com/JonDManningDev/the-crowded-table-app/issues/12) | Profiles, self-service and relationships | #9 |
| [#13](https://github.com/JonDManningDev/the-crowded-table-app/issues/13) | Public landing and directory queries | #9 |
| [#14](https://github.com/JonDManningDev/the-crowded-table-app/issues/14) | Global profiles and block-source authorization | #12 |
| [#15](https://github.com/JonDManningDev/the-crowded-table-app/issues/15) | Complete local verification and reconciliation | #11, #13, #14 |

Read-back verified all ten titles/bodies/open states/labels, the exact parent child set and all twelve native blocking edges. The parent's title, body, state and labels are unchanged. The authenticated GitHub CLI performed publication; access to the Windows credential store required execution outside the sandbox. Issue #6 is the only child with no blockers. These are published planning artifacts: implementation remains separately authorized, and hosted work remains outside scope.
