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

## Shared-bundle audit and reduction — 2026-10-20

Inspected the entry chunk's module graph. Major remaining groups, measured as rendered module bytes BEFORE final minification (not network sizes): React DOM 536,767; Supabase 369,835; React Router 82,338; application 82,004; other dependencies/runtime 40,850. The installed Supabase client constructs Auth, PostgREST, Storage and Realtime clients; Storage/Realtime/Phoenix code remains included even though current application calls mainly use Auth/database APIs. We did not substitute SDK internals or split session ownership.

Applied two low-risk boundaries: AuthShell dynamically imports CreateCommunity only after its existing session-ready/verified gate, and GameArt moved unchanged from components/ui.tsx into components/GameArt.tsx, imported by existing deferred feature consumers. Creation validation/country data now loads with that screen; GameArt no longer rides along with the shell's Icon/Avatar/Modal imports. Build module assertions confirmed CreateCommunity, tenantCreation and GameArt are absent from the entry. Auth URL capture, client creation, initialize/getSession ordering, auth events, profile provider, and auth forms remain eager.

Production entry: 530.41 -> 519.16 KB minified; 156.93 -> 152.95 KB gzip. CreateCommunity is a 7.81 KB JS chunk; GameArt is 4.04 KB. First account visit still needs GameArt via Profile: entry + AccountPage + Profile + format + GameArt = 555.94 KB JS (about 165.87 KB summed build gzip estimates), down from about 563.06 KB / 168.06 KB. Account still loads shared creation CSS through OwnedCommunities, but not the creation JavaScript. These are emitted-asset measurements, not measured browser latency or live network traces. The 500 KB warning remains; no threshold increase or vendor-only reshuffling hides it.

Verification: 65 tests pass, production build and lint pass. Added coverage for delayed verified-session restoration before creation, draft preservation on token refresh, and removal on sign-out; existing real-SDK signup/recovery URL-consumption tests continue to pass. Artwork markup was moved unchanged; no new visual/browser performance verification is claimed. No deployment or database changes.

Remaining candidates: separating Auth form presentation from its eager session coordinator could defer a modest additional amount, but warrants focused draft/validation/callback coverage; moving community mock state out of the global shell belongs to a broader state-ownership refactor. React DOM/routing and the supported Supabase client remain the main shared costs. Merely putting these in vendor files would not reduce initial downloaded code. Avoid replacing the SDK or changing session initialization solely to remove a size warning.

## User-account structural cleanup — 2026-10-20

Renamed/moved AccountPage to user-accounts/pages/UserAccountPage.tsx with its CSS Module. Extracted the four requested tab components under user-accounts/components, moved My Home/My Communities styles, AccountPreferences and its tests, OwnedCommunities, and the existing ProfileOverview/ProfilePreferences presenters there. Updated the community Profile imports without changing its separate data/state. Shared primitives and visuals remain shared as clarified by the user. PremiumFeaturesPage now has its own page file/lazy import; old account/home/community-page entry files and embedded mode were removed. Existing account URLs, gating, profile editor behavior, placeholders and owner-list fetching remain intact.

Verification: all 65 tests pass, including account tab composition, signed-out/session-loading states, profile draft/error behavior, discovery preferences, owner-list behavior, community preview, navigation/history and Auth callbacks. Production build and lint pass. Entry bundle remains approximately 519.19 KB / 152.99 KB gzip with the existing warning. UserAccountPage is deferred; it no longer imports the whole community Profile module, only the extracted presenters. No manual browser visual verification, hosted deployment or database changes are claimed. README and current architecture/file-structure guidance now reflect the implemented ownership; older implementation entries remain historical evidence.

## Account and community preferences panels — 2026-10-21

Renamed user-accounts/components/AccountPreferences and its test to AccountPreferencesPanel. Extracted the My Premium Features markup unchanged into PremiumFeaturesPanel. AccountSettingsTab now composes only the persisted discovery panel and premium placeholder panel. Moved ProfilePreferences to communities/components/AccountPreferencesPanel and updated community Profile to use it. Removed unused personal support state/dialog and Settings props; community support and preferences behavior are retained. Shared ProfileOverview remains reused with separate profile state.

