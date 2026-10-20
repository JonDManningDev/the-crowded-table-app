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


## UI style guide and control refactor — 2026-10-16

The [UI style guide](13-ui-style-guide.md), based on the user's supplied guidelines (D-122), is now canonical. Implemented shared Link, ActionLink, Button and NavItem primitives with colocated CSS Modules and shared semantic action tokens in the existing root token system. Navigation selection has separate tokens and a visible indicator; no primary-action class represents route selection.

Audited and refactored existing account/auth/community pages, sidebar/mobile menus, account navigation, shared dialogs, activity cards and local view/filter controls. Ordinary route buttons are now links, including auth destinations, creation/cancel/list navigation, premium destinations and the community avatar. Account tabs and menu items derive active state from NavLink, using exact matching. AccountContext no longer carries imperative route callbacks. All action controls use the native Button primitive with a non-submit default; form submissions explicitly opt in. Async saves expose busy/disabled states. Navigation unavailable during auth/creation commands is replaced by noninteractive status text; signed-out premium Manage is explanatory text rather than a disabled anchor. Creation's secondary “Back to My Home” link now matches its destination explicitly.

Validation: **57 tests pass**, production/TypeScript build and ESLint pass. Added tests cover keyboard action/submit behavior, disabled/loading commands, internal/external native links and new-tab attributes, route-relative links with search/fragments, and exact active matching. Existing auth, SDK callback/recovery, profile, community-list and history regression tests pass with link semantics. Browser review confirmed desktop My Home, mobile My Home and sign-in at 390×844, plus sign-in/home link navigation; the viewport and original home page were restored. No hosted writes or account submissions were used for browser review.

The existing Vite bundle-size warning remains. This is local source/build work, with no frontend deployment or database migration. Unrelated page/layout/filter/icon styles remain in legacy global stylesheets; broad CSS Module migration, complete visual/contrast auditing across all mock states, theming configuration and domain functionality remain follow-up work. Shared action appearance definitions have moved out of App.css; remaining global button-class hooks are contextual layout rules.

Style-guide organization follow-up: the document now has a general UI Style Guide title, with Navigation, Links, and Buttons as a second-level facet and its existing guidance nested beneath it. Future UI facets can be added as peers. This documentation-only change preserves the accepted rules; heading hierarchy and diff whitespace were checked.

Sidebar refinement (2026-10-16): removed direct My Home/My Communities links from desktop and mobile personal navigation; account tabs retain both destinations. The account link now has 12px vertical/14px horizontal padding and NavLink subtree matching across account pages. Navigation regression tests, build and lint pass. This is local frontend work; no deployment or schema changes.

Account-tab scroll refinement (2026-10-16): route changes focus main content with preventScroll and reset the viewport to the top before paint, keeping the breadcrumb visible regardless of page height. The explicit skip link retains its scroll behavior. Browser checks switching Overview and My Communities both reported scrollY 0 with main-content focused. All 21 navigation tests, build and lint pass; existing bundle warning remains. Local frontend change only.

Horizontal alignment refinement (2026-10-16): the short My Communities page removed the document scrollbar, moving the centered shared content about 7px right. Added scrollbar-gutter: stable on html and recorded the layout rule in the style guide. Browser measurements now show the same heading left edge (297.286px) for Overview and My Communities at the checked desktop viewport. Build, lint and whitespace checks pass; no deployment or schema changes.

## Account tab width and styling review — 2026-10-17

Removed My Communities' 900px page cap; its wrapper now uses the shared container width. Browser measurements confirm the list and tab row share both edges at desktop (1280px wide) and the right edge at 390px mobile, with no horizontal overflow. Build and lint pass; existing bundle warning remains. Documentation updated; no deployment or database changes.

Other differences identified for discussion, not changed or accepted as new standards:

- Card geometry: ordinary panels use 27px padding/9px corners, community rows 28px/10px, My Home small cards 24px/10px, and its hero 38px/12px. Recommend a shared standard card treatment with a deliberate spacious hero variant.
- Surfaces: Overview/Settings panels are warm white, My Home small cards use a slightly different off-white and its hero is sage, while community rows are transparent over the page background. Consider one standard surface for ordinary cards; keep sage for intentional emphasis.
- Body typography: community paragraphs are 13px with the muted token; standard panels generally use 12px and a separate hard-coded muted green. My Home mixes 12px small-card copy and 13px hero copy. Consider shared body/metadata sizes and muted color tokens.
- Introductory spacing: My Home/Settings start with a card directly below the tabs; Overview inserts a placeholder note; My Communities inserts toolbar text and a separate signed-out prompt before its list. Consider a consistent location and spacing for introductory/status text, without requiring identical page composition.

