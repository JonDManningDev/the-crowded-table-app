# Final local access audit — 2026-11-03

**Issue #10 account-record checkpoint - 2026-11-10.** Authorized local implementation moves owner/exact account facts, staff/participant record audiences and participant-management authority into community policies. Local migration 20261110000400 retires the management function and participant business policies; scoped storage, G-02, attribution and existing audit classification remain. Permission responses reuse locked/updated rows. See [checkpoint evidence](evidence/record-policies-2026-11-10/README.md) for verification and review. Issue #9 is closed; #11-#15 and hosted deployment retain separate scope. Earlier pending/unstarted statements describe prior stages.

**Issue #9 configuration/archive checkpoint - 2026-11-10.** Authorized local implementation moves configuration reads/detail/settings/copy writes and archive/restore decisions into community policies. Local migration 20261110000300 retires the configuration permission functions, dependent business policies and tenant normalization trigger; scope, canonical storage, G-02, profile normalization and automatic audit loggers remain. See [checkpoint evidence](evidence/configuration-policies-2026-11-10/README.md) for the exact runtime boundary, verification and review. Issues #10-#15 and hosted deployment retain separate scope. Earlier pending/unstarted statements describe prior stages.

**Issue #8 community action-policy checkpoint - 2026-11-10.** Authorized local implementation introduces community lifecycle/staff policies, a fact-only protected Auth primitive, explicit API sharing cleanup and rejection-only database integrity. Local migrations 20261110000100 and 20261110000200 replace the mixed candidate function and enable tenant-scoped lifecycle clearing; external grants and the archive fence remain. See [checkpoint evidence](evidence/community-policies-2026-11-10/README.md) for the exact runtime boundary, verification and review. Issue #7 is complete and closed; #9-#15 and hosted deployment remain pending. Earlier unstarted/four-file statements describe prior stages.

The persistent TypeScript API transition is complete for the currently persisted application foundation in the local environment. This audit closes the remaining application grants and HTTP contract findings. It does not certify a hosted deployment or implement the deferred activity, messaging, matching and competition domains.

The preceding global-profile/block slice is committed as `b9d1183`. This audit adds migration `20261103001700_application_access_seal.sql`, the own-request HTTP projection, fixed response schemas and repeatable access checks. The accepted audiences remain in [16](16-intended-access-matrix.md); the implementation basis is [19](19-access-migration-specification.md) and [20](20-persistent-api-transition-proposal.md).

## Findings and corrections

| Finding | Correction and evidence |
| --- | --- |
| `authenticated` retained private-schema usage and execution of `active_tenant`, `is_approved_owner`, `is_owner` and `verified_user` | Migration 017 revokes external private-schema/function access. The unused legacy `is_owner(uuid)` is dropped without CASCADE. Catalog and SQL checks confirm no external callable application function. |
| `service_role` retained application access to `user_accounts` and `tenant_admin_actions`; future application objects could inherit external grants | Revoke table, independent column and sequence grants from PUBLIC, anon, authenticated and service_role. Remove postgres-created public/app_private defaults, including the global PUBLIC function default. Disposable future tables, functions and sequences prove denial. Existing platform grants are preserved. |
| The accepted own-request projection was missing; revision review exposed only its ID | GET `/api/communities/:tenantId/me/request` returns `{request:null}` or exactly `request_id`, `kind`, `requested_at` for verified self in an active community. Pending joins and restricted returns are covered. No account, cross-user selectors and archived access are denied. |
| Early command/review/request-queue/candidate routes lacked serialization allowlists | Shared read types and explicit response schemas preserve their existing fields and scoped audiences while excluding future internal fields. Real HTTP tests check exact keys. |
| Privilege and alternate-surface checks lacked one reproducible final baseline | The checked-in runtime manifest, metadata catalog, ninth HTTP suite, future-object SQL suite and client AST check make drift visible. Runtime startup also rejects the residual private-schema/service-role grants. |

## Foundation contract cross-check

| Baseline requirements | Current local outcome |
| --- | --- |
| B-01–03: standing, ownership, physical flags and effective staff | Coordinated foundation and command migrations install the standing reference, first approval, restriction, request, preference and participant-permission records; required approved owner participation; paused staff and accepted flags. Clean replay and populated upgrade cover backfills and rejection/rollback. |
| B-04: independent profiles, public identity and blocks | Community exact/directory/public projections and global discoverable/shared-community profiles enforce their distinct audiences. Directed profile-encounter blocks deny global access bilaterally without removing community identity. G-01 copy-once profile creation and G-03 preferences remain distinct. Activity-derived entitlement/effects remain G-05a/G-05c delivery gates. |
| B-05: configuration, account, staff and audit readers | Typed operations cover landing/configuration, account facts, staff assignments, participant permissions, queue, own request and history. Community-history and staff-history authority remain independent; disciplinary reasons require the separate authorized projection. |
| B-06–08: legacy views, identity writes, grants and defaults | Legacy public views/RPCs are retired. Scalar inputs exclude identity/audit fields; trusted insertion and triggers remain. Explicit runtime privileges and default-denial tests replace external application grants. |
| B-09–10: atomic transitions, audit and archive | Commands retain current-state authorization, lock ordering, revisions/request IDs, retries, provenance and transactional history. G-02 archive RLS remains independently enforced, including exact owner and relationship-summary exceptions. G-04/G-06 foundation contracts remain covered by the existing suites. |
| B-11: callers and compatibility removal | All existing persisted feature adapters use HTTP; Supabase remains the Auth client. The production-source scan covers 131 TypeScript files. Generated public types remain current: migration 017 changes grants and one private helper only. No compatibility path is added. |
| B-12: future domains | No persisted activity/chat/report/match/competition resources exist to authorize or mutate. Their real source checks, block previews/cascades, identity exceptions and remaining product decisions must accompany those domains. Mock screens are not authorization evidence. |

