# Hosted policy migration — execution checklist

Authorized by the user's explicit implementation instruction on 2026-11-10. Target: existing development project `fsnipgsrlclbnfepcbvz`; frontend and API remain local. Starting implementation revision: `a11cde9`. Parent #5 and children #6–#15 are closed. This is the separately authorized hosted follow-up.

## Acceptance and sequence

1. Prepare and locally validate the guarded hosted harness. Preserve existing credentials, all historical evidence and unrelated planning edits. Commit preparation separately.
2. Capture the pre-migration ledger, complete application function/policy/trigger/default dependencies, runtime grants and structural integrity. Capture database-side counts/checksums of every application table without exporting row contents. Verify existing restricted session-pooler connection and TLS.
3. Stop only local frontend/API processes using hosted data. Repeat preflight and dry run; require the expected 25-version starting ledger and exactly eight pending `20261110000100`–`20261110000800` migrations. Stop on unexplained drift.
4. Apply the eight reviewed forward migrations in order. Require all 33 versions and an empty dry run. Before fixtures, require exact preservation of every application table's count/checksum and integrity.
5. Verify normalized catalog/dependencies against the reviewed local result, the exact runtime manifest, readiness, 18 final functions, G-02/own-card exception, protected Auth, trusted metadata, append-only storage and no external application grants.
6. Run focused real hosted Auth/local HTTP regression: lifecycle/staff/configuration/permissions, profiles/directories/discovery/blocks; nearest denials; semantic events/categories and no-ops; rollback; both-order sharing/deactivation, block/source revocation, archive/write and permission/write races; confirmed transient retry with fresh authorization and one committed event set. Keep database structural and API semantic guarantees distinct.
7. Run external REST/RPC/private-schema/GraphQL/OpenAPI probes, hosted SQL lint and available advisor checks. Restart local application processes against hosted configuration and browser-test disposable sign-in, Settings save/reload, profiles/community navigation, API forwarding and sign-out. Send no signup/recovery emails.
8. Always remove only explicitly recorded fixtures, including profiles/blocks/requests/history/categories, and prove original checksums/counts/integrity restored. Record failures honestly; all mandatory gates must pass before completion.
9. Review the final diff, update current runbook/status guidance and commit final deployment evidence independently.

On migration failure, inspect the actual ledger and failed transaction before any retry. No reset, automatic history repair, migration rewriting, compatibility restoration, credential rotation, application hosting or deferred features are authorized. Existing local-only tests retain their local guards. A failed/unavailable mandatory gate blocks completion.

## Results

Preparation locally verified before deployment. Metadata matches the reviewed local catalog; the focused hosted scenarios pass against real local Auth/PostgreSQL, including all four race pairs in both orders, fresh retry denial, semantic audit/privacy, storage safeguards and checksum-preserving cleanup. Server/compiler, all 75 HTTP cases, root lint, all 279 frontend cases and production build pass. The existing bundle-size warning remains.

Two independent code-review agents reviewed preparation against `a11cde9` and this checklist. Both identified the same missing failure-path preservation proof. It was corrected: cleanup now checks data and integrity even after a failed scenario, records failure honestly and retains both verification and cleanup errors. Final preparation review: Standards 0 remaining findings; Spec 0 remaining findings. No application behavior, HTTP fixture, migration or credential changed.

The read-only `before-*` evidence confirms 25 migrations, the existing restricted TLS/session-pooler connection and zero integrity blockers. All application-table checksums are stored without row contents. Local process inspection found no API/frontend listeners on 3001/5173 and no matching Vite/API processes. These are preparation results; execution results follow below.

## Hosted completion — 2026-11-10

The eight reviewed forward migrations were applied once, through `20261110000800`. The final ledger contains all 33 versions and the dry run is empty. Before fixtures, all 16 application-table counts/checksums matched the immutable baseline, with valid original community/account roots and complete dependents. The full hosted catalog matches the reviewed local catalog: 18 final functions, exact restricted runtime manifest, retained G-02/own-card exception and empty external application grants. Existing credentials, verified TLS/session pooler, cursor key, certificates and Auth configuration were preserved.