Verification: 65 tests pass, including updated navigation assertions that the community preferences panel is absent from personal Settings and present under community Membership & Settings. Existing discovery persistence tests pass under the renamed file. Production build, lint and whitespace checks pass; existing bundle-size warning remains. Documentation/README reflect current ownership. No hosted deployment, database change or manual browser verification performed.

## Account Settings action spacing — 2026-10-21

Fixed Save discovery preferences sitting flush against the last settings divider. Both it and Explore Premium Features now use the same AccountPanel.module.css action row with 24px top separation and 12px action gap. Removed the premium list bottom margin within this panel so the action row owns the gap. Shared button dimensions, panel padding and functionality are unchanged. Source review also found differing settings/premium row padding (20px versus 16px) and metadata label spacing (no explicit gap versus 5px); the style guide records proposed rules for review rather than applying unapproved adjustments.

Verification: production build and lint pass; existing bundle-size warning remains. CSS/markup reviewed against the supplied screenshot; no live browser or authenticated write verification performed. No deployment/database changes.

## Consistent settings-row rhythm — 2026-10-21

Applied accepted shared spacing tokens: 20px vertical padding for personal discovery settings, community preferences and premium-feature rows; 5px between each label and block metadata. Existing standalone community-card padding and account action-footer separation remain unchanged. The style guide now records these as accepted rules rather than proposals, under Panel and Row Spacing.

Verification: production build and lint pass; existing bundle-size warning remains. Source inspection confirmed all current setting-row and premium-feature-list consumers use the shared tokens. No live browser verification, deployment or database changes performed.

## Account-tab styling consistency — 2026-10-21

Applied the four approved review recommendations: outline retry action; direct body/metadata tokens in My Home/My Communities with unused standalone-page styles removed; shared 24px stack gaps/18px multi-column grid gaps; and the shared action footer on My Home, with its preceding paragraph margin removed. Overview main-panel stacks, Settings panels, and fetched/sample community cards now let their parent own separation without trailing/sample-specific margins. My Home uses 24px when its grid collapses to one column. Heading sizes, decorative colors and specialized profile-summary composition are unchanged; heading-role standardization remains a discussion item.

Verification: production build and lint pass; whitespace checks pass. Source/CSS inspection only, no live browser visual verification. Existing bundle-size warning remains. No deployment or database changes.

## Account heading roles — 2026-10-21

Applied the accepted role scale with shared tokens and explicit heading-role attributes to Overview, My Home, My Communities (fetched and sample headings) and Settings panels. The shared account page title is 48px/1.1, 36px at widths up to 700px; hero stays responsive 36–54px/1.1. Card, subsection and item headings are 30px, 24px and 20px respectively, all at 1.2. Preserved semantic heading levels, heading color, layout margins and decorative text. Removed obsolete local size rules and replaced the legacy connection-heading !important with sufficient normal specificity so account roles can override it while community Profile keeps its prior styling.

Verification: production build and lint pass; whitespace and heading-role source checks pass. Actual-font multiline visual review, mobile rendering and zoom checks have not been performed; the guide now defines their acceptance criteria. Existing bundle-size warning remains. No deployment/database changes.

## Account responsive follow-up — 2026-10-21

The subsequent signed-in visual review found missing community-card horizontal padding, document overflow below the 360px minimum width, and a compressed mobile Edit Profile label. Applied the accepted fixes: removed both document minimum-width declarations, allowed mobile navigation items to shrink/wrap, allowed account tabs and comparable content rows to wrap, made favorite-game columns adapt to available space, and placed the mobile account header action below its copy. Heading sizes and line heights remain unchanged.

Removed the obsolete owned-communities rules from CreateCommunity.css and the account component's import of that stylesheet. OwnedCommunities is only used by My Communities; its useful text wrapping/margins now live in a colocated CSS Module. Both fetched and sample cards use the shared card padding (visually/computed verified at 22px mobile and 27px desktop).