## Authority and alternate surfaces

The [runtime manifest](../server/access-runtime-manifest.json) records exact SELECT/INSERT/UPDATE columns, DELETE privileges and 16 callable private helpers across 16 application relations. Tests compare it exactly; do not regenerate it merely to make a drift failure pass. Review the affected operation, audience, field and bypass cases before changing it.

`ct_api` is a non-superuser, NOINHERIT login without BYPASSRLS, role/database creation, replication or role memberships. The reverse maintenance membership (`postgres` may assume `ct_api`) is retained. Application relations are postgres-owned with RLS; private functions are postgres-owned with a fixed empty search path. The runtime cannot read raw Auth users or assume postgres. The runtime remains trusted to execute the service's fixed SQL: its lifecycle authority is intentionally broader than individual endpoint audiences. RLS does not independently duplicate every HTTP authorization rule.

The [local catalog](evidence/access-audit-2026-11-03/local-catalog.json) records migration versions, owners, role flags, effective grants, defaults, schema permissions, publications and platform policies. It contains no credentials, Auth identities, profiles or block rows. The final external application relation/function grant lists are empty for anon, authenticated and service_role. Real REST probes deny every public application relation for all three roles, reject private-schema selection and expose no application OpenAPI operation. The enabled GraphQL resolver works but exposes no application collection to the authenticated caller.

Local Data API remains enabled as the hostile-client harness, with zero external application grants. Disabling it or deliberately retaining empty exposure is a hosted release configuration decision. The audit does not claim it is disabled. Supabase's platform schemas/services retain their separate privileges.

The Realtime publication has no application tables and is not an all-tables publication. Storage and Realtime have no application policies. A synthetic private bucket/object verifies anonymous/authenticated download, upload, listing and public-URL denial; authenticated private-channel admission explicitly fails. Fixtures are removed; the final catalog records zero buckets/objects. These checks do not authorize future resource policies automatically.

Auth signup, account provisioning, confirmation-token verification, recovery-token verification, password update and subsequent login succeed against local GoTrue. Admin-generated test links exercise those mechanisms without claiming external SMTP delivery or a browser callback flow. Existing HTTP suites verify real bearer identity and current account eligibility.

Authorization and response projection use the existing statement/transaction boundaries. In particular a profile read admitted by its statement snapshot may finish while a later revocation commits; subsequent statements/pages recheck current state. The own-request projection also uses one statement. No broader revocation guarantee is implied.

## Verification

| Check | Result |
| --- | --- |
| Nine real Auth/HTTP API suites, then client boundary scan | Passed; includes authorization neighbors, field allowlists, direct bypasses, pagination, retries, rollback and concurrency checks across the persisted foundation |
| pgTAP | 265 assertions passed, including 37 new access-seal assertions |
| Retired Data API regression | 51 real PostgREST checks passed |
| Clean replay and populated upgrade | Passed, including preflight rejection, late rollback, audit provenance and both sharing/inactivity lock orders |
| SQL lint | No public/app_private schema errors |
| Frontend tests | 279 tests in 38 files passed |
| TypeScript, production build, ESLint | Passed; existing Vite chunk-size warning remains |

Reproduction and manifest maintenance are in the [Supabase runbook](../supabase/README.md#final-local-access-audit). Run fixture suites sequentially. The evidence was captured from the project's loopback stack (API 15421, database 15422), not a linked hosted project. No UI was changed in this audit.

## Remaining release and feature gates

**Subsequent hosted development cutover.** The user authorized execution after this local audit. All 25 migration versions now match the selected hosted project; frontend/API processes remain local. See [the hosted milestone](12-implementation-status.md#hosted-development-database-cutover) for current evidence. The paragraphs below record the scope established before execution, not a claim that the database is still pending.

No known local foundation access finding remains from this audit. The user subsequently clarified that there are no testers, users or live production build: only the database is hosted, and the frontend/API will remain local until more features are implemented. The next step is a development database cutover: confirm the target and migration state, apply forward migrations, configure the local API with restricted credentials and verified TLS, and verify local application operations and retired direct-access denials against the hosted environment. Refresh hosted access/advisor evidence as part of verification. No hosted change has been made by this audit or clarification.

API/frontend hosting, host/domain selection, production-scale performance/capacity, availability, backup/restore rehearsals and production recovery planning are deferred to an actual hosting/production proposal. They do not block this development database cutover, and no compatibility fallback is required. External email delivery and browser confirmation/recovery callbacks were not reverified by the local audit; verify relevant local flows against hosted Auth during the cutover. Future domain authorization and UI work remains outside this foundation transition, with the explicit dependencies above.
