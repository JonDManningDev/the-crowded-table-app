# Service-owned result SQL

**Public access follow-up - accepted 2026-11-18.** [document 27](27-community-public-access-simplification-plan.md) supersedes prior intended public chat/activity settings and adds verified-self inactive Profile reads. Completed migration/audit/refactor evidence below describes its original checkpoint, not implementation of this revision. Preserve API/database ownership and verification history. First checkpoint: remove two flags and update existing gates/join-status/Profile. About, History and real admission/chat are separate work.

**Accepted 2026-11-14.** [Revised block and profile rules](16-intended-access-matrix.md#am-04--blocks-and-profile-shared-community-visibility) supersede this document’s profile-source requirement, blocked-pair search filtering, and exact-profile/list projections. This specification records the earlier SQL ownership checkpoint.

**Locally implemented and verified, 2026-11-13.** The user separately authorized implementation through implement-spec after confirming this specification and its testing boundaries. [Issue #23](https://github.com/JonDManningDev/the-crowded-table-app/issues/23) was published with `ready-for-agent` and exact body read-back verified. Checkpoints `bf85bc5` and `32763ee` implement community-local and user-account/cross-feature queries respectively. The [implementation record](12-implementation-status.md#service-owned-result-sql--locally-verified-2026-11-13) contains the passing local gates and independent standards/spec reviews. The specification body below preserves the published requirements.

## Problem Statement

The SQL that determines a service operation's returned rows is currently split between the service query and named audience predicates in policy modules. Understanding an operation's result requires following those predicates, their alias assumptions and their nested composition across features.

The user wants the service function to express its returned audience directly in its query. They value the existing fact loaders, requirement functions and decision functions, including fact loaders owning the SQL needed to gather authorization facts.

## Solution

Place each operation's result-query audience conditions directly in the service query. Express those conditions inline, with no named audience variables or extracted audience-predicate functions.

Retain policy fact loaders and their fact-gathering SQL. Retain pure decision functions and requirement functions that determine and enforce when the service's happy path can proceed. Services continue to coordinate transactions, locks, policy calls, mutations and workflow effects.

Apply this ownership change to the current community and user-account operations while preserving their accepted product behavior.

## User Stories

1. As a maintainer, I want each service query to contain its audience conditions, so that I can understand the returned rows while reading the operation.
2. As a maintainer, I want audience conditions written directly in the query, so that understanding a result does not require following a named audience variable or function.
3. As a maintainer, I want fact loaders to retain their fact-gathering SQL, so that authorization facts have a clear owner.
4. As a maintainer, I want decision functions to evaluate loaded facts, so that operation eligibility and workflow choices remain explicit.
5. As a maintainer, I want requirement functions to enforce decisions, so that each operation retains its denial behavior.
6. As a maintainer, I want service queries to retain parameterized values and typed results, so that relocating conditions preserves query safety and result contracts.
7. As a visitor, I want public community landing and directory results to respect their existing visibility rules, so that the refactor preserves public access.
8. As a community participant, I want my pending request and authorized review results to retain their current visibility, so that request details remain limited to the intended audience.
9. As an authorized staff member, I want pending-request queues and staff candidates to retain their current eligibility conditions, so that the refactor preserves the information available for staff workflows.
10. As a community participant, I want directory entries to retain the existing standing restrictions, so that directory browsing exposes the intended accounts.
11. As an eligible community viewer, I want exact profile access to preserve its standing and archive rules, so that known profiles remain accessible under the accepted contract.
12. As an account holder, I want community profile and preference reads and edits to retain their distinct conditions, so that moving their SQL preserves each operation's authority.
13. As a community owner, I want archived-community access to retain its documented exceptions, so that archival continues to protect community content.
14. As an authorized account-record reader, I want exact account facts and staff or participant records to retain their current audience, so that result-query ownership does not broaden access.
15. As an audit-history reader, I want my independent category permissions applied before pagination and exact-event lookup results are returned, so that every history response contains only permitted events.
16. As an account holder, I want my global profile and preferences to remain caller-scoped, so that another caller cannot access my self-service data.
17. As an account holder, I want my community summary filters to retain their owned, managed and all-community meanings, so that the same filter produces the same collection.
18. As a person using global discovery, I want discovery to preserve discoverability and bilateral-block conditions, so that search results retain their accepted privacy behavior.
19. As a person opening an exact global profile, I want self, discovery and qualifying shared-community paths to retain their existing rules, so that exact lookup preserves its intended audience.
20. As a person blocking another account, I want the selected profile source to retain its access checks, so that a block is established through an authorized source.
21. As an account holder, I want outgoing block reads and removals to remain caller-scoped, so that another caller cannot inspect or modify my block collection.
22. As a person changing profile sharing or community standing, I want concurrent profile reads and block creation to preserve their snapshot and locking guarantees, so that authority changes govern the operation correctly.
23. As an API caller, I want the same response fields, status codes, denial privacy and cursors, so that the source refactor preserves observable behavior.
24. As a maintainer, I want existing integration and authorization tests to verify the change through real operations, so that correctness is established at the interfaces callers use.
25. As a maintainer, I want the architecture documentation and agent instructions reconciled with the accepted ownership, so that future changes follow the same design.

## Implementation Decisions

- The user's confirmed ownership is authoritative for this change. Services own the SQL that produces their results, including the conditions determining the audience. Fact loaders own the SQL used to gather authorization facts. Decision and requirement functions retain their existing responsibilities.
- Revise the audience-predicate ownership clauses in the API policy ownership ADR, API policy implementation plan and applicable architecture guidance. Preserve the completed migration and verification history as historical evidence, and record this follow-up's separate status.
- Cover both community and user-account features, including private predicate-composition helpers and the community sharing and profile-source predicates currently consumed by user-account policies.
- Put audience conditions directly in the existing service queries, including conditions on writes and returned rows where the current audience helpers are used. Keep conditions parameterized. Maintain equivalent parentheses, tenant linkage, aliases, null behavior and row correlation when expanding nested predicates.
- Remove the audience-predicate exports and their predicate-only helpers once all consumers have been updated. Express the conditions inline at each consuming query, including cross-feature sharing and profile-source composition. Keep the existing owner of each product rule documented when its SQL appears in more than one operation.
- Introduce no named audience variables, service-local audience functions, predicate registry or alternative SQL-fragment abstraction. Existing fact values and decision results may still be used in query expressions.
- Retain fact-loader, requirement and decision abstractions, including protected Auth fact access and shared-community root gathering used by block locking. Remove imports and types only when their last actual consumer is removed.
- Keep each existing operation's transaction, tenant scope, locks, statement ordering and retry behavior. Reuse the facts already loaded for the operation where the existing query does so.
- Keep list audience conditions in SQL before ordering, cursors, counts where applicable and pagination. Preserve exact-target restrictions and exact-event authorization as well as list authorization.
- Preserve the distinction between global discovery, exact global profiles and community profiles. Preserve bilateral-block enforcement, community sharing consent, archive exceptions and the restriction of block-source sharing alternatives to roots actually locked by the operation.
- Preserve query projections, input normalization, trusted attribution, audit effects, response serialization and denial behavior. The runtime role and retained database safeguards continue to apply at their existing boundaries.
- Use the existing service operation structure. Splitting the combined community preference operation into separate read and update functions is outside this change.
- Perform the eventual implementation in independently verified and reviewed checkpoints. Establish the operation-to-predicate inventory first. Expand community-local consumers, then the user-account and cross-feature consumers, removing each helper after its final consumer moves. Finish with documentation reconciliation and the complete local verification gate.

## Testing Decisions

### Confirmed testing boundaries

- Use the existing real Auth/HTTP integration boundary as the primary behavioral interface. Exercise the normal API operations against the explicit local database with the actual least-privileged runtime role. Assert returned rows, fields, denial statuses, cursor behavior and persisted effects.
- Retain the existing direct-runtime database and external Data API checks as separate evidence for database safeguards and bypass denial. Those checks establish the database boundary independently of API-owned product authorization.
- Use the existing HTTP injection and contract-baseline tests for registration, validation, serialization, authentication wiring and error translation.
- Add no production testing interfaces. Extend existing tests only for a specific affected regression that current coverage misses. Review the source diff for inline audience ownership and helper removal, without adding tests that merely assert the code's layout.

### Existing verification and coverage

- Run the current community, history, self-service, configuration, records, directory, global-profile and preferences integration suites. Their existing scenarios cover allowed operations and nearest denials, standing and archive boundaries, caller scope, discovery and exact lookup, independent history categories, response fields and collection pagination.
- Exercise the existing relevant concurrency and rollback scenarios, including sharing changes versus inactivity, archive or authority changes after lock waits, profile reads versus blocking, block-source locks and transaction retries. Keep result admission and projection within their current statement snapshots.
- Run the existing access-audit and external client-denial checks to confirm the restricted runtime and external access boundaries.
- Run server TypeScript, the complete current HTTP suite and its reviewed baseline, root lint, the production build and the client verification gates applicable under the existing architecture plan. Record the exact commands, results and any unavailable required check at implementation time.
- Compare expanded query conditions and parameters against the pre-refactor queries during diff review. Pay particular attention to repeated sharing and block conditions, boolean grouping, alias correlation, nulls, exact-target modes and audience filtering before pagination.
- Preserve the reviewed HTTP baseline. A discrepancy requires investigation against the existing contract.
- This specification records the required implementation verification. Implementation results and completion status are recorded after the checks actually run.

## Out of Scope

- Product permission, standing, archive, sharing or block-rule changes.
- New routes, response contracts, user interfaces or feature domains.
- Schema, migrations, grants, RLS, stored-function or runtime-role changes.
- Changes to fact-loader ownership or removal of requirement and decision abstractions.
- A split of existing combined read and update services.
- Query optimization, benchmarks, transaction infrastructure refactors or deployment.
- Compatibility wrappers, aliases and parallel legacy audience interfaces.

## Further Notes

The user clarified that keeping authorization fact gathering in policy modules is intentional. The requested change concerns the audience conditions currently extracted from the queries producing service results, including the existing read and write consumers.

The implementation sequence follows the current dependencies. Cross-feature predicate helpers remain available only until their consuming queries are converted within the authorized refactor. The completed state has audience conditions inline in the service queries and retains the fact-loader, decision and requirement abstractions.

The user confirmed the real Auth/HTTP, direct-runtime database, external Data API and HTTP-contract testing boundaries and authorized publication with the ready-for-agent label on 2026-11-13. Publication is a planning step. Implementation requires the separate instruction established by the repository workflow.