Verification: build, lint and whitespace checks pass; the existing shared-bundle warning remains. Live signed-in checks covered all tabs at 240px, Overview/Settings at 320px, Overview at 390px and Communities at 1440px. Checked document width measurements showed no horizontal overflow in the measured layouts. Mobile Edit Profile remains on one line below the heading. Very narrow layouts necessarily wrap navigation and action labels; this is preferable to clipping. Actual 200% browser zoom, increased user text spacing, synthetic long-name cases and other community screens remain outside this verification. No deployment, database or account-data changes.

## Application-wide styling pass — 2026-10-21

Extended the established account roles through Community Home, Meet & Play, Championship, Discussion, community Profile, authentication, community creation, shared activity cards and dialogs/forms. Replaced legacy body/metadata/eyebrow declarations with shared tokens, standardized page/hero/card/subsection/item sizes and leading, and removed redundant responsive overrides. Shared defaults now cover body copy and headings, with explicit hero roles. Cards use the off-white surface, padding and radius tokens; comparable internal rows use 20px vertical padding and 5px metadata separation. Shared card footers own 24px separation; stacks/grids consume the existing spacing tokens. Mobile headers stack actions, tabs wrap, and form text stays 16px. Calendar content scrolls inside its panel instead of shrinking labels. Preserved decorative quotes, brand/artwork, selection/feedback colors, and mock behaviors; explicitly protected inline errors from ordinary panel paragraph colors.

Verification: 65 existing tests pass. Production build and lint pass; existing approximately 519 KB shared-JavaScript bundle warning remains. Live visual checks: desktop Home, Championship and Discussion; mobile Discussion, Meet & Play, community Profile, table-creation dialog, sign-in and community-creation forms; tablet Home/calendar. Measured mobile Meet & Play and tablet Home had no document-level horizontal overflow. Forms were inspected without submitting. Actual 200% zoom, every modal/state combination, and backend writes were not tested. No hosting deployment, migrations or account-data changes. Deferred business features and feedback infrastructure remain deferred.


## Shared Topbar extraction — 2026-10-21

Extracted the existing App header into app/layout/Topbar.tsx with Topbar.module.css. Moved the breadcrumb, action-group, preview control, notification badge, avatar-link and responsive styles out of App.css. Generic icon-button/dot styles remain for other consumers; Topbar owns its local equivalents. Preserved personal/community differences, AccountActions authentication behavior, preview callbacks, notification dialog ownership and profile navigation.

Verification: all 26 existing navigation tests, production build and lint pass. The existing shared-bundle size warning remains. CSS rules and breakpoints were compared against the extracted source; no new live visual or authentication-write verification was performed. No deployment or database changes.


## Sidebar CSS Module completion — 2026-10-21

Moved the remaining sidebar, brand, location, motto and responsive navigation rules from App.css to app/layout/Sidebar.module.css. Removed global sidebar hooks from Sidebar.tsx and scoped its Botanical override explicitly. Preserved values, selector specificity and the 1200/950/700px breakpoints. Removed unused legacy brand-the, brand-period and account-button rules after confirming they have no consumers. Shared primitive styling and shell content offsets remain shared.

Verification: all 26 existing navigation tests, production build and lint pass; the existing shared-bundle warning remains. Source/cascade comparison only; no new live visual verification. No route, authentication, data, deployment or database changes.

## Shared Footer extraction — 2026-10-21

Extracted the existing footer into app/layout/Footer.tsx with Footer.module.css. Preserved its position within App content, shared leaf icon, wording, decorative colors, spacing and mobile stacking. Removed the corresponding global footer rules from App.css; post-card footers are unaffected.

Verification: all 26 existing navigation tests, production build, lint and whitespace checks pass. The existing shared-bundle size warning remains. Source comparison only; no new live visual verification. No route, authentication, data, deployment or database changes.

## App layout and shared UI CSS Modules — 2026-10-21

App.module.css now owns shell sizing, content offsets/padding, skip-link presentation and their responsive rules. The existing components/ui.tsx presenters use colocated ui.module.css for Avatar, Tag, Heading, Tabs, Empty and Modal; GameArt owns GameArt.module.css. Account route navigation consumes the same tab-container styles. Base styles were removed from App.css; existing feature-specific descendant overrides retain temporary global class hooks until those features migrate. Avatar and Tag map their tones to module classes; generic tone utilities remain for other consumers. Icon and Botanical have no independent base rules to extract in this slice.

