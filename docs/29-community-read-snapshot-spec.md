# Community reads from a single statement snapshot

**Status.** Read timing and scope accepted 2026-11-19. Public landing was implemented and measured locally at checkpoint `a0b2ca4`. [Implementation status](12-implementation-status.md#public-landing-snapshot-checkpoint---2026-11-19) records the results. Directory and audit history reads were [implemented, verified and measured locally](12-implementation-status.md#directory-and-audit-history-snapshot-checkpoint---2026-11-19). Checkpoint 3 awaits implementation authorization.

## Read contract

The community reads listed below evaluate their existing application authorization and select the authorized response in a single PostgreSQL statement. A read whose statement snapshot precedes a relevant change may finish with the rows visible to that snapshot, even if its response arrives after the change commits. Every statement whose snapshot starts after the commit applies the changed rules. Each page and exact lookup gets its own snapshot, including requests carrying a cursor obtained under earlier permissions.

Remove the community row lock from these reads. Keep protected requests' existing database Auth eligibility check and Auth account share lock. Retain write lock order, fresh write authorization, pending-transaction behavior, retries, transactional audit effects and the seven G-02 archive fences. Keep application authorization and inline result audiences in the community API under [document 25](25-service-owned-result-sql-spec.md). Continue to use verified identity and existing typed HTTP contracts, with live database facts for every read. The proposal uses existing schema, runtime grants and browser authentication.

This revises [document 26's concurrency guarantee](26-trusted-api-runtime-reads-spec.md#implementation-decisions) for these thirteen reads. The requirements for writes and operations beyond this inventory continue to apply.

## Proposed delivery checkpoints

| Checkpoint | GET operations | Contract to preserve |
| --- | --- | --- |
| 1. Public landing | `/api/public/communities/:slug` | Exact active slug, current public fields and allowed copy slots. A missing or archived landing returns 404. |
| 2. Directories and audit history | `/api/public/communities/:slug/directory`, `/directory`, `/history` | Public directory visibility, member standing, public versus member fields, existing badges, and denied versus authorized-empty results. History retains category permissions, dual-category behavior, owner archive access, exact event and target filters. |
| 3. Configuration and records | `/details`, `/settings`, `/copy`, `/accounts`, `/accounts/:userId`, `/staff`, `/staff/:userId`, `/participant-permissions`, `/accounts/:userId/permissions` | Preserve configuration audiences and fields, owner enumeration, exact-account scope, staff and participant permission audiences, active self-access exceptions, and owner-only archived content. Preserve the corresponding write authorization and result contracts. |

Short paths in the table are relative to `/api/communities/:tenantId`. Keep existing HEAD behavior for the same GET routes.

For lists, preserve filtering before ordering, cursor position and page limits. Carry enough information from the single statement to distinguish an authorized empty response from a missing or inaccessible resource where the HTTP contract distinguishes them. Preserve cursor validation and its observable error precedence. [The access matrix](16-intended-access-matrix.md) remains authoritative for field and row audiences.

One possible landing implementation is to filter the existing projection directly by slug and active status. For other reads, choose a query shape that preserves the response contract and uses the same statement snapshot for authorization and projection. Review policy rules shared with writes before changing their callers.

## Proposed verification

1. Use the reviewed HTTP contract fixture and existing local Auth/HTTP suites, including directory, history, configuration and records. Compare allowed and nearest denied results with the unchanged implementation across actor, tenant, standing, archive and permission cases. Cover field boundaries, exact targets, empty results, cursor errors and subsequent pages. Preserve both G-02 runtime enforcement and external Data API denial.
2. Use explicit transaction barriers and a separate connection to verify both orderings. While a relevant change is uncommitted, a read can complete against the last committed state without waiting on the community row. With a result already selected, the change can commit before that result is delivered. A new read after commit applies the new access rules, including a request carrying a pre-change cursor. Verify relevant archive, directory visibility, standing and permission changes. Keep the existing write and Auth race, rollback and retry coverage.
3. Measure the pinned current implementation and each candidate on equivalent local fixtures, using the real runtime role. Start with public landing and compare ordinary reads and overlapping reads and writes for the same community. Include an uncontended control and the response outcomes relevant to each checkpoint. Report SQL submissions, latency for both reads and writes under mixed load, and time spent waiting on the community row separately where measurable. Record variability, errors and repeat conditions. Keep local measurements distinct from any hosted latency estimate.
4. Follow the applicable gates in [document 22](22-fastify-architecture-refactoring-plan.md) and [document 23](23-api-policy-implementation-plan.md), including server type checks, the reviewed HTTP baseline, relevant real integration suites, lint and build. Review each checkpoint diff and record its verification and any unresolved regressions in [implementation status](12-implementation-status.md). Commit verified checkpoints independently.

The proposed initial comparison is local. Review the landing result before drawing performance conclusions about directories, audit history or management reads.

## Decisions

- [Public landing](08-decisions-and-open-questions.md#public-community-landing-read-during-archival--accepted-2026-11-19)
- [Directories and audit history](08-decisions-and-open-questions.md#community-directory-and-audit-history-reads-during-access-changes--accepted-2026-11-19)
- [Remaining community reads and Auth eligibility](08-decisions-and-open-questions.md#remaining-community-read-locks-and-auth-eligibility--accepted-2026-11-19)