The browser review used signed-out pages. Signed-in-only actions/preferences were inspected in source, not exercised through hosted writes. Overview's summary column and My Home's hero/grid are intentional content structures under D-120, not automatically defects to remove.

## Account presentation decisions applied — 2026-10-17

The follow-up annotations approve the Overview standard panel baseline: #fffef9 background, 27px padding (22px up to 1200px), 9px corners and the existing border. Shared tokens now cover account panels, My Home hero/cards and community rows. Overview summary composition remains specialized. Standalone introduction/placeholder notes were removed; in-card feature descriptions and labels remain for signed-in unfinished features.

All four signed-out account tabs render only the requested tab-specific sign-in message beneath their shared heading/navigation. Account contents, editors, settings and mock/sample cards are not mounted. Loading session state shows a loading message. My Communities also gates its standalone component. This supersedes the prior signed-out sample-row presentation; community preview routes themselves remain unchanged.

Validation: 62 tests pass, including all four signed-out messages, no mock content during restoration, removal of community rows on sign-out, and signed-in profile/workflow regressions. Build and lint pass; the existing bundle-size warning remains. Browser inspection confirmed the signed-out My Communities message without sample content. Signed-in visual rendering was not manually verified in the signed-out browser. No hosted deployment or SQL changes.

Typography breakdown (unchanged, for decision): standard Overview/Settings panel paragraphs are 12px, line-height 1.8, #7b8770; Overview descriptions may override to 13px. Community body/location/status paragraphs are uniformly 13px, line-height 1.8, muted #747c70. My Home small-card paragraphs are 12px/1.8/#747c70, while hero paragraphs are 13px/1.9/#53644f. Secondary metadata is not uniform: generic .meta is 11px/#747c70; profile location is 10px/#8a8f7f; setting descriptions are 10px/#8e987e. Eyebrow/Coming soon labels are a separate 9px uppercase, letter-spaced style. Recommend defining semantic body, secondary metadata and eyebrow roles separately, and deciding their size/color/line-height before implementation; no typography values were changed here.

## Account typography — 2026-10-17

Applied the approved type roles through shared tokens: body 13px/1.8, secondary metadata 11px/1.8, eyebrows 9px/1.6. Account-scoped CSS Modules normalize inherited legacy paragraph, notice, settings-label/help, location, statistic-label, tag and subscription-detail rules without changing the community profile screens. My Home module uses the tokens for hero/card copy, labels and illustration metadata; community handle/role/status/location copy is explicitly classified as metadata. Headings, decorative serif text, statistic values and navigation/action labels remain separate. Existing colors and letter spacing remain unchanged.

Verification: 62 regression tests pass. Production build and lint pass; existing bundle warning remains. Browser-computed styles on the signed-out account page confirm 13px/23.4px body text and 9px/14.4px eyebrows. Signed-in metadata styling was inspected in source; no authenticated visual check is claimed. No database or deployment changes.

## Account text colors — 2026-10-20

Applied approved semantic tokens across account tabs: heading/eyebrow #173f32, body #53644f, metadata #8a8f7f. Scoped account overrides cover legacy panels, descriptions, settings labels/help, community details, tags and statistic labels; My Home's local eyebrow styles use the same token. Preserve decorative copy, illustration lettering, controls and feedback styling. The style guide records a deferred decorative-variant review and proposed toast/inline-validation patterns; no feedback infrastructure was added.

Verification: production build and lint pass; the existing bundle-size warning remains. Source/cascade inspection and numerical contrast calculations completed; authenticated browser visual verification was not performed. No database changes or hosted deployment.

Contrast against card #fffef9 / page #f8f7f2: heading/eyebrow 11.60:1 / 10.92:1; body 6.30:1 / 5.93:1; metadata 3.29:1 / 3.10:1. Metadata on tag #e9eee3 is 2.82:1; body on notice #e4ebd9 is 5.20:1. The selected 11px metadata color is below the 4.5:1 normal-text threshold in [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Keep the explicitly chosen color for review; improving metadata contrast remains outstanding and is not a verified accessibility pass. Numerical contrast does not replace visual review of small text at different viewport sizes.