Tokens, text-role utilities, reduced-motion defaults and unmigrated feature/shared patterns remain global. Page-specific overrides, forms, panels, settings rows and icon-button styling remain follow-up work. This is style ownership cleanup, not a redesign or an extraction of every presenter from ui.tsx into a separate file.

Verification: production build and lint pass. The full suite passed 39 tests but initially failed 26 navigation tests because their shared helper queried the removed global content class. Updated that helper to the stable main-content landmark; all 26 navigation tests pass on rerun. Initial sandbox execution failed to read generated temporary files; tests were rerun outside that sandbox. The existing shared-bundle size warning remains. Source and responsive-rule comparison performed; no new live visual/zoom verification. No deployment, database, authentication or route behavior changes.

## Community Home CSS Module migration — 2026-10-22

Moved Home-only hero, weekly rhythm, filters, calendar and banner rules from App.css into Home.module.css. Split grouped responsive/footer rules without changing declarations or mock behavior. Shared primitives, ActivityCard and grid/typography utilities retain shared ownership. Home styles now ship with the lazy Home chunk (8.12 KB CSS; 1.94 KB gzip). Remaining pages and shared patterns still need migration.

Verification: 26 navigation tests, production build, lint and whitespace checks pass. Live browser review covered 390px mobile, 834px tablet and 1440px desktop. Compared pre/post DOM element dimensions and computed typography, colors, spacing and grid styles for member Upcoming, member Calendar and guest Calendar; comparisons matched apart from hundredth-pixel SVG geometry rounding. Screenshots inspected across the three widths. Calendar document widths stayed within the viewport; its existing internal horizontal scrolling remains. Verified category filtering (two Learn & Play cards), month navigation/empty state, preview switching, and opening/closing the hero event dialog. Restored member preview and default viewport. No 200% zoom or backend-write verification; no deployment/database changes. Existing shared-JavaScript bundle warning remains.

## Canonical filter chips — 2026-10-22

Implemented shared FilterChip/FilterChipGroup in Community Home: 12px/1.6 labels, weight 500, 36px minimum height, wrapping pill controls, 8px group gaps, 24px results separation, checkmark and aria-pressed selection, dedicated state tokens and explicit shared focus treatment. Reserved icon space prevents movement when selection changes. Callouts are unchanged and remain under review.

Verification: build, lint, whitespace checks and all 26 navigation tests pass. Live browser checks at 390/834/1440px confirmed 12px labels, 19.2px leading, 36px controls, no clipped labels or document overflow. Inspected mobile and desktop screenshots; verified category filtering, All evenings restoring five cards, Space preserving the active selection, and Enter selecting a different category with visible keyboard focus. Palette contrast calculations: normal 6.30:1, hover 5.46:1, selected 9.64:1, selected-hover 8.87:1; focus ring 3.77:1 on page and 4.00:1 on card backgrounds. This checks enabled-state palette readability, not all accessibility requirements. Actual 200% browser zoom, synthetic long labels, disabled-state visual QA and screen-reader announcements were not tested. Default viewport restored. Existing shared-bundle warning remains; no deployment or database changes.

Filter-chip centering correction (2026-10-22): split the icon/gap allowance equally into unselected horizontal padding rather than rendering an invisible leading checkmark. Unselected labels are centered; selected icon-and-label groups remain centered. Live desktop/mobile geometry checks confirmed centered unselected labels and zero width changes when toggling selection. Build and whitespace checks pass; existing bundle warning remains. No callout changes.

## Content-pattern design checkpoint — 2026-10-22

Recorded the user's accepted definitions for promotional banners, featured-activity cards, hero feature panels, insight cards and guidance notes in the style guide and decision register. Notice purpose is accepted; variants remain under discussion. No UI components or behaviors changed. Responsive treatment of line limits, featured-date treatment and notice presentation remain open before dependent implementation. No deployment changes. Documentation-only update.


Content-pattern confirmation (2026-10-22): recorded approved featured-date typography, separate special-callout metadata row, wrapping-friendly line-count targets, four semantic Notice variants, and guidance/placeholder reclassification. Reconciled the style guide open items. These are accepted requirements, not implemented or deployed components. Exact notice palette/icon details remain open. Documentation-only verification: whitespace check; no application tests needed.

