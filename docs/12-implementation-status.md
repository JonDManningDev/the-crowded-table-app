# Account and navigation implementation audit — 2026-10-16

Scope: the sidebar/account/community-list changes, profile migrations, and subsequent router implementation in the 2026-10-15–16 chat. This is an implementation record, not approval to implement all planned domain features. Sources: the user's requests (D-120), D-111–D-114, Q-016, schema/auth/backend/frontend plans, and the delivery acceptance criteria.

## Implemented

| Area | Current behavior |
| --- | --- |
| Sidebar and account routing | Display name, first-character badge, one-line ellipsis, no account subtitle, account link to `/account`; mobile account link included. Missing profiles use a neutral label, not email or curated profile data. |
| Account tabs | Overview, My Home, My Communities, Settings between heading and contents. Summary card only on Overview; tabs use clean account paths. |
| Account profile | Verified caller can create/edit name and optional bio without community participation. Limits are 80/2,000 characters. API data access belongs to `user-accounts`; the existing Auth-context provider supplies the shared account identity. |
| Profile form failures | All entry points respect load/auth availability. Changes in availability are explained inside an open editor; failed saves retain drafts and do not claim success. |
| Auth actions | Auth bar and global sample disclaimer removed. Sign Out appears opposite breadcrumb; signed-out Sign in/Create Account remain available. Auth confirmation/recovery behavior preserved. |
| My Communities | Fetched **owned** communities and a labeled sample row in one list, with loading/error/retry states. Start New Community is here; creation/cancellation returns here and reloads the list. No second auth-bar list screen. |
| Preferences | Persisted independent global `user_is_discoverable` and `enable_matchmaking` flags, both default true, with Settings controls. Community `show_global_profile` defaults false and has a self-controlled command with current curated-profile lifecycle gates; no real community preference UI yet. |
| Database boundary | Self-only base profile reads; verified-caller write RPC; audit fields/triggers, immutable identity, no direct browser profile writes. Existing names/bios preserved. Historical audit actors remain null because the initial migration did not record them; adoption timestamps are not claimed to be original creation times. |

## Deployment evidence

Local and hosted testing project `fsnipgsrlclbnfepcbvz` have the five migrations through `20261016000200`. The hosted CLI successfully applied `20261015000100` and then both corrective migrations. The final hosted migration listing matched local files and `db push --dry-run` reported up to date on 2026-10-16. Temporary HTTP 403 failures were resolved by the user's CLI sign-in before successful deployment. The audit's first read-only recheck returned HTTP 403. After the user's next CLI sign-in, a fresh check on 2026-10-16 with CLI 2.121.0 succeeded: all five local/hosted versions match and `db push --dry-run` reports up to date, with no pending migrations, seeds, or roles. No new SQL was required or applied during this audit.

Frontend changes are in this working tree and have a production build. **No frontend hosting deployment was performed or verified.** Migration-history checks prove application of SQL, not a complete end-to-end browser acceptance test. No hosted user data was reset, and applied migrations were preserved with additive corrections.

## Deliberately preserved and still planned

- D-120 explicitly preserves mock overview statistics/interests/games, notification preferences, and community Profile during this slice. Global name/bio and discovery preferences are real; remaining personal feed sections, sample community activity/profile edits, and support notes are mock/placeholder behavior.
- My Premium Features, its sample ownership row, Manage → My Communities, and Explore Premium Features are requested placeholders. There is no subscription table, real subscription enumeration, per-feature management interface, billing or purchased entitlement. This scoped UI preservation does not approve commercial gates in real features. Pre-existing community payment/member simulations remain a known domain-refactor discrepancy.
- The community list fetches owners' tenants only. Joined-but-not-owned communities, actual tenant-scoped frontend routing, community directories, and persisted curated-profile editing in the UI are still planned. The backend curated-profile command already exists.
- D-112 atomic community join/profile submission and optional creator participation with an editable global pre-fill remain unimplemented. Existing join/create commands still permit profile-less community accounts; this audit does not silently change those contracts.
- Q-016 still gates other-user profile APIs: eligible viewers, cross-community composition, safe search/matching projections and revocation semantics need resolution. Preferences do not grant direct table reads or contact permission. Blocking/private labels, global search and matchmaking engines remain planned; no broad RLS read was added.
- Broader community lifecycle/staff changes, event/table/chat persistence, PWA/offline behavior and full feature-directory/query-layer migration remain outside this chat's implementation scope. Their accepted requirements are unchanged.

## Verification

The profile correction passed 120 local pgTAP assertions covering validation, trusted actors, direct-write denial, self-only reads, independent flags, retry preservation, and community/global lifecycle separation. Database lint passed. Frontend tests cover account routing, sign-in/out, consolidated lists, profile load/save behavior, saved preference independence and failure handling. The final audit run passed all 38 frontend tests, production build, and ESLint. Vite retained its existing bundle-size warning; no new bundling work was included. No new manual browser or responsive visual check is claimed by this audit.


## Router implementation — 2026-10-16

Implemented locally with React Router 8.4: BrowserRouter, centralized URL constants and route composition, a shared layout/Outlet, router links, URL-driven account/auth screens, and a not-found page. The ordinary root path redirects to `/account/home`. All old hash routing and compatibility aliases are removed as explicitly requested; hashes are not inspected for page selection. Supabase's token-fragment processing remains intact.

Account paths are `/account`, `/account/home`, `/account/communities`, `/account/settings`, and `/account/premium-features`. Community creation uses `/account/communities/new` and waits for restored, verified authentication. Auth forms use `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, and `/auth/check-email`; configured callback/reset URLs stay unchanged. Sample community pages live under `/community/preview`. Unknown real-community URLs show not found, never sample tenant data.

Verification: **53 frontend tests pass**, including direct application paths/trailing slashes, legacy-hash non-routing, unknown paths, tab/sidebar navigation, browser Back/Forward, community-creation auth gating, and real-SDK confirmation/recovery before React mounts. TypeScript/production build, ESLint, and diff whitespace checks pass. The existing large-bundle warning remains. The Windows sandbox test run could not read Vitest temporary files; rerunning outside that sandbox passed. No manual browser/visual acceptance or frontend hosting deployment is claimed.

No new SQL was needed and the previously verified hosted migration status above is unchanged; no fresh database deployment check was needed for this client-only change. Production hosting still needs an SPA fallback to `index.html` for direct application route requests. Real tenant routing, server-state/query refactoring, and the domain features listed above remain planned.
