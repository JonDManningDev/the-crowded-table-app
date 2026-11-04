# Auth, accounts, and tenants

## Hosted development database, local application — 2026-11-03

The authorized database cutover applies migrations through `20261103001700` to `fsnipgsrlclbnfepcbvz`. Both application processes remain on this computer. There is no hosted frontend or API deployment, no production availability/fallback/recovery work, and no database reset. Existing account/community data is preserved, including the accepted one-time curated-profile backfill.

Start the current development target in two terminals from the repository root:

```powershell
npm run dev:api
npm run dev
```

The frontend serves `http://localhost:5173` and forwards `/api` to `http://127.0.0.1:3001`. The API uses the restricted `ct_api` login through the linked Supabase session pooler on port 5432, with `sslmode=verify-full` and the Supabase CA certificate. The server's ignored `server/.env.hosted-db.local` contains its database credential and cursor key; `client/.env.hosted-db.local` contains only browser Auth configuration. Never copy the database URL, cursor key or service-role key into a Vite variable. Supabase documents [custom-role session-pooler connections and TLS](https://supabase.com/docs/guides/database/connecting-to-postgres). The CA lives in ignored `supabase/.temp/hosted-ca.crt`; its fingerprint is checked by the setup script.

`server/scripts/setup-hosted-db.mjs --allow-hosted-testing` is a one-time initializer with fixed-project/ledger guards. It requires `CT_SUPABASE_CLI` to point to the installed CLI executable, generates the runtime password locally, and refuses to overwrite an existing server credential file. Do not rerun setup to start the app or implicitly rotate credentials. A partially interrupted setup requires checking the saved credential and role before retrying. CLI output containing keys/SQL is kept out of logs.

For the independent local Supabase stack, use `npm run dev:api:local` and `npm run dev:local`. Its existing `server/.env.local`, `client/.env.local-api.local`, setup script and guarded local test suites remain separate. These are development targets, not compatibility paths for the retired Data API.

Hosted verification uses `node --env-file=server/.env.hosted-db.local server/tests/hosted-api.mjs --allow-hosted-testing` from the repository root with `CT_SUPABASE_CLI` set. It starts its own loopback HTTP listener, uses synthetic hosted Auth users/communities, and checks exact runtime privileges, real HTTP operations, isolation, profile blocks, archive and old REST/GraphQL access. It deletes only its own fixtures and captures metadata under `docs/evidence/hosted-api-cutover-2026-11-03/`. The obsolete `hosted_direct_data_api.mjs` suite is removed; references below record its historical results only. Local suites must never be redirected to the hosted project.