## Shared Notice implementation — 2026-10-22

Implemented approved informational, positive, pending and caution palettes/icons across activity dialogs, Championship, Meet & Play, community Profile, sample venue dialogs and premium placeholders. Shared-table advice uses guidance-note presentation. Preserved the Championship feedback live region without making persistent state notices auto-announce. Required semantic icons cannot be omitted/substituted through the typed API. Informational supports contextual icons or no icon. Existing 14px padding, 6px radius and 17px block margins are retained for this migration; approved additions are the subtle line border and first-line icon alignment. Global notice rules/account overrides were removed. No other content-pattern components were implemented.

Verification: all 65 tests, build, lint and whitespace checks pass. Live rendered inspection at 390/834/1440px covered positive hosting state, pending waitlist, caution sample-venue explanation and iconless informational premium placeholder. Each used body #53644f at 13px/23.4px; required icons stayed 20px and all measured notices had no horizontal content overflow. Palette contrast: body 5.34–5.54:1, icons 4.96–8.16:1. Inspected screenshots of activity dialogs and page content; exercised the mock waitlist transition and canceled it afterward. Default viewport restored. No backend writes or deployment; actual 200% zoom, every notice instance and screen-reader announcement behavior were not verified. Existing shared-bundle warning remains.

## Shared PromotionalBanner implementation — 2026-10-22

Implemented the compact shared PromotionalBanner and replaced Community Home's membership strip. Required heading/action, optional decorative icon/description, no eyebrow, shared card/text tokens and natural wrapping follow the accepted definition. Removed obsolete membership-strip rules from Home.module.css; the parent retains external spacing. Guest-only visibility and the existing mock membership dialog remain unchanged. Additional variants and real product/payment integration remain planned.

Verification: production build, lint, all 26 navigation tests and whitespace checks pass. Live browser inspection at 390px, 834px and 1440px confirmed no banner overflow or clipped heading, readable wrapping, and the action within the card (below the copy on mobile). Verified the banner is absent in member preview and that Become a Member opens the existing preview dialog. Default viewport restored. Actual 200% zoom, optional-prop combinations and screen-reader behavior were not tested. No backend writes or deployment. Existing shared-bundle size warning remains.

## Shared FeaturedActivityCard implementation — 2026-10-22

Replaced Community Home's seasonal card with the shared FeaturedActivityCard. Required category tag, heading, date and details action; optional description, special-callout metadata and artwork follow the accepted definition. Date now uses 13px/1.8, weight 600 and heading green; ticket information has a separate 11px/1.8 metadata row. The card uses shared tokens, a 24px action gap, natural wrapping and parent-owned 24px stack spacing. The existing Halloween mock activity dialog is unchanged. No new payment or reservation behavior.

Verification: build, lint, all 26 navigation tests and whitespace checks pass. Browser screenshots inspected at 390px mobile, 834px tablet and 1440px desktop: text/action stayed inside the card without clipping, artwork moved below content on mobile and remained at the right on larger screens. Verified the action opens the correct Halloween details dialog and closed it without reserving. Restored default viewport. Actual 200% zoom, optional-content combinations and screen-reader behavior were not verified. No deployment or backend writes; existing shared-bundle warning remains.

## Shared HeroFeaturePanel implementation — 2026-10-22

Replaced Meet & Play's matchmaking callout with shared HeroFeaturePanel: optional decorative icon, required heading/action and optional multiline description. Shared typography and 24px action spacing apply; the caller supplies the action and retains matching state, conditional action label and existing modal. Removed fixed minimum widths and forced description line breaks. Hero placement/divider live in MeetPlay.module.css; panel presentation lives in its own module. No new matchmaking service or authorization behavior.

Verification: build, lint, all 26 navigation tests and whitespace checks pass. Inspected live screenshots at 390px, 834px and 1440px: panel text/action fit without clipping, the panel stacks beneath the introduction on smaller screens and sits beside it on desktop. Find my people opened the existing matching-preferences dialog, closed without submitting. Default viewport restored; preview left in member mode to view Meet & Play. Actual 200% zoom, optional-prop combinations, the alternate saved-preferences label and screen-reader behavior were not tested. No deployment/backend writes. Existing shared-bundle warning remains.