## Styling decision reconciliation — 2026-10-20

Documentation-only follow-up: the UI style guide and D-122 now record the accepted metadata replacement #6b665e, toast timings/capacity/timer pauses/dismissal/focus protection/deduplication, and the approved basic form-validation pattern. Existing navigation, account alignment/scrolling, cards, signed-out views, type metrics, body/heading/eyebrow colors and decorative-review deferral remain canonical. Earlier entries above are historical implementation snapshots; the current requirements live in the style guide.

The user reports visually checking #6b665e on Overview through browser tools. Calculated contrast is 5.64:1 on cards, 5.31:1 on the page and 4.83:1 on tags. The repository still uses #8a8f7f in --text-meta-color; applying the accepted replacement remains pending. Toast infrastructure and shared form-validation behavior are also pending. Inline API recovery is clarified as a proposal, with examples, rather than silently treated as an implemented or fully settled lifecycle. Remaining feedback details are explicitly listed in the style guide.

Verification: reviewed the documentation against the confirmed conversation decisions and checked documentation whitespace. No application code, tests, database state or deployment changed in this follow-up.

## Metadata applied and feedback refined — 2026-10-20

Changed src/index.css --text-meta-color to #6b665e; existing account metadata consumers now use the accepted warm gray. This completes the pending token change noted above. Production build passes with the existing bundle-size warning. No new browser review or hosted deployment is claimed.

Documentation now accepts concise icon-led outcome toasts with 4-second dismissal for both success and failure (superseding 10 seconds for failure), and retained inline API errors containing the response code and specific API message. The style guide, decision register and backend error direction are reconciled. Typed error taxonomy and shared feedback components remain future implementation; no toast/error-handling code changed. Exact error contract, clearing behavior and previously listed toast edge cases remain open.

CSS compatibility maintenance (2026-10-20): added standard line-clamp:2 alongside -webkit-line-clamp:2 in .post-card>p in src/App.css to address the editor vendorPrefix warning. Existing two-line truncation fallback is retained. Production build and whitespace checks pass; existing bundle-size warning remains. No deployment performed.

## Route-based lazy loading — 2026-10-20

Measured the original 622.91 KB minified / 181.92 KB gzip entry bundle. Build module attribution (rendered module sizes before final minification, not network sizes) identified React DOM, Supabase, application code and React Router as the major groups. The router previously imported all feature pages eagerly.

Implemented React.lazy boundaries for AccountPage/PremiumFeaturesPage (one module), Community Home, Meet & Play, Championship, Discussion and Profile. ActivityDialog loads only when opened. The application shell, router, Auth/session/callback initialization and existing mock state stay eager. Shared profile presentation is reused in a common chunk. Account tabs remain together to preserve the existing composition and avoid extra tab-level loading steps. A shared Suspense/error boundary preserves surrounding navigation, announces loading, and offers explicit reload after failures with an unsaved-changes warning. Route changes clear boundary failures without remounting healthy account content solely because the pathname changes. React transitions may retain prior content while a requested route resolves.

Production build: entry is now 530.41 KB / 156.93 KB gzip (about 15% smaller minified). A first account visit also needs AccountPage, Profile and format chunks: approximately 563.06 KB / 168.06 KB gzip in total, excluding CSS, fonts and API requests. Other feature chunks range from 8.73 to 16.55 KB, plus a 0.28 KB shared helper. These are build estimates, not browser timing measurements. Total assets are slightly larger because splitting adds loading/module overhead; unvisited features are deferred rather than deleted. The entry still exceeds 500 KB, so the warning remains. No vendor chunk configuration or threshold adjustment conceals it. Further shared-runtime/Auth decomposition is future work requiring its own measurements.

Verification: 64 tests pass, including new deferred-content and rejected-import recovery tests, existing direct routes/history/account/privacy/guest-preview flows and Auth/SDK callback tests. Navigation tests now await lazy imports and committed routes. Production build and lint pass. The sandbox test runner could not read temporary transformed files; the suite passed outside the sandbox. No hosted deployment, database change or browser network/performance test is claimed.
