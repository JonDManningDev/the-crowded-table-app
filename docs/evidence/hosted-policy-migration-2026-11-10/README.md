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

The read-only `before-*` evidence confirms 25 migrations, the existing restricted TLS/session-pooler connection and zero integrity blockers. All application-table checksums are stored without row contents. Local process inspection found no API/frontend listeners on 3001/5173 and no matching Vite/API processes. No migration result is claimed by this preparation record; execution results follow below.