## Shared InsightCard implementation — 2026-10-22

Extracted the informational insight into a shared component with required category icon, mood eyebrow, heading and description, without an action API. Replaced the ProfileOverview example used by account Overview and community Profile; existing sample metric and visibility rules remain unchanged. Uses shared card and typography tokens, natural text wrapping and content-driven icon stacking. Removed connection-panel CSS and added a local 24px profile-section stack. No new data retrieval or visibility behavior.

Verification: build, lint, all 26 navigation tests and whitespace checks pass. Inspected both account and community examples at 390px, 834px and 1440px: text remains readable without clipping, and the icon stacks above copy at mobile width. Default viewport restored. Actual 200% zoom, synthetic grid/long-content cases and screen-reader behavior were not tested. No deployment/backend writes. Existing shared-bundle warning remains.

## Shared GuidanceNote implementation — 2026-10-22

Replaced Meet & Play etiquette and Discussion member-dialog shared-table advice with GuidanceNote. Required plain-text body and optional decorative icon; no heading, eyebrow, action or live announcements. Preserved note copy and dashed-border presentation, aligned icons with the first text line, and applied parent-owned 24px stack spacing. No policy, permission or interaction changes. The separate titled community-guidelines entry and full rules dialog retain their existing structure.

Verification: build, lint, all 26 navigation tests and whitespace checks pass. Inspected both page and member-dialog examples at 390px, 834px and 1440px: text wraps readably without clipping and icons retain their size. Opened/closed the member dialog; no forms submitted. Default viewport restored. Actual 200% zoom, iconless rendering, synthetic long content and screen-reader behavior were not tested. No backend writes or deployment. Existing shared-bundle warning remains.

## CSS-native token infrastructure and InsightCard batch — 2026-10-23

Implemented the D-123 first batch only: primitives.css, semantic.css and the token import index under src/styles/tokens/, imported by the existing global entry. Added the approved 4/8/12/16/24/32px spacing foundation, preserved role-specific values and default light appearance, and retained deprecated aliases for existing consumers. Removed the unused legacy --rust definition. Migrated only InsightCard.module.css to purpose-based semantic names, with private coordinated 63px icon dimensions and the approved 12px heading margin primitive; its 21px gap, decorative paint, wrapping and component API are unchanged. No other component family was migrated.

The new [token guide](14-design-tokens.md) records the catalog/mappings, typography matrix, admission/deprecation rules, complete theme-scope/overlay contract requirements, discrepancy register and separate accessibility backlog. Reconciled the style/frontend/file-structure guides and decision register. AGENTS.md now requires purpose-based semantic selection, local-value rationale, shared-token consumer-impact analysis and batch verification. Alternate-theme implementation, themes.css and its browser fixture remain deferred; no palette or theme toggle was added.

Verification:

- Production build and lint passed; all 26 navigation tests passed. Existing shared JavaScript chunk warning remains (521.31 kB minified); no warning thresholds or dependencies changed.
- Captured before/after computed typography, paint, spacing, borders, flex/grid/layout styles and element rectangles for the InsightCard subtree and the surrounding account Overview/community Profile pages (109/120 HTML elements respectively), after fonts loaded. Compared at measured CSS viewport widths 390, 700, 834, 1200, 1201 and 1440px. The browser's existing 110% zoom was preserved; viewport overrides were adjusted to achieve those actual CSS widths. Styles and geometry matched after excluding transient pointer-hover state. Legacy custom-property values also matched except semantically irrelevant whitespace in the serif font-family list and the deliberately removed unused --rust.
- Card padding remains 22px at <=1200px and 27px above it. Screenshots inspected for both examples at mobile/tablet/desktop; icon stacks above text on mobile and remains beside it where space permits. No document horizontal overflow at measured widths. Default viewport restored; community Profile remains available for review.
- Read-only PostCSS/source scan covered all 86 CSS/TS/TSX source files: no undefined var() references, dependency cycles or unused aliases. The only unused definitions are approved foundation steps --ct-ref-space-4/8/16/32, intentionally available for future composition. No persistent scanner, test fixture or dependency was introduced. Whitespace checks passed.