The complete hosted suite passed **174 counted checks plus all focused scenarios**, including all four race pairs in both orders with actual `pg_blocking_pids` proof, confirmed transient retry/fresh denial, rollback/no-op/semantic event/category/privacy checks, structural runtime denials and external REST/RPC/private-schema/OpenAPI/GraphQL probes. `verification.json` records eight actual waits and request-setup/lock-observation durations; `hosted-catalog.json` records the final catalog. Readiness passed using the existing `ct_api` connection. API product authorization/semantic audits remain distinct from retained database integrity and external surface denial.

The original failed regression and its three residual Auth fixtures are documented in [harness diagnosis](harness-diagnosis.md), `verification-failures.json` and `failure-recovery.json`. The fixed harness anchors its unchanged 1,800ms lock-observation bound to the exact competing root statement, with a separate bounded arrival phase, and settles both operations before teardown. The first successful hosted race took 2,063ms to reach its root, then 1,043ms to observe the real wait; the former request-start deadline could not establish that wait. The original CLI cleanup error's precise process/parse cause is unknown; sanitized diagnostics and independently proven cleanup now handle uncertain CLI outcomes honestly.

Hosted SQL lint passed (`sql-lint.json`). Advisor review is complete, with two unchanged Auth warnings, nine new initplan performance warnings and eight additional multiple-permissive-policy warnings. See [assessment and follow-up](advisor-review.md); no policy or Auth-setting remediation is claimed. These reviewed performance warnings do not represent a failed security check or a scale benchmark.

[Browser smoke](browser-smoke.md) passed using supported native Chrome in an isolated incognito session: disposable sign-in, one Settings save, full reload/persistence, stored profile, Communities navigation, frontend API forwarding and sign-out. Real community browser management UI remains unfinished; its persisted operations are covered through automated hosted HTTP. No email was sent. All automated and browser fixtures were removed by recorded IDs. `cleanup.json`, `after-cleanup-*` and `after-browser-cleanup-*` prove original counts/checksums/integrity restored, including zero synthetic Auth users. Original audit/history bytes remain unchanged.

## Verification commands and remaining scope

- Hosted regression: `node --env-file=server/.env.hosted-db.local server/tests/hosted-api.mjs --allow-hosted-testing` with the installed CLI path in `CT_SUPABASE_CLI` — passed; fixed project guards remain mandatory.
- Local revised focused helper: `node --env-file=server/.env.local .scratch/issue-12-local.mjs node server/tests/hosted-policy-local.mjs` — passed, including after the review's explicit arrival-bound correction; process-only wrapper corrects old local forwarded ports without credential changes.
- Server check, all 75 HTTP tests with unchanged fixture, and root lint — passed during completion. Preparation already passed all 279 client tests and production build; no client/application implementation changed during completion. The existing bundle-size warning remains.
- Hosted SQL lint, normalized catalog/parity, advisors and browser smoke — passed/reviewed as detailed above. Both #5 and #15 are verified closed/completed (`issue-status.json`).

Independent final Standards and Spec reviews start from preparation commit `98803a3`, including the uncommitted harness/evidence changes. The Standards review identified an unbounded JavaScript root-arrival gate; an explicit 6,000ms arrival deadline resolved it while retaining the original database-wait deadline and actual-lock assertion. Final review results are recorded in `final-review.json` before the separate evidence commit.

No mandatory hosted gate remains failed, unavailable or waived. Frontend/API hosting, production release/recovery planning, performance-at-scale work and deferred features remain separate. Current local processes may use the verified hosted development schema with existing ignored configuration (`npm run dev:api`, `npm run dev`); local fixture suites must continue using the explicit local target. Pre-existing AGENTS/design/planning changes remain separate from this evidence commit.