Data API remains enabled with zero external application grants, allowing explicit bypass verification. Auth continues through the Supabase SDK. Hosted Auth policy settings are unchanged; final evidence and any residual advisor findings are recorded in [implementation status](../docs/12-implementation-status.md#hosted-development-database-cutover).

The first two versioned migrations implement the agreed feature slice. They target a Supabase database with its Auth migrations already applied. They do not create or replace Supabase-owned Auth tables.

Validated with Supabase CLI 2.119.0: a clean local rebuild, 85 pgTAP assertions, three two-connection concurrency scenarios, SQL lint, the live email-confirmation setting, and the application TypeScript/production build all passed. Generated public-schema types are checked in at `shared/database.types.ts`. That initial validation reported both original migrations applied; frontend account flows are implemented; hosted signup email receipt, verified password sign-in, and recovery through password update/home return were confirmed by the user.

## Global profile implementation — 2026-10-16

Historical baseline: the RPC transports described in this section are replaced by `20261024000200_direct_data_api.sql`, now applied locally and to hosted testing; see the current access contract below.

The forward migrations `20261016000100` and `20261016000200` align the deployed global-profile foundation with D-111/D-113/D-114. Global profiles now use trimmed 1–80 character names, nullable bios up to 2,000 characters, immutable identity, and trusted audit triggers. Existing profiles are preserved; their new timestamps mark audit adoption and historical actors remain null because the original migration did not record them. New writes derive the verified caller in `save_user_account_profile`; browser roles have self-only reads and no direct profile writes.

Account flags `user_is_discoverable` and `enable_matchmaking` default true independently; community-account `show_global_profile` defaults false. `set_user_account_preferences` updates only supplied global values for the verified caller. `set_community_global_profile_visibility` changes only that caller's selected community account, under the same active-tenant and pending/approved-standing gates as curated profile editing. Existing joins preserve saved preferences. The global Settings UI persists the two account flags; the sample community UI does not pretend to edit a real community-account preference.

Self-only base-table reads are the deployed milestone behavior, not the intended final audience contract. The user's [2026-10-27 direction](../docs/08-decisions-and-open-questions.md#product-driven-access-design--accepted-2026-10-27) supersedes treating them as a permanent boundary or requiring privileged feature APIs merely to preserve that boundary. Design grants, RLS, field projections and functions from accepted audiences, live preferences, eligibility and applicable account blocks. Eligible community viewers, cross-community composition, result fields and revocation/cache details still need resolution under Q-016; unfinished UI alone does not prevent implementation of a settled data contract. Search/matchmaking, blocking/private labels and atomic profile-bearing joins remain unimplemented. Preference columns alone do not establish feature completion or authorize unrelated data/contact access.

The correction was verified locally with 120 database assertions and database lint, and both forward migrations were successfully applied to the hosted testing project on 2026-10-16. The frontend is local source/build work; no frontend hosting deployment is implied.

## Selected hosted testing environment

- Project reference: `fsnipgsrlclbnfepcbvz`.
- API URL: `https://fsnipgsrlclbnfepcbvz.supabase.co`.
- Initial frontend/Site URL: `http://localhost:5173`.
- Intended exact redirect allowlist: `http://localhost:5173/auth/callback` and `http://localhost:5173/auth/reset-password`.
- Authentication emails: English initially; localization later.
- Email confirmation remains mandatory. Resend is selected, and `thecrowdedtable.app` was purchased through Cloudflare Registrar. Recommended sender: `accounts@auth.thecrowdedtable.app`, pending confirmation of the verified subdomain. See the [Auth operations record](../docs/11-auth-operations.md) for settings and review triggers.

The repository is linked to this project. A fresh verification after reauthentication on 2026-10-16 using CLI 2.121.0 confirmed matching migration history and an empty dry run. Earlier intermittent HTTP 403s are recorded in the Auth operations guide; their cause remains unconfirmed. After the 2026-10-16 deployment, remote migration history lists `20261001000100`, `20261001000200`, `20261015000100`, `20261016000100`, and `20261016000200`; the post-deployment `db push --dry-run` reported no pending migrations. The profile migrations were applied once through the CLI. The reviewed configuration push applied the localhost Site URL, both callback URLs, minimum password length 12, and secure password changes. Email confirmation was already enabled. A subsequent configuration comparison reports zero declared-setting changes; undeclared remote settings were preserved. The user now reports Resend/SMTP configured, and frontend auth/callback handlers are implemented. The user confirmed signup email receipt, verification, and password sign-in returning home. A callback timing defect was fixed and covered by real-SDK regression tests; hosted recovery through password change/home return was confirmed by the user. A fresh signup remains the manual retest for the corrected automatic-confirmation redirect. A later CLI key-read attempt returned HTTP 403; the supplied public key successfully reads hosted Auth settings. Connecting localhost to this URL uses hosted data, not the local Docker database.

## Local persistent API pilot

Use Node 22.18 or later. From the repository root install dependencies with `npm ci`. Start the local Supabase stack, apply pending migrations with `npx supabase migration up --local`, then run `npm run setup:local -w server`. Setup configures an initially credential-less local `ct_api` login and writes ignored server and browser environment files. For an already-provisioned login supply its credential separately. Setup also creates a server-only `DIRECTORY_CURSOR_KEY` if absent, preserving any existing key. It must be 32 cryptographically random bytes encoded as 64 hex characters. Run setup again after this cutover for an existing local environment. Keep runtime secrets out of Vite variables. The frontend and API must use the same Auth project. The default development mode reads the local browser configuration and refuses a hosted Auth URL.

For the local Supabase stack, run `npm run dev:api:local` and `npm run dev:local` in separate terminals. Vite proxies `/api` to the local Fastify listener on port 3001. Settings uses GET/PUT `/api/me/preferences`. Community creation uses POST `/api/communities`. Membership, staff and archive commands use POST `/api/communities/:tenantId/commands`. The browser uses Supabase Auth for the bearer token. The shared [command types](../shared/community-commands.ts) define the payloads. A join requires a submitted community profile. Staff can read authorized current requests at GET `/api/communities/:tenantId/requests`; the response includes the request UUID and account revision used for approval. Grant managers use GET `/api/communities/:tenantId/staff-candidates` for the eligible candidate projection. Auto-approval uses PATCH `/api/communities/:tenantId/settings`. Configuration and self-service browser paths are retired; remaining account-fact surfaces retain their documented grants. Production needs same-origin forwarding and a separately authorized paired API, schema and frontend release. Running a new frontend against an old hosted stack is unsupported.

Run `npm run test:local -w server` for the real Auth/HTTP/SQL suite. It creates and removes only synthetic local users. If local services are forwarded to alternative **loopback** ports, set `CT_LOCAL_API_PORT` and `CT_LOCAL_DB_PORT` for setup and tests. Keep `SUPABASE_JWT_ISSUER` bound to the issuing project's canonical Auth URL. Run pgTAP, populated upgrade, direct HTTP, frontend tests, build and lint as well. The historical hosted test script targets the previous hosted schema and requires revision at coordinated cutover.

## Community foundation preflight

Run the [aggregate preflight](preflight/community_foundation.sql) only on a database still at the pre-cutover schema. Migration `20261103000600` repeats it under table locks and aborts on blockers. Local databases at or after that version use the new relations.

```powershell
Get-Content -Raw supabase/preflight/community_foundation.sql | docker exec -i supabase_db_the-crowded-table-app psql -X -qAt -U postgres -v ON_ERROR_STOP=1
```

The local API test command also checks the public standing reference and the authenticated exact-target community profile route. The latter returns only the eight curated profile fields. It enforces the community owner boundary on archived profiles. Its six capabilities describe a baseline. Resource-specific private activity, archived history and disciplinary exceptions still require their own authorization.

## Local community command verification

Run `npm run test:local -w server` for command authorization, rollback and concurrency through Fastify with real Supabase Auth tokens. Run `node supabase/tests/direct_data_api.mjs` for denial of retired browser reads/writes and direct lifecycle access. That script uses the local server environment to create fixtures through the TypeScript commands. Run `node supabase/tests/direct_data_api_upgrade.mjs` for clean replay, historical pgTAP, populated conversion, injected rollback and the two-session sharing test. Run the current pgTAP suite against the local stack after migration.

Community profiles now use a scoped update. Membership and creation establish the initial profile. Self preferences live in `community_account_preferences`. The personal community card projection remains available. The former staff-candidate and pending-account views and all seven legacy lifecycle/settings RPCs have been dropped locally. The November 3 hosted development cutover now applies this same migration chain; see the current run instructions above.

## Local account history

Migration `20261103001100` closes all ordinary raw history/category reads, including authenticated owners. GET `/api/communities/:tenantId/history` returns `{ rows, next }` using the [shared history contract](../shared/account-history.ts). Optional `target`, `category` (`community_account` or `staff_account`), `eventId`, `cursor` and `limit` are the only query fields. Lists order by timestamp and event UUID descending, default to 50 rows and allow at most 100. Pass `next` as `cursor` with the same actor, tenant and filters; page size may change. Exact-event queries apply the same authorization and filters, ignore pagination and return an empty list for either an unavailable or inaccessible event. Responses use `private, no-store`.

Effective staff require the corresponding audit flag; either flag admits a dual-category event. Owners can read all events, including while archived. Other readers lose access on archive, loss of approved standing, staff pause/revocation, flag removal or Auth ineligibility. Grant/discipline authority alone does not grant history access. Suspension reasons remain on community-only events; the separately authorized linked staff event carries no copy. Original legacy actions and immutable categories survive later role changes. Unclassified entries remain owner-only.

The read transaction holds the tenant against concurrent lifecycle changes before checking current authority. Runtime RLS independently applies the tenant/category/archive boundary even if a query omits its service predicate. The history suite in `npm run test:local -w server` verifies real Auth/HTTP, pagination, reasons, exact lookup, legacy records, REST/GraphQL bypasses, the restricted runtime role and both read/write serialization orders. Current pgTAP adds raw-grant and immutable-category checks. No history UI or hosted rollout is included in this local endpoint milestone.

## Local self-service profiles, preferences and summaries

Migration `20261103001200` revokes browser reads/writes on global profiles, curated community profiles and private community preferences, and drops `my_community_summaries`. It grants the restricted runtime the corresponding self operations. Existing exact community-profile HTTP reads remain available. The [shared self-service types](../shared/self-service.ts) replace the summary view's generated transport type; public schema types are regenerated after the view removal.

GET/PUT `/api/me/profile` returns `{ profile }`, with a null profile only when the caller has not created one. PUT accepts `display_name` and nullable `bio`; actor, timestamps and audit IDs remain trusted. GET `/api/me/communities` returns `{ rows, next }`, with `filter=all|managed|owned`, optional cursor and limit (50 default, 100 maximum). It preserves pending and archived cards, timestamp-descending/UUID-ascending ordering and the ten original card fields. The runtime-only relationship accessor exposes only the caller's tenant IDs and membership/management/ownership booleans; it is the narrow archived-card exception to account-content RLS.

PATCH `/api/communities/:tenantId/me/profile` accepts the name/bio pair and returns `{ tenantId }`. Pending, approved and suspended members may edit their own existing profile in an active community. GET/PATCH `/api/communities/:tenantId/me/preferences` returns the three private preference flags; PATCH accepts a nonempty subset. Reads permit inactive self and archived owner; edits require pending/approved self and an active tenant. Profile writes retain statement-time lifecycle checks without a tenant lock. Preference writes lock the account before the preference row, matching inactivity's lock order. The browser adapter still submits only its supported sharing flag; mock community controls remain simulations.

All operations use verified Auth and `private, no-store`. Feature adapters bind writes to the initiating user and summaries to one identity across every page. The nine-suite `npm run test:local -w server` command includes self-service HTTP authorization, normalization/attribution, pagination, removed REST/GraphQL paths, runtime omission tests, rollback, independent edits and both sharing/inactivity orders. The retained direct Data API suite now expects self-service access to fail. Hosted deployment still requires a matched schema/API/frontend release and separate authorization.

## Local community landing and configuration

Migration `20261103001300` drops `lookup_tenant` and all ordinary browser table/column privileges on tenants, settings and website overrides. The [shared configuration contract](../shared/community-configuration.ts) defines the fields and seven supported copy slots. The former `auto-approval` command variant is removed; settings PATCH is its sole replacement.

| HTTP operation | Current authorization and fields |
| --- | --- |
| GET `/api/public/communities/:slug` | Anonymous exact active slug; seven core landing fields, auto-approval, three public visibility flags and existing overrides containing only tenant ID, key and text. No private pause or audit fields. Unknown/archive both return 404; invalid supplied tokens return 401. No collection or wildcard lookup. |
| GET `/api/communities/:tenantId/details`, `/settings`, `/copy` | Verified approved/suspended member in an active community, or approved owner while archived; full corresponding records. Copy returns `{ rows }`. |
| PATCH `/api/communities/:tenantId/details` | Owner only; nonempty subset of name, country, state/province, city and timezone. Slug, lifecycle and audit fields are immutable here. |
| PATCH `/api/communities/:tenantId/settings` | Effective `can_manage_settings`, including owner while archived; nonempty subset of the five booleans. Does not approve existing requests. |
| PUT/DELETE `/api/communities/:tenantId/copy/:contentKey` | Effective `can_modify_content`, including owner while archived. PUT accepts only `text_value`; DELETE restores the application default. Both return remaining `{ rows }`. |

Public landing copy remains readable with all three public visibility flags off. Those flags govern their independent domains, not the seven hero/welcome slots. Text is stored literally, with the existing per-slot length limits; no HTML interpretation is introduced. Repeating an unchanged write is a no-op; deleting a missing override returns 404. Actor and timestamp attribution remain trusted, and audit details never copy text bodies.

Protected operations verify Auth, lock the tenant before checking current authority, and use `private, no-store`. Public responses use `no-store`. Database grants, configuration write guards and archive RLS provide independent boundaries. The fifth local API suite tests intended/denied audiences, safe projections, rollback, retries, REST/GraphQL bypasses, runtime omission and both configuration/permission lock orders. No management or landing UI is introduced, and no hosted rollout is included.

## Local staff records and participant permissions

Migration `20261103001400` retires ordinary browser staff-assignment grants and the legacy holder/owner browser policy. Participant permissions remain closed to browser roles. The [shared record types](../shared/community-records.ts) describe the full authorized records; staff commands continue to own assignment creation, status and staff-flag changes.

| HTTP operation | Authorization |
| --- | --- |
| GET `/api/communities/:tenantId/staff/:userId` | Holder or effective same-community `can_grant_staff`; holders retain paused/revoked reads. |
| GET `/api/communities/:tenantId/staff` | Effective same-community `can_grant_staff` enumerates full assignments. |
| GET `/api/communities/:tenantId/accounts/:userId/permissions` | Holder or effective `can_manage_community_permissions`; returns participant permissions, never staff flags. |
| GET `/api/communities/:tenantId/participant-permissions` | Effective `can_manage_community_permissions` enumerates participant permission records. |
| PATCH `/api/communities/:tenantId/accounts/:userId/permissions` | Effective `can_manage_community_permissions`; accepts exactly one boolean, `can_post_public_events`. |

The approved owner qualifies for both management audiences and is the only archived reader/writer. Other actors require an active community; effective managers require an active assignment and approved membership. Holder reads do not grant management rights. Stored participant permissions survive inactive/suspended standing; event admission must still enforce its separate lifecycle and activity rules. These endpoints introduce no event-creation behavior.

Lists return `{ rows, next }`, ordered by user UUID, with optional `cursor` and `limit` (50 default, 100 maximum). Cursors bind actor, tenant and record kind. Each page rechecks current authority. Exact reads return the same 404 for absent and inaccessible records. All responses use `private, no-store`; tenant locks serialize reads/edits with lifecycle and staff changes.

A changed participant flag records one `community_permissions_changed` event with boolean `before`/`after` details, trusted actor/correlation and community-history classification, including for staff targets. No-op saves preserve timestamps and produce no event. Independent RLS restricts participant reads/writes and protects both record kinds on archive. Lifecycle commands retain the scoped assignment reads they need; their internal runtime grant is broader than the HTTP full-record audience.

The sixth API suite covers fields, audiences, pages, states, attribution/categories, no-op/rollback, direct REST/GraphQL denials, runtime permission omission and both read/write serialization orders. The existing PostgREST suite and pgTAP also verify the retired surfaces. No new UI or hosted release is included.

## Local community directories and account facts

Migration `20261103001500` retires the last ordinary browser account SELECT grant and policy. Current pgTAP verifies that anonymous/authenticated roles have no remaining public application table/view privileges. This is not completion of the broader Data API/helper/publication/hosting release audit. Supabase Auth remains independent and the public standing reference is served through HTTP.

| HTTP operation | Audience and projection |
| --- | --- |
| GET `/api/communities/:tenantId/directory` | Approved/suspended viewer in an active community; approved/suspended targets only. Each row has `account` (nine accepted facts), `profile` (eight fields or null if missing) and `staff_role` (effective owner/admin or null). |
| GET `/api/communities/:tenantId/accounts/:userId` | Active-community self, eligible peer inspecting an approved/suspended/inactive exact target, or owner management. Nine facts only; no preferences, permissions, revision, disciplinary reason or profile. |
| GET `/api/communities/:tenantId/accounts` | Owner management list across all standings, including while archived. Non-owner staff use their existing operation-scoped request/review routes. |
| GET `/api/public/communities/:slug/directory` | Anyone, for one exact active slug with public directory visibility enabled. Display name and effective staff role only; targets need approved/suspended standing and a curated name. |

The ordinary member directory remains unavailable on archive, even to the owner; owner account management and exact profile reads remain separate. Pending/inactive targets cannot enter ordinary directory listings. Paused/revoked assignments have no badge. A missing profile does not hide an eligible account from its member directory; public listings omit accounts without a display name. Public chat/activity flags and global sharing do not gate member or public directory access. Disabled/unknown/archived public directories return the same 404; valid empty directories return an empty page.

All lists return `{ rows, next }`, with optional `limit` (50 default, 100 maximum) and opaque `cursor`, ordered internally by user UUID. AES-256-GCM encrypts/authenticates UUID positions so public cursors reveal no account identifier. Protected cursors bind actor, tenant and operation; public cursors bind exact slug. Every page rechecks current eligibility. Invalid/tampered/cross-scope cursors return 400. Configure one persistent server-only `DIRECTORY_CURSOR_KEY` across restarts and API replicas; rotation invalidates old cursors. Never put this key in browser variables or logs.

Protected reads lock the tenant before checking current authority. The private public accessor locks the tenant first, then rechecks activity and directory visibility using a fresh statement snapshot. Visibility, standing and archive changes therefore serialize with admitted reads. Existing account/profile archive RLS remains enforced. Runtime command grants retain their existing broader internal reads; fixed HTTP projections and service checks enforce the endpoint audiences.

The seventh API suite checks exact/list distinctions, all standings, badge states, missing profiles, public field privacy, 103-account page boundaries, cursor secrecy/integrity/key stability, REST/GraphQL/helper denials and both read/change serialization orders. Local setup and configured service startup/readiness were also checked. No directory UI or hosted release is included.

## Local global profiles and profile-encounter blocks

Migration `20261103001600` adds directed `user_account_blocks`, discoverable-profile RLS and private exact-target/source predicates. Browser grants remain closed. The runtime may list self/discoverable profiles under RLS, but contextual profiles are available only through the checked exact projection. Other users' preference values, qualifying community IDs and incoming block rows remain private.

| HTTP operation | Current contract |
| --- | --- |
| GET `/api/profiles` | Verified actor; discoverable, bilaterally unblocked profiles only, including self only if discoverable. Optional `q` is a trimmed literal case-insensitive name substring. |
| GET `/api/profiles/:userId` | Seven global-profile fields for self or an unblocked target admitted by discovery or at least one qualifying shared active community with target sharing enabled. Both community accounts must be approved/suspended. |
| GET `/api/me/blocks` | Own outgoing edges only: blocker/target UUIDs, created time and creator. No target profile or incoming edges. |
| PUT `/api/me/blocks/:userId` | `confirmed:true` and `source:{kind:'global_profile'}` or `source:{kind:'community_profile',tenantId}`. Validate a currently readable real profile; selectors alone are not proof. Returns `{blocked:true}`. |
| DELETE `/api/me/blocks/:userId` | Remove only the caller's edge, idempotently. Returns `{blocked:false}` for that outgoing edge; a counterpart's block may still deny access. |

Search and outgoing-block lists use optional `cursor` and `limit` (50 default, 100 maximum), UUID ordering and encrypted cursors bound to actor/search/operation. Exact missing/inaccessible profiles have the same 404. Self-blocks return 400. Repeating an existing own edge preserves attribution/time. A per-caller transaction lock serializes block retries/unblocks; row creation rechecks source authorization in RLS. Caller/creator/timestamps cannot be supplied by clients. Removing a block never restores participation or deletes the reverse edge.

Consent combines across all qualifying shared communities by OR. Discovery opt-out and matchmaking are independent; matchmaking alone grants no profile access. Archive, inactivity or sharing withdrawal removes only that community's contribution. Either block direction denies every non-self global-profile path; community profiles/directories continue under their existing audience rules. No owner/staff bypass is added. Profile responses evaluate current authorization and fields in one statement snapshot. An admitted snapshot can finish while a later change commits; the next statement/page rechecks. Responses use `private, no-store`.

The existing application has no persisted activity/conversation/invitation/match/competition domains. Their real source checks, block previews/mandatory transactional effects and accepted UI confirmation flow remain G-05a/G-05c gates when those packages are built. This endpoint slice adds no UI or fabricated resource effects. The eighth suite covers the current profile/block domain, including source validation, literal search, 102-profile/block pagination, reciprocal edges, rollback, statement ordering and direct bypass attempts. No hosted deployment is included.

## Final local access audit

Migration `20261103001700` closes residual external application privileges, private helpers and postgres-created application-object defaults. Auth/Storage/Realtime platform privileges remain separate. The [final audit report](../docs/21-final-local-access-audit.md) and [metadata catalog](../docs/evidence/access-audit-2026-11-03/local-catalog.json) describe the verified local boundary. Hosted deployment is not included.

GET `/api/communities/:tenantId/me/request` returns verified self's current join/reactivation request as `{request:{request_id,kind,requested_at}}`, or `{request:null}` for an existing account with none. It requires an active community; missing accounts and archived access return 404, and cross-user query parameters are rejected. Command/review/queue/candidate responses now have explicit field allowlists and shared read types.

Run `npm run test:local -w server` for all nine real Auth/HTTP suites followed by the production client boundary scan. The ninth suite compares the exact [runtime privilege manifest](../server/access-runtime-manifest.json), verifies alternate REST/GraphQL/OpenAPI/Storage/Realtime paths and exercises local Auth signup/confirmation/recovery. It cleans up its synthetic Auth, application and Storage fixtures. Run `supabase test db` separately for all 265 pgTAP assertions, `node supabase/tests/direct_data_api.mjs` for the 51 hostile PostgREST checks, and `node supabase/tests/direct_data_api_upgrade.mjs` for clean replay/populated upgrade. SQL fixtures must not overlap HTTP fixture suites.

The local helper supports `CT_LOCAL_API_PORT=15421` and `CT_LOCAL_DB_PORT=15422` for this machine's forwarding. The server's ignored `.env.local` must use the same restricted local database endpoint. Default ports remain available when forwarding is unnecessary. Scripts validate loopback rather than accepting a hosted target. For CLI SQL checks on this machine, obtain the local DB URL from CLI status without printing it, verify its host is loopback and database is `/postgres`, and change its port to 15422. The installed CLI accepts `test db --remote=<that-explicit-loopback-URL> --yes` and `db lint --remote=<that-explicit-loopback-URL> --schema public,app_private --level warning`. Never substitute bare `--remote`, which selects the linked hosted project; the test scripts' port environment variables do not redirect CLI commands.

When a migration changes runtime authority, review its operation/audience/fields and update bypass tests before explicitly updating `server/access-runtime-manifest.json`. `supabase/tests/access-catalog.mjs` exports `accessCatalog(client)` for metadata capture through a local administrative pg client. Compare its `runtime` to the reviewed manifest; retain only metadata in evidence. Never capture connection strings, Auth identities or application rows. Future application objects get no automatic runtime grant either.

Local Data API stays enabled as a hostile-client harness with no external application grants. Hosted Data API exposure, credentials, advisors, SMTP/browser callbacks, production-scale query plans, capacity and recovery remain release checks. New persisted resource domains need their own policies and real source validation before any Storage/Realtime or profile-access exception is introduced.

## Local development

From the repository root, with Docker running and the Supabase CLI available:

```powershell
npx --yes supabase start
npx --yes supabase test db
npx --yes supabase db lint --local --level warning
```

To rebuild **only this project's disposable local database**, `npx --yes supabase db reset --local` reapplies migrations and deletes local data. Do not use reset against a database containing work you need. The configuration enables email/password signup, requires email confirmation and a minimum 12-character password, disables anonymous Auth users, and captures local email. Production confirmation, SMTP, site URL, and redirect allowlists must be configured separately; local TOML is not evidence that hosted Auth is configured.

Regenerate the checked-in types after schema changes:

```powershell
npx --yes supabase gen types typescript --local --schema public | Set-Content -Encoding utf8 shared/database.types.ts
```

Apply these files in timestamp order through the Supabase migration workflow. Once deployed, change behavior with a new migration rather than editing an applied file. No remote deployment is performed by these files or the tests. Review `supabase db push --dry-run` against the intended linked project before a separately authorized deployment. Do not roll back by dropping account/tenant tables containing user data; use forward repairs and backups.

## Pre-cutover data and access (historical)

The [intended access matrix](../docs/16-intended-access-matrix.md) now distinguishes target field/audience/operation rules from the deployed behavior below. AM-01's mandatory intra-community profile visibility is accepted; global-profile sharing remains separately user-managed per community account. AM-02 also settles authenticated global search with discovery opt-out, independent global activity visibility through the shared matchmaking/competition flag, and community-activity isolation from global profiles. Other applicable AM questions still require discussion; do not interpret current self/owner-only policies or the earlier three-RPC proposal as a substitute for those answers. No schema change accompanies the matrix.

Security follow-up correction (2026-10-27): the [three-RPC proposal](../docs/06-backend-patterns.md#security-advisor-read-rpc-proposal--2026-10-27) requires reassessment against intended product access; it is not an implementation instruction. Build the target audience/operation/field matrix before choosing transports or preserving current base RLS. No new migration exists; the views and grants below remain deployed and the advisor findings remain unresolved. This documentation correction does not authorize database changes or deployment. See [investigation evidence and limits](../docs/12-implementation-status.md#security-advisor-investigation-and-proposal--2026-10-27).

The global-profile additions above extend this original milestone description.

The original eight application tables are: `user_accounts`, `tenants`, `tenant_settings`, `tenant_staff_assignments`, `community_accounts`, `community_account_profiles`, `tenant_website_content_overrides`, and `tenant_admin_actions`.

All application tables have RLS. As of local migration `20261024000200`, independent edits use per-operation policies and column-specific DML grants. Retained commands use verified-user RPCs with fixed empty search paths and fully qualified references. Internal helpers live in the non-exposed `app_private` schema; only policy read helpers are executable by authenticated users. Never add `app_private` to exposed API schemas.

| Direct PostgREST operation | Authorization / behavior |
| --- | --- |
| `user_account_profiles` upsert | Verified self; omit `user_id` so Auth supplies it; name/bio only |
| `user_accounts` update | Verified self, explicit user-ID filter; discovery/matchmaking flags only |
| `community_account_profiles` upsert | Verified self, active tenant, pending/approved standing; omit `user_id`; conflict key `(tenant_id,user_id)` |
| `community_accounts` update | Same lifecycle/standing gates; one `saveCommunityAccountPreferences` request for all supported preference fields, currently `show_global_profile` only |
| `tenants` update | Owner, including archived; name/location/timezone only |
| `tenant_website_content_overrides` upsert/delete | Active same-tenant staff with `can_modify_content`; delegated edits require active tenant; owners retain archived access; delete resets an override |
| `tenant_admin_candidates` select | Active same-tenant `can_create_admin`; tenant ID plus original verified-candidate projection |
| `tenant_pending_community_accounts` select | Active same-tenant `can_approve_users`; tenant ID, user ID and optional display name |

The two administrative views deliberately use definer semantics and explicit caller predicates; base profile reads remain self-only. Client filters cannot widen their audience. Profile inserts/updates and tenant detail edits normalize text in triggers; audit/identity safeguards apply to every write. Column grants permit restating upsert conflict keys, while triggers reject changing them. Browser writes cannot supply audit fields. Use explicit filters on UPDATE/DELETE (PostgREST safeupdate requires them) and `.select(key).single()` to surface zero-row results as failures. Resetting a missing/unknown override returns no row and is therefore a failed single-row save, rather than the former RPC's dedicated unknown-key exception.

| RPC | Authorization / behavior |
| --- | --- |
| `lookup_tenant(p_slug)` | Anonymous or authenticated; seven safe fields for one active tenant |
| `create_tenant(...)` | Verified account; atomically creates tenant, settings, sole owner, and optional approved community account; returns tenant UUID |
| `set_tenant_archived(...)` | Owner; reversible archive/restore |
| `set_auto_approve_users(...)` | Owner; affects future joins only |
| `join_community(...)` | Verified user, active tenant; returns standing; retries preserve existing standing |
| `approve_community_account(...)` | Active same-tenant staff with `can_approve_users`; pending → approved only |
| `create_tenant_admin(...)` | `can_create_admin`; target must be a verified same-tenant community account; no permission inheritance; duplicate assignments fail |
| `set_admin_permissions(...)` | Owner; edits three flags on active admins; omitted/null flags retain their values, including legacy four-argument callers |

Owner management commands work while archived. Ordinary participation and delegated admin actions do not. Owner authority remains independent of community standing; assigning an admin does not approve participation. No suspension/removal/reinstatement, staff invitation, ownership-transfer, or directory commands ship here.

Authenticated direct reads are self-only for global accounts and community participation/profiles, owner-only for tenant details/settings/audit, and self-or-owner for staff assignments. Content editors may read override rows and their attribution; this exposes neither tenant-wide audit history nor other users' profiles. Archived self relationship reads remain allowed by migration 20261024000100. Owners see other users' display names only through narrow administrative views. Website slots remain private; ordinary participant content audiences are separate future work, with no payment prerequisite. Render stored copy as text, never raw HTML.

## Invariants and implementation choices

- Slugs: 3–63 lowercase ASCII letters/digits with single separating hyphens; immutable; reserved route names are listed explicitly in migration 1. Extend that list with future route changes.
- Names: 1–120 trimmed characters; region/city nullable, at most 120. Country uses the enumerated two-letter ISO country-code set. Timezones must exist in PostgreSQL's timezone catalog.
- Profiles: required trimmed display name of 1–80 characters; optional bio up to 2,000. No profile is required for staff authority.
- Exactly one owner and one settings record must exist when a transaction completes. Unique and deferred constraint triggers enforce this; owner changes/deletion are prohibited. Owner inserts normalize all administrative flags to true; later disabling them is rejected.
- Retained commands lock the tenant row before checking permissions/state, serializing archive, approvals, settings, and staff changes. Independent edits do not explicitly lock the tenant; ordinary PostgreSQL row/FK locks still apply. Community profile/preferences use statement-time eligibility; an in-flight save may finish alongside an access/lifecycle change. Slug uniqueness is enforced by the database, including concurrent creation.
- Audit actor UUIDs reference global users. `NULL` means system. Signup records are attributed to the new user; backend actions preserve the initiating user's JWT identity. A worker without a user context records system attribution. Do not run human-initiated jobs with a service credential and silently lose the initiating actor; design that worker's trusted attribution contract first.
- Audit timestamps/actors are stamped by triggers. Referenced user/Auth deletion is restricted; human references are never nulled by deletion. `tenant_admin_actions` is append-only and deliberately omits update audit columns. It stores actor, operation, tenant and target identifiers, not profile/copy contents or a full before/after history.
- New permission migrations must update owner initialization, checks, and tests together. No platform bypass is exposed to browser roles. Database administrators/service credentials remain trusted infrastructure.

## Validation

For the direct Data API slice, run `npx supabase test db`, `node supabase/tests/direct_data_api.mjs`, and `node supabase/tests/direct_data_api_upgrade.mjs`. The first rolls back SQL fixtures. The HTTP/concurrency script accepts only the local loopback API on port 54321 and hardcodes this project's Docker database; it creates random synthetic identities/tenants and cleans up only those records. It exercises actual SDK upserts, filters/affected-row handling, independent member edits, profile saves while the tenant is locked, and retained permission/archive/slug races. The upgrade script creates and removes a temporary database with a minimal Auth schema contract for clean replay/populated upgrade checks; real Auth-schema behavior is covered by the other two suites. Credentials stay in process memory and are not printed.

Completed local verification: 232 SQL assertions, 45 HTTP checks plus concurrency scenarios, clean replay/populated upgrade, 74 frontend tests, build, ESLint and database lint pass. The existing bundle-size warning remains. Run the SQL and HTTP suites sequentially: SQL tests assume their rollback fixtures are the only synthetic communities visible in the local database.

Deployment boundary: `20261024000200` is applied locally and to hosted testing (`fsnipgsrlclbnfepcbvz`). All seven migration versions match and the final dry run is empty. Eight old RPCs are removed: use the updated frontend source; old RPC-based builds require updating. No frontend hosting deployment, compatibility fallback, or environment switch was performed.

Hosted verification on 2026-10-24: `node supabase/tests/hosted_direct_data_api.mjs --allow-hosted-testing` passed 48 actual PostgREST checks. This separate, explicitly opted-in script pins the testing project and verifies linkage before using CLI-provided keys in memory. It creates real password sessions for random synthetic users, checks profile/preference/content-permission paths, and removes its application fixtures and Auth users, verifying zero fixture users/tenants remain. Normal Auth audit events may remain. It does not test email delivery, visual UI flows, or hosted concurrency races. Local scripts remain local-only. See implementation status for the detailed hosted coverage and credential resolution.

`upgrade-fixtures/pre-community-api/identity_tenant.test.sql` uses pgTAP and real anonymous/authenticated roles against Supabase's Auth schema. Fixtures roll back. It covers two-tenant isolation, verification gates, owner invariants, protected writes, explicit admin permissions, public lookup, copy validation, archival, audit attribution, and restrictive deletion.

The pre-cutover `upgrade-fixtures/pre-community-api/concurrency.mjs` exercises simultaneous database connections for archive versus join, permission revocation versus approval, and duplicate slug creation. It targets only the dedicated Docker container `crowded-table-migration-test` and leaves fixtures there. Do not point it at development/production data. Prepare that disposable container with Supabase PostgreSQL, apply the matching GoTrue Auth migrations, and then apply the original two application migrations before running `node supabase/upgrade-fixtures/pre-community-api/concurrency.mjs`. Remove the disposable container after the run.

Frontend account flows and user-assisted hosted delivery/recovery results are tracked in the Auth operations record. My Account → My Communities integrates `create_tenant` and the caller-scoped All/Managed/Owned summary list; the auth bar has been removed. Creation submits no user ID, role, permission, or audit fields; the database derives these from the authenticated actor. Optional participation defaults off; opting in creates an approved community account in the same transaction. The five preview sections still use mock data; joining existing communities, curated profile UI, and management UI remain separate work; global profile editing is implemented. A database test of verified state is not an end-to-end email verification test.


2026-10-24: migration 20261024000100_my_community_summaries.sql deployed to the selected hosted testing project. Six migration versions match and linked dry run is empty. Caller-scoped restricted summaries and archived self-relationship reads passed hosted existing-data authorization checks; real All/Managed/Owned browser flows passed. Full relationship-state matrix remains locally tested. See docs/12-implementation-status.md for detailed evidence and limits.

Global communication preference: 20261024000300_account_communication_preferences.sql is applied locally and to hosted testing. It adds user_accounts.allow_direct_messages (NOT NULL DEFAULT true) and its column UPDATE grant under existing verified-self RLS. Hosted testing supports the expanded frontend read/saveAccountPreferences projection. Local verification: 55 PostgREST checks, 232 pgTAP assertions, clean replay/populated upgrade; hosted verification passed 69 PostgREST checks, including every combination of the three account preferences, persistence, defaults, audit attribution and authorization denials; fixture cleanup verified.