Limits: this is default-light extraction verification, not complete theme or accessibility certification. No 200% zoom/text-spacing, synthetic long-content/optional-heading-level, screen-reader or remaining-family interaction-state sweep was performed. Those review items remain separately recorded. No deployment, schema changes or backend writes. **Stopped for review: remaining component-family migrations require further authorization.**

## Shared controls and filter-chip token migration — 2026-10-23

The user accepted the first batch and authorized this second batch only. Migrated Controls.module.css (Button, ActionLink, Link and NavItem) and FilterChip.module.css to --ct- semantic roles. Added purpose-specific secondary/outline/ghost/destructive action paints, primary/destructive borders, link/navigation colors, shared focus geometry and direct semantic hover/pressed action shadows. Private --_ct-action-variant-* aliases resolve on each control. Existing approved paints, metrics, selectors, specificity, transitions, disabled opacity (.5 actions / .55 filters), responsive composition and reduced-motion rule remain unchanged. No TSX/component API or event-handling changes. Removed 20 zero-consumer compatibility aliases; --nav-item-active-bg stays for Sidebar.

Verification:

- Compared baseline/post-migration computed styles and element rectangles for 27 representative controls and 26 live Community Home links/buttons at measured CSS widths 390, 700, 701, 834, 950, 951, 1200, 1201 and 1440px. All comparisons matched, with no document horizontal overflow. Covered small/full/unstyled actions, disabled/loading buttons, current/inactive menu/tab navigation, selected/unselected and disabled filters. A temporary local page rendered the actual components with no backend side effects; removed both temporary files before build/lint.
- Matched 15 hover/selection cases, 10 actual held-pointer pressed cases (all five Button and ActionLink appearances), and 23 keyboard-focus cases. Pressed shadows were captured while :active was true after transitions settled. Filter selection preserved width. Disabled/loading controls and disabled filters did not increment action/submission counters or change selection and were skipped by keyboard focus. Ordinary actions did not submit; explicit submit did. Keyboard navigation changed the local route correctly; inactive navigation hover retained its expected color. Native link destinations/target semantics are also covered by the existing control tests.
- On live Community Home, Enter selected Learn & Play and rendered its two activity cards; Space preserved the current selection, and All evenings restored all five. Inspected desktop/mobile/tablet screenshots with focus rings and wrapping. Restored the viewport, closed the temporary test tab and retained the original application tab. No account/domain actions were submitted.
- Build and lint passed. The initial test invocation passed the 26 navigation tests but Controls failed to load a generated file in the sandbox temporary directory (ENOENT). Retried the same two suites outside the sandbox: all 30 tests passed. The existing 521.31 kB shared JavaScript chunk warning remains; no dependency or build-setting changes.
- PostCSS/source scan of all 86 CSS/TS/TSX files found no undefined var() references, cycles or unused aliases. Only approved spacing primitives 16px and 32px currently lack consumers. Whitespace checks passed. Source review confirms Controls/FilterChip contain no legacy-token references and the temporary verification page is absent.

Limits: default-light browser coverage only; reduced-motion handling was preserved and inspected in source, not emulated. No 200% zoom, user text-spacing override, screen-reader review or exhaustive screen-by-screen interaction audit. Existing accessibility/design-discrepancy backlog remains open. No deployment, schema changes, backend writes or additional component migrations. **Stopped for review before the next family.**

## Notice token migration — 2026-10-23

The user accepted shared controls/filter chips and authorized Notice only as batch three. Migrated Notice.module.css to nine public --ct-cmp-notice-* paint contracts in semantic.css and the existing body typography/color roles. The four background/icon pairs and common border retain their exact values. Private --_ct-notice-variant-* aliases resolve on each variant element; removed the two old private names after confirming no external consumers. Existing shared token values and compatibility aliases for other consumers are unchanged. The 14px padding, 17px block margin, 6px corners, 10px gap and 20px first-line-aligned icon remain local. No TSX, API, icon paths, content, variant selection or announcement rules changed.

Verification:

- Compared baseline/post-migration computed styles and element rectangles at measured CSS viewport widths 390, 700, 701, 834, 1200, 1201 and 1440px. All comparisons matched for eight page cases and all four variants inside the existing Modal. Cases included contextual lock, iconless informational, long/unbroken content, nested emphasis and caller-provided feedback attributes. No document horizontal overflow at these widths. A temporary local default-light page used the actual components and was removed before build/lint; no alternate-theme fixture was introduced.
- Compared the live Championship Notice at the same seven widths, including its inherited body metrics and parent-owned 70px top margin. Its existing narrow-layout hidden parent stayed hidden; visible desktop styling and geometry matched. Inspected mobile/tablet/desktop screenshots of the representative Notice cases: variant colors, required icons, text wrapping and first-line alignment were preserved.
- SVG markup matched the baseline, including 20px dimensions and aria-hidden=true. Iconless informational retained no icon slot; contextual title/HTML attributes survived. Updating local feedback preserved role=status, aria-live=polite and aria-atomic=true, while ordinary variants retained no implicit live-region attributes. Both Escape and the close button dismissed the native dialog and restored focus to its trigger. These checks verify DOM behavior, not audible screen-reader announcements.
- Production build, lint and all 65 tests across eight files passed, including control and navigation coverage. Existing shared JavaScript chunk warning remains (521.31 kB minified); no dependency/build-setting changes.
- PostCSS/source scan of all 86 CSS/TS/TSX files found 133 custom-property definitions, no undefined var() references, cycles or unused aliases. Only the approved 16px/32px spacing primitives lack current consumers. Whitespace checks passed. Source review confirms Notice has no legacy-token references and its React implementation is unchanged.

Default viewport restored and temporary verification tab closed; the original application tab was retained. No deployment, schema changes, backend writes, alternate theme or further family migration. Actual 200% zoom, user text-spacing overrides, screen-reader review and exhaustive route/state testing remain outside this batch; the separate accessibility backlog stays open. **Stopped for review before any further component migration.**

## GuidanceNote token migration — 2026-10-23

The user accepted Notice and authorized GuidanceNote only as batch four. Replaced its three legacy body references with --ct-body-color, --ct-body-font-size and --ct-body-line-height. The approved local dashed #cdd6bf border, 8px corners, 25px/35px padding (20px at <=700px), 18px icon gap and 2px alignment padding are unchanged and documented in the module. No public/private token additions or shared definition changes; other consumers still need the legacy aliases. React markup/API, copy, optional decorative icon, parent-owned 24px spacing and absence of actions/live regions are unchanged.

Verification:

- Baseline/post-migration computed styles and element rectangles matched at measured CSS widths 390, 700, 701, 834, 1200, 1201 and 1440px for the live Meet & Play etiquette note and Discussion member-dialog advice. Captured the note subtree and parent wrapper, including typography, paint, borders, spacing, layout, wrapping and SVG markup. Padding remained 20px at 700px and below, and 25px/35px above. No document or note-container horizontal overflow.
- Three temporary default-light samples covered short iconless copy, long/unbroken text with an icon, and long/unbroken iconless text. All styles/geometry matched at the same widths. Iconless notes retained no icon slot; the icon wrapper remained aria-hidden=true and no note acquired a role/live-region attribute. Inspected desktop dialog, tablet live-page and mobile long-text screenshots. Escape dismissed the live member dialog and returned focus to its member-card trigger. No domain actions were submitted.
- Build, lint and all 65 tests across eight files passed, including navigation coverage. Existing 521.31 kB shared JavaScript chunk warning remains. No dependencies, build settings or unrelated component changes.
- PostCSS/source scan covered all 86 CSS/TS/TSX files and 133 definitions: no undefined var() references, cycles or unused aliases. Only approved spacing primitives 16px/32px remain unused. Whitespace checks passed. Both temporary verification files were removed before build/lint; default viewport restored, verification tab closed and original application tab retained.

Limits: default-light extraction only. The local border's future theme treatment, actual 200% zoom/user text spacing and screen-reader review remain deferred in the token/accessibility backlog. No deployment, backend writes, alternate theme or remaining-family migration. **Stopped for review.**
