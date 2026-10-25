# Incremental page presentation refactor

Recorded 2026-10-25. Workflow and all four account-tab slices are approved and completed: Settings 5b3f5a4, AccountHomeTab 31dea35, independent InsightsCarousel f4e86ab, Profile b918fea, and Communities/account-auth simplification 3a68cb9. Community Home was accepted and committed as 6defc2b; Meet & Play was accepted and committed as 5e2fee8; Championship is implemented, verified and accepted by the user for commit; Discussion is the next planning target. No deployment occurred. See docs/12 for evidence and verification limits.

## Accepted working agreement

- Begin with Settings, then review Home, Profile and Communities individually before moving to other pages. Each tab/page has a concise plan reviewed by the user before implementation; completion of one slice does not authorize the next plan's implementation.
- Page/tab parents may consume feature hooks and coordinate UI state. Presentation children receive narrow props/callbacks rather than reading account context, API functions or mock stores. Lift state to the nearest useful parent; avoid collecting unrelated tab state in UserAccountPage.
- Feature hooks own request lifecycle/action coordination. Feature API files own real data access and mock reads/mutations. Preserve existing real persistence; real failures must not fall back to simulated success. Keep static interface copy in presenters where appropriate.
- Replace fixture-defined UI contracts with feature-owned types as each slice needs them. Preserve mock relationships and navigation lifetime; document any changed reset/identity/community boundary before implementation.
- Preserve appearance by default. List visible refinements separately for review. Identify conflicts between legacy mocks and accepted product rules and propose each correction without introducing persistence.
- Reuse existing React primitives, shared visuals and purpose-based tokens first. Keep CSS Modules and the approved token admission/consumer-impact rules. Component extraction and token substitution remain separate from visual refinement.
- Introduce abstractions, public tokens, dependencies and shared components only for concrete needs, with names and ownership included in the plan.

## Iteration checklist

1. Read relevant decisions, feature requirements, architecture, authorization and operational evidence. Inventory behavior, real/mock boundaries, styles and shared consumers.
2. Submit scope, proposed names/files, responsibilities/props, state/API ownership, mock lifetime, primitive/token reuse, discrepancies and verification criteria. Pause for review before implementation.
3. Record approval and adjustments in the relevant documents before executing the slice.
4. Implement the approved slice. Check consumers before removing or moving shared code/styles.
5. Verify applicable loading/empty/error/retry/saving/success states, retained drafts, stale responses, identity changes and navigation. Run build/lint/relevant tests and token-reference/cycle/unused-alias checks; inspect responsive and keyboard states and affected shared consumers.
6. Update implementation status and affected architecture/style documents with evidence, limitations, remaining work and deployment status.
7. Present the result for review, then prepare the next tab/page's plan.

## Settings plan — approved

### Components and names

| File/name | Intended responsibility |
| --- | --- |
| `components/AccountSettingsTab.tsx` (keep) | Parent coordinator: obtain account identity, consume the preferences hook and premium-placeholder API, and supply panel props. Preserve the existing outer account auth gate. |
| `hooks/useAccountPreferences.ts` (new) | Own preference loading, editable draft, saving and feedback lifecycle. Use existing `readAccountPreferences` / `saveAccountPreferences`. |
| `components/AccountPreferencesPanel.tsx` (keep) | Controlled presenter for both preference sections and exactly one Save button; no API calls or internal preference state. |
| `components/AccountPreferenceSwitch.tsx` (new) | Feature-local controlled label/description/switch presenter reused for the three boolean fields. Preserve native checkbox semantics with `role="switch"`. |
| `components/PremiumFeaturesPanel.tsx` (keep) | Render supplied placeholder rows and action destinations; remove account-context/data ownership. No billing behavior. |
| `types.ts` (new) | Feature-owned preference types and `PremiumFeaturePlaceholder`; retain existing API type exports where needed for compatibility with current consumers. |
| `api.ts` (extend) | Keep existing real read/save contracts; add `readPremiumFeaturePlaceholders()` returning the existing explicitly fictional ownership row. This is a synchronous fixture read, with no simulated network delay or new remote subscription contract. |

Approved hook vocabulary: `preferences`, `isLoading`, `isSaving`, `loadError`, `saveError`, `isSaved`, `changePreference`, `savePreferences`. Approved panel callbacks: `onPreferenceChange`, `onSave`; approved switch props: `label`, `description`, `checked`, `disabled`, `onChange`. Premium props: `features`, `canManage`, `manageTo`, `exploreTo`. These names are implemented as approved.

The parent keeps premium placeholders available independently of preference-load failures. The optional user ID must not trigger requests when absent. Scope draft/read/save results to the initiating user and ignore obsolete completions after account changes/unmount. Prevent duplicate saves and retain edited values on failure. Preserve loading/auth behavior, all three independent boolean values, current defaults supplied by persistence, disabled switches while saving, and success clearing after edits. No mock defaults on failed reads.

### CSS and tokens

- Add colocated `AccountSettingsTab.module.css`, `AccountPreferencesPanel.module.css`, `AccountPreferenceSwitch.module.css` and `PremiumFeaturesPanel.module.css` for their actual responsibilities. Keep the existing shared `AccountPanel.module.css` action-footer styles; move its preferences-only communication-heading rule to the preferences panel module.
- Move Settings-only stack/list ownership out of global/page selectors after a consumer and specificity check. Preserve parent-owned section spacing, panel padding, row padding, label/metadata separation, wrapping and action-footer spacing.
- Reuse Button, ActionLink, Icon and existing heading roles. There is no existing shared React switch or universal Card primitive; do not introduce either as an incidental global redesign.
- Audit global `.setting-row` rules and account overrides before scoping switch styles. Community preferences and premium list rows remain consumers. Preserve their rendering and retain rules they still require; do not migrate the community tab in this slice.
- Select existing semantic roles by purpose and use the approved primitive spacing scale for general composition. Preserve legacy switch geometry/paint as documented local exceptions where no approved role fits. Any new public token or visible correction returns for review with consumer impact; no new shared token is presumed necessary.

### Behavior and requirements boundaries

Keep the current copy, three switches, combined save payload, Manage/Explore destinations and sample disclosure. D-120 explicitly retains the premium placeholder; it is not a commercial-rule conflict requiring removal. No API/table/schema expansion, new backend calls, query-library adoption, alternate themes or deployment are proposed.

Accepted toast behavior in docs/13 remains unimplemented, with placement/style/eviction details still open. Preserve existing inline feedback for this structural slice and report that outstanding requirement. The future typed API error/inline-recovery contract also remains deferred; do not silently invent it here. No proposed visual refinement is bundled with this plan.

### Verification and completion

- Adapt current preference integration tests to the parent/hook boundary and preserve real API payload/filter assertions. Add meaningful cases for late loads/saves across identity changes, draft retention and duplicate-save prevention; test controlled switch interaction and premium destinations/data separation.
- Check signed-out/loading/no-ID behavior and absence of preference calls without identity. Exercise load/save failure, saving/disabled state and recovery using controlled responses rather than changing real user preferences.
- Capture before/after computed styles and screenshots for relevant states at mobile/tablet/desktop widths and affected breakpoint boundaries. Check narrow wrapping, no horizontal overflow, 200% zoom, text spacing, keyboard focus/Space/Tab and announcements. Recheck community switch presentation because source rules are shared.
- Run build, lint, relevant tests and token checks. Update docs/05, docs/07, docs/12, docs/13 and docs/14 as their ownership/status changes warrant. Report unverified behavior explicitly.
- Stop after Settings verification for review. Home is the next proposed tab; its implementation requires its own reviewed plan.

## Home plan — approved, implemented locally

Settings was committed as 5b3f5a4 on 2026-10-25. The user authorized moving to the next target, selected AccountHomeTab, and explicitly approved implementation. The following Home plan is approved and implemented/verified locally; the user accepted completion for commit and authorized Profile planning. See docs/12 for evidence and limitations.

### Scope and names

| File/name | Intended responsibility |
| --- | --- |
| `components/AccountHomeTab.tsx` (rename from MyHomeTab.tsx) | Parent composition, Communities destination, static `feedPlaceholders` definitions and the responsive card grid. No request lifecycle or local state is needed. |
| `components/HomeWelcomePanel.tsx` (new) | Personal welcome copy, hero heading, Communities action and decorative illustration. Receive `communitiesTo`; keep fixed interface copy inside this presenter. |
| `components/HomeFeedPlaceholderCard.tsx` (new) | Repeated coming-soon card, receiving `iconName`, `title`, `description`, `placeholderHeading` and `placeholderDescription`. Own its decorative icon and static Coming soon label. |
| `components/HomeWelcomePanel.module.css` (new) | Welcome layout/type/illustration styles and existing 700px responsive behavior. Reuse AccountPanel.module.css for the action footer. |
| `components/HomeFeedPlaceholderCard.module.css` (new) | Card structure, internal title/icon/placeholder spacing and existing 1100px internal-spacing behavior. |
| `components/AccountHomeTab.module.css` (rename and narrow) | Parent inherited decorative color, grid columns/gaps, external card-group separation and 1100px grid-to-stack behavior. |

Rename the static `sections` constant to `feedPlaceholders`, `empty` to `placeholderHeading`, and `detail` to `placeholderDescription`. Use stable IDs `community-updates`, `upcoming-games` and `suggested-games` instead of titles as keys. The user explicitly selected AccountHomeTab on 2026-10-25. Rename MyHomeTab.tsx, its exported component and its CSS Module to AccountHomeTab, and update UserAccountPage imports/rendering and affected current documentation. The other component/prop names are now approved for this slice. Keep the existing my-home route ID, Home label and /account/home URL; this naming correction does not expand into account-wide naming changes.

### Data/state boundary and reuse

Home currently has no mutable feature state, fixture records, domain operations or API calls. Its three cards are static interface copy, not a simulated feed. Keep that copy in presentation code; add no artificial loading/error state, hook or API wrapper. Existing UserAccountPage auth/loading gates and routes remain authoritative. Future feed reads/mutations must use feature APIs and hooks when their approved scope is implemented; no schema or aggregate feed contract is designed in this slice.

Reuse ActionLink, Icon, existing heading roles and shared account action-footer styling. Reviewed InsightCard, HeroFeaturePanel and Notice: their accepted structures/roles differ from the welcome panel and current composite placeholder cards. Preserve these feature-local structures rather than changing shared components or forcing a visual redesign. No new generic Card primitive, shared component, dependency or public token is proposed.

### Presentation and styling

Preserve all wording (including the My Communities action), icon choices, forced hero line break, decorative accessibility treatment, section/heading hierarchy and navigation. Preserve the three-column layout switching to a 24px-gap stack at 1100px, the hidden illustration at 700px, card padding at 1200px and current internal spacing. Keep the same structural DOM so extracting component boundaries does not change the cascade.

Select existing heading/eyebrow/body/metadata/card/section/action-footer tokens by purpose, and existing spacing/palette primitives for their approved roles. Moving rules is an appearance-preserving extraction. Retain and document existing specialized hero/illustration/placeholder geometry, paints and irregular spacing as local exceptions when no approved role/scale represents that composition; do not standardize by numerical coincidence or add permanent tokens for those values. Any visible refinement is a separate proposal. Other pages and shared token definitions remain outside this slice.

### Verification and completion

Capture before/after computed styles and screenshots of Home at mobile/tablet/desktop and both sides of the relevant 700/950/1100/1200px boundaries. Check actual-font wrapping, no horizontal overflow, hidden illustration, grid/stack gaps, keyboard focus and Communities action/Back navigation. Exercise increased text spacing; report actual zoom verification separately if the browser still does not support it. Recheck shared footer consumers if that shared module changes (none is planned).

Run build, lint, token-reference/cycle/unused-alias checks and applicable existing navigation tests, including Home placeholder/auth behavior and Settings regressions. Add a new automated test only for a meaningful uncovered behavior, not to duplicate static markup. Update affected architecture/file/style/status documentation with actual results and limitations. No backend writes or deployment. Stop after Home verification for result review; Profile is the following target and needs its own plan.

## Profile plan — approved and implemented locally

Home was committed as 31dea35 on 2026-10-25. The separately authorized InsightsCarousel addition is committed as f4e86ab; the remaining Profile application refactor was subsequently explicitly approved and is now implemented locally. The user selected the five account component names below and requested independent account/community compositions until community requirements establish whether sharing is appropriate. The earlier shared ProfileOverview proposal is superseded. The custom editor hook is also withdrawn from this proposal in favor of parent-owned state; the user asked for its justification, and this simpler arrangement was approved and is implemented.

### Selected components and approved ownership

| File/name | Intended responsibility |
| --- | --- |
| `user-accounts/components/AccountProfileTab.tsx` (keep) | Controlled account composition: ProfileSidebar plus a main column containing ProfileAboutPanel, the shared InsightsCarousel and FavoriteGamesPanel directly. No extra account ProfileOverview wrapper. |
| `user-accounts/components/ProfileSidebar.tsx` (new) | Summary card, interests, supplied counts and decorative side note. Keep these related elements together. |
| `user-accounts/components/ProfileEditModal.tsx` (new) | Controlled Modal/form presenter for display name and bio, with supplied draft, validation, availability and save state/callbacks. Reuse Modal, Button and native fields. |
| `user-accounts/components/ProfileAboutPanel.tsx` (new) | Account bio, play-style/teaching tags and optional supplied edit callback. |
| `user-accounts/components/FavoriteGamesPanel.tsx` (new) | Supplied account favorite-game cards using existing GameArt, heading roles and decorative Icon. |

Each account component owns colocated CSS Modules. Keep the existing generic/branded primitives shared; do not share the account profile panels or impose a common account/community profile data contract in this slice.

The current ProfileOverview is only the main-column group of About/play-style content, an InsightCard and favorite games. For the community consumer, retain that existing composition independently, with only an ownership/import adjustment: approved name `communities/components/CommunityProfileOverview.tsx` and matching CSS Module. This additional name was approved with the remaining plan. Preserve its current mock values, edits, callbacks and styles; no community panel/API redesign. The account-specific refactor no longer needs readCommunityProfilePlaceholders or a cross-feature mock/profile fixture.

### Parent state instead of a new hook

Keep editor draft, open/close, validation, submitting and feedback coordination directly in UserAccountPage, the existing common parent of the header Edit Profile action and the tab's inline edit action. Extracting the modal markup already removes the largest presentation block. A custom hook would only package this single consumer's state/actions; it would not add persistence, synchronization or authorization capabilities. It is not required for lifting state or presentation-only children.

Approved parent vocabulary: `isEditing`, `isSaving`, `displayNameDraft`, `bioDraft`, `fieldErrors`, `saveError`, `isSaved`, `openEditor`, `closeEditor`, `changeDisplayName`, `changeBio`, `submitProfile`. Modal callbacks: `onDisplayNameChange`, `onBioChange`, `onSubmit`, `onClose`. Parent handler names remain reviewable. Consider a hook later only if reuse or lifecycle complexity makes a concrete boundary useful, not as a mandatory layer.

Preserve the existing AccountProfileProvider/readOwnProfile/saveOwnProfile persistence path. UserAccountPage delegates saves to account.saveProfile, which already reaches the feature API. No second provider, query, cache or direct Supabase call. Parent UI coordination is distinct from API access and business-data implementation.

### Real/mock boundary and lifecycle

Add synchronous `readAccountProfilePlaceholders()` to user-accounts/api.ts and feature-owned `AccountProfilePlaceholders` types. Supply sample interests, play style, teaching preference, counts and favorite games. Proposed fields: `playStyle`, `isHappyToTeach`, `eventCount`, `hostedTableCount`, `coPlayerCount`, `favoriteGames`; retain `name`, `bio`, `location` and `interests` where clear. UserAccountPage composes real name/bio with these explicit placeholders and removes its broad useMockState dependency. Its Communities-only previewCommunity import remains for that later slice. Add no editing/persistence for sample fields, and preserve fallback copy without deriving account identity from email or community identity.

Keep the 80-character display-name and 2,000-character bio limits and current normalization. Initialize drafts from persisted fields on opening; preserve edits across unrelated provider refreshes and newly unavailable profile states. Retain the current editor/tab-navigation lifetime. Clear drafts/feedback on actual identity changes, sign-out or unmount; ignore obsolete submission completions and guard duplicate submissions. Backend/provider authorization remains authoritative, including already in-flight writes.

Failed saves retain the open modal/draft and existing inline recovery. Success updates provider/shell identity, closes the modal and preserves success copy. Saving disables fields/submission and prevents dismissal as currently implemented. Preserve session/profile loading/error guards at both entry points. Toast infrastructure and typed API error taxonomy remain deferred.

Keep the previously proposed type-only cleanup of GameArt's fixture dependency: define/export `GameArtVariant` with existing variants from GameArt.tsx and retain mock/data.ts's `Art` as a compatibility alias. No artwork/CSS/runtime changes. New account presentation contracts must not reference MockModel or fixture Profile types.

### Visible corrections approved and implemented

1. Move the inline Edit action from beside play-style tags to the About me heading, because the global modal edits name/bio only. Preserve label/callback/appearance and the header Edit Profile action.
2. Apply documented field-validation behavior: put display-name feedback beside the field, associate it accessibly, validate on blur/submit, revalidate during correction after an error, and focus the first invalid field on submission. Preserve existing limits and API-failure recovery.

The user explicitly approved both refinements and the remaining Profile implementation plan on 2026-10-25. Preserve all other appearance/content, sample values and decorative treatments. Document any agreed variance if a correction is declined.

### Styling, verification and completion

Audit effective profile layout/summary/stats/note/favorites/form rules, account overrides, GameArt classes and responsive cascade before moving styles. Move account rules to their owners while retaining global rules/hooks required by the independent community composition. Do not unify profile styles merely because the prototype currently shares them. Use existing role tokens and actual-purpose primitive spacing; preserve/document local geometry/quote/artwork/form exceptions. No new shared tokens, themes, dependencies, card/form framework or further visual changes are presumed necessary.

Verify account Profile and the independent community overview at relevant widths and 700/950/1200px boundaries, including modal states, long values, optional Edit absence, wrapping, focus/keyboard/dismissal behavior and no overflow. Compare preserved rendering; verify any separately approved corrections against their intended behavior. Exercise increased text spacing and report actual zoom support accurately.

Run build/lint, token checks, existing navigation/provider/API tests and relevant Settings/Home regressions. Add meaningful coverage for draft retention, duplicate saves, identity/sign-out changes, stale completions, failure/retry, updated shell identity, validation and preserved community edits. Use mocks/fixtures for mutations rather than real hosted profile writes.

Update affected architecture/file/style/status documents with evidence, limitations and deployment status. No schema/new real API/deployment. Stop after Profile verification for result review; Communities is the next separately planned target.

## InsightsCarousel addition — authorized and implemented locally 2026-10-25

The user explicitly requested implementing InsightsCarousel in place of the account Profile's existing InsightCard, starting with its single mock insight. A disabled See all insights button appears to its right when the component has enough available width, or on the next row underneath at narrower widths, as explicitly clarified by the user. This scoped addition is authorized independently of the still-proposed full Profile refactor, editor hook/state discussion and Edit/validation corrections.

Use a shared controlled presentation component under components/shared with an insights collection, activeIndex and onActiveIndexChange. Render one InsightCard at a time; expose manual Previous/Next controls only for multiple insights, disabling them at the collection ends. Do not auto-rotate. Return no carousel for an empty collection. Keep selection state in UserAccountPage, with no custom hook. A synchronous readAccountProfileInsights fixture API supplies the existing exact mock insight; API models contain text/icon names rather than React elements.

Keep account and community compositions independent: insert the account carousel through a temporary optional insights slot in the current ProfileOverview presenter. Its community consumer retains the existing single InsightCard. This small integration seam is replaced by direct AccountProfileTab composition when the larger reviewed refactor is implemented; no shared profile model or community carousel is introduced.

Reuse InsightCard, Button and existing token roles without modifying their shared styling. Use a component container query: at 720px of available carousel width, allow the disabled outline action alongside the card with a 24px primitive gap; below that width, place that action on the next row underneath and let the card fill the row. The local 720px composition threshold leaves approximately 520px for readable card content after action/gap allocation and is not a new global breakpoint/token. Verify actual container widths and narrow text reflow. No new backend calls, schema, dependencies, public tokens, all-insights navigation or deployment.

Verify controlled selection/one-visible-card behavior, empty/single/multiple collections, bounded buttons, keyboard operation and announcement, disabled all-insights action, API fixture copy/data isolation, parent wiring and unchanged community insight. Inspect account/community Profile plus container threshold boundaries, run build/lint/relevant tests and token checks, and record evidence/limits. Full Profile implementation remains at its plan-review gate.


## Next target review checkpoint — remaining account Profile, 2026-10-25

The user accepted the completed carousel and requested committing it, then moving to the next target. Commit f4e86ab includes the narrow-width placement clarification and its verification. This advances to the remaining Profile plan above; it does not skip to Communities or authorize the still-proposed implementation.

Concise proposed execution scope:

1. Use the selected AccountProfileTab, ProfileSidebar, ProfileEditModal, ProfileAboutPanel and FavoriteGamesPanel. Compose the main panels and existing InsightsCarousel directly in AccountProfileTab. Remove the temporary account insights slot from the old overview once account no longer consumes it.
2. Keep editor and carousel selection state in UserAccountPage, the common parent of the header and inline Edit actions. No useAccountProfileEditor. Use the parent vocabulary and controlled callbacks listed above, with the existing AccountProfileProvider/API persistence path.
3. Add readAccountProfilePlaceholders and AccountProfilePlaceholders for sample interests/play style/teaching/counts/favorites, remove UserAccountPage's useMockState dependency and use narrow feature-owned presentation props. Keep readAccountProfileInsights as its existing separate fixture API. Export GameArtVariant from GameArt; keep Art as a compatibility alias.
4. Give the existing community overview independent ownership as proposed CommunityProfileOverview with its own module under communities/components. Preserve community markup, mock behavior, callbacks and appearance; do not create a shared profile model or redesign community Profile.
5. Extract colocated CSS Modules using existing React primitives and purpose-based tokens, preserving approved card/layout/typography and documenting local exceptions. Retain shared/global rules needed by community consumers. Keep account routes, full My Account / Profile breadcrumbs and other tabs unchanged.
6. Proposed visible refinements remain explicit review items: move inline Edit to the About me heading; implement field-specific blur/submit validation with accessible errors and first-invalid-field focus. Preserve other copy, appearance, real profile fields and mock values. Verify lifecycle/failure/identity/duplicate-save behavior with controlled fixtures, responsive account/community rendering, keyboard/focus, build/lint/relevant tests and token audit; update documentation with actual evidence and limits.

Pending review: the overall remaining Profile scope, CommunityProfileOverview, GameArtVariant, AccountProfilePlaceholders/readAccountProfilePlaceholders, proposed parent variable/callback names, and the two visible refinements. No further application changes have been made for this checkpoint. Communities follows after completed Profile review.

Approval checkpoint (2026-10-25): user agreed with the refinements and instructed implementation. The remaining Profile scope, names/ownership, parent state without a custom hook, independent CommunityProfileOverview, placeholder API/types, GameArtVariant cleanup and both visible refinements above are approved. Earlier proposal language records the review history; this approval supersedes its pending status. Verification completed locally; see docs/12 for results and limits.


Profile completion checkpoint (2026-10-25): the approved remaining Profile plan is implemented with its five selected account components, direct InsightsCarousel composition, feature placeholder API, parent-owned editor state, independent community overview, type-only GameArt cleanup and both visible refinements. The preceding carousel/checkpoint proposal paragraphs are historical review stages superseded by this approval/completion. Shared Modal additionally prevents native Escape default dismissal so the existing saving guard works; normal onClose behavior is retained. Completion review is next, then a separate Communities plan. No deployment or hosted profile writes. See docs/12 for verification.


## Communities plan — approved and implemented locally 2026-10-25

Profile completion was accepted and committed as b918fea. The next target is the Communities account tab, currently MyCommunitiesTab. This slice is frontend ownership/presentation cleanup. Preserve the existing real summary-view reads and established relationship rules; no new real APIs, tables, routing, permissions or deployment. Existing CommunitiesList and CommunityCard already satisfy much of the intended child-component split.

### Proposed components, API and names

Hook file organization (accepted 2026-10-25): user agreed to a single user-accounts/hooks.ts containing useAccountPreferences and useAccountCommunities as independent named exports, alongside api.ts/types.ts. This supersedes the proposed new hooks/useAccountCommunities.ts file. Existing shared profile data currently lives in AccountProfileProvider/accountContext under auth, with API operations already in user-accounts/api.ts; the approved editor state stays in UserAccountPage. The subsequent user preference for hook-owned account data supersedes the earlier exclusion of profile-data ownership cleanup; the simplification proposal below is now part of this plan review.

API organization clarification (accepted 2026-10-25): the user selected consolidation into the existing user-accounts/api.ts. One api.ts per feature is the standard unless a concrete reason justifies an exception. No exception is needed for this account list; the previously proposed communities.api.ts is withdrawn. communities/api.ts retains its separate community-scoped responsibilities. This clarification updates the API organization only; the remaining Communities plan still awaits review.

| File/name | Responsibility |
| --- | --- |
| AccountCommunitiesTab.tsx/.module.css (rename MyCommunitiesTab) | Account parent coordinator: consume account identity, useAccountCommunities and sample fixture API; compose toolbar, contextual loading/error/retry/empty feedback and existing CommunitiesList. Keep current copy and destinations. |
| CommunitiesToolbar.tsx/.module.css (new) | Controlled All/Managed/Owned FilterChipGroup plus Start New Community ActionLink/Icon. Props: filter, onFilterChange, createCommunityTo. No context, state or API calls. |
| user-accounts/hooks.ts (consolidate existing hook; add named export) | Move existing useAccountPreferences from hooks/useAccountPreferences.ts and add independent useAccountCommunities. Each named hook owns its own state/lifecycle and is called only by its relevant coordinator. Communities owns selected filter, request/retry keys, loading/error/results, identity reset and stale-response cleanup; return filter, communities, isLoading, loadError, changeFilter and retry. Update Settings/test imports and remove the superseded hook source after confirming no consumers remain. No combined all-account hook or query/cache dependency. |
| user-accounts/api.ts (extend; consolidate communities.ts) | Move readMyCommunities and toCommunityCards into the existing feature API file, preserving their behavior. Add synchronous readAccountSampleCommunity returning a fresh CommunityCardData fixture with the current sample's exact name/location/Active/Member values. Update runtime imports and test mocks, then remove communities.ts after confirming no consumers remain. Feature API owns any fixture-source import; UI no longer imports previewCommunity. |
| types.ts (extend) | Move CommunityFilter, CommunitySummary and CommunityCardData contracts out of the API module; update consumers/tests without adding an indefinite compatibility layer. |
| CommunitiesList / CommunityCard (keep) | Existing presentation-only list/card. Keep markup, semantic list items, shared primitives and action boundaries. Give metadata its own purpose-based typography in the card module so it is not owned by the tab's descendant rules. Retain applicable shared account metadata hooks. |

Remove previewName/previewLocation plumbing and the remaining mock/data import from UserAccountPage. Keep the my-communities route ID, Communities label and /account/communities path. Static filter labels and per-filter empty copy remain interface text; no artificial API for copy and no separate one-paragraph status component.

### Preserved behavior and boundaries

- All remains default and includes owner or qualifying membership; Managed includes active staff including owners; Owned includes active owners. Staff without membership is not silently added to All. Preserve archived summaries, removed-membership exclusion and revoked-staff/remaining-membership handling in the existing authorized view. Caller isolation and protected tenant audit fields remain database-owned.
- Preserve server-side predicates, safe selected columns, created_at descending/id ascending ordering, 1,000-row paging and current normalization/deduplication/Owner-to-Staff-to-Member precedence. No new backend behavior or hidden real-query fallback to fixtures.
- Keep the sample last in All, including loading/error/empty states, absent in Managed/Owned and absent when unauthenticated/no usable identity. Real Explore buttons stay disabled; sample preview and Start New Community links keep their current destinations.
- Clear visible real rows on filter/retry/account changes, ignore obsolete successes/failures, reset selection on actual identity changes and remove private rows on sign-out/unmount. Retain current remount/reset lifetime. Reselecting a filter currently starts a fresh read; preserve that behavior. Loading/error/retry/configuration and empty-state copy remain unchanged.

### CSS, verification and completion

Preserve appearance. Move toolbar composition into its module, keeping desktop card-action alignment, <=700px stacking and existing 20px gap as a documented local legacy measurement. Reuse FilterChip/FilterChipGroup, ActionLink, Button, Icon and current card/heading/body/metadata/token roles. Preserve list section-gap, card ref-space-24 content/action gap, card-grid/spacing measurements and current responsive padding. Audit specificity against general UserAccountPage paragraph/metadata rules before removing tab-owned descendants; no public-token/shared-definition changes or additional visual refinement proposed.

Adapt existing Communities UI/API tests and partial API mocks to the consolidated api.ts and types.ts boundaries. Verify Settings imports and preferences lifecycle tests after moving useAccountPreferences. Keep existing profile/preferences/premium/insights API exports and their consumers working; API test files may remain separated by behavior without creating additional runtime API files. Verify no reads without identity, late success/failure after filter/retry/account transitions, sign-out/unmount cleanup, repeated filter reads, sample availability, loading/error/retry/empty states, safe query predicates/order/paging/normalization and unchanged preview/creation destinations. Add only meaningful missing coverage. Compare settled styles/screenshots at narrow/tablet/desktop and 699/700/701/949/950/951/1199/1200/1201px boundaries; check long values, keyboard/filter state/focus, increased text spacing and no overflow. Use synthetic fixtures for coverage unavailable in existing hosted data; do not create/mutate hosted records. Report actual zoom/screen-reader/theme limits accurately.

Run build/lint/relevant tests and token checks; update affected structure/architecture/style/status documentation with results and limits. Stop after Communities completion for review. The first app page after UserAccountPage is a later selection/review decision, not implicitly authorized by this plan.


### User-account data hook simplification — agreed direction 2026-10-25

User prefers user-account data to live in a user-account hook and requested a less cumbersome shared-state arrangement. Current consumer audit: Sidebar reads global displayName and session status; UserAccountPage reads name/bio/profile-loading/profile-error/saveProfile plus session identity; AccountSettingsTab and MyCommunitiesTab use session status/userId, not shared profile fields. AccountActions in the header uses status/busy/signOut only. Topbar's community avatar gets model.profile.name from App's independent community mock. No global bio/profile-save action is used by the header, Settings or Communities. The earlier broad statement about global profile sharing to the header was inaccurate.

Proposed concrete simplification: add useUserAccount(userId) in user-accounts/hooks.ts to own global profile loading, loaded data, load errors and saveProfile through api.ts. Invoke it once at the existing AuthShell/app boundary and merge its result into the existing single AccountContext provider, removing AccountProfileProvider and its nested provider. Authentication/session lifecycle stays in AuthShell; useAccount remains a lightweight consumer of the shared result. Keep the context contract in user-accounts/types.ts where it represents account data; review the context module's final location/name with the wiring rather than adding a second context/store. Editor drafts/modal/validation stay in UserAccountPage, and preferences/Communities retain their independent named resource hooks in the same hooks.ts file. No eager all-resource loading or new state/query dependency.

One invocation of a stateful hook owns one instance; calling it independently from Sidebar and UserAccountPage would introduce duplicate reads and independent copies. The single existing context shares the one hook result so a successful profile save updates the sidebar immediately. Remove redundant provider wiring instead of adding new sharing infrastructure. Preserve current verified-session guards, profile-error behavior, account-change/sign-out reset and child remount semantics, stale request handling, saves and normalization. Test identity transitions and shared sidebar updates alongside existing Auth/profile regressions. These wiring/naming details are proposed for review; no runtime implementation yet.


Auth boundary clarification (2026-10-25): user accepted the single-hook-instance/single-context simplification and asked for the resulting auth structure. AuthShell remains the owner of Supabase session restoration/subscription, confirmed-email gating, auth forms/actions (sign-in/up/out, confirmation/resend, password recovery/reset), auth feedback and redirects. It calls useUserAccount with the verified user ID and supplies that hook result together with its session summary through the one AccountContext provider. Global profile reads/saves/loading/errors live in user-accounts/hooks.ts via user-accounts/api.ts. Preserve identity-keyed child remount/reset semantics when removing the nested AccountProfileProvider.

Proposed concrete file placement: move auth/accountContext.ts to user-accounts/accountContext.ts for the context declaration; put AccountSummary in user-accounts/types.ts and its lightweight useAccount consumer in user-accounts/hooks.ts alongside useUserAccount, useAccountPreferences and useAccountCommunities. AuthShell imports the context and data hook; Sidebar/UserAccountPage/Settings/Communities and auth/AccountActions consume useAccount from the feature hooks file. auth/AccountActions.tsx remains authentication UI and uses only the session/action fields. Remove auth/AccountProfileProvider.tsx and migrate its relevant tests to the hook/shared-consumer integration boundary. Do not introduce AuthProvider/UserAccountProvider layers, a new store, all-resource eager reads or new auth behavior.

This is the concrete ownership target for the reviewed account refactor. Existing Auth.tsx/Auth.css presentation and direct Supabase Auth operations are retained during this slice; a full auth-page/API/presentation extraction is a later page review. The API-per-feature convention remains the target rather than retroactive approval of legacy direct UI calls. No implementation executed during this planning discussion.

Implementation approval (2026-10-25): user explicitly instructed implementing the plan after agreeing to the auth/account boundary. The Communities components, one api.ts/types.ts/hooks.ts per agreed account organization, useUserAccount shared profile lifecycle, single relocated account context, removal of AccountProfileProvider, preserved identity remount/reset semantics, and verification scope above are authorized. Historical proposal wording is superseded by this approval. No broader auth-page redesign or backend/deployment change.


Communities completion checkpoint (2026-10-25): implemented the final approved plan, including AccountCommunitiesTab/CommunitiesToolbar, consolidated api.ts/types.ts/hooks.ts, hook-owned shared profile data, relocated single context and removal of AccountProfileProvider. Earlier pending/proposed paragraphs above document the decisions leading to the final approval and are superseded by this checkpoint. Existing real reads/writes, auth flows, identity reset/remount semantics, sample behavior and visual rendering are retained. Full suite/build/lint/token checks pass; see docs/12 for evidence and explicit limits. Stop for completion review; the next app page needs its own plan. No deployment or hosted writes.


## Community Home plan — approved and implemented, completion review 2026-10-25

The completed Communities/account-auth slice was accepted and committed as 3a68cb9. All four UserAccountPage tabs have now completed their reviewed presentation slices. The approved target is Community Home, the first community destination, formerly features/Home.tsx. Preserve its sample-only nature, current URLs and shared mock lifetime. This is the app-owned community composition described in docs/05 and docs/07; it is not a new Home feature or a real event-feed implementation.

### Approved components and names

| File/name | Responsibility |
| --- | --- |
| app/pages/CommunityHomePage.tsx + module (move/rename Home) | Page coordinator and outer composition. Own selectedView, selectedCategory and visibleMonth, using the explicit fixture year/initial month. Receive narrow event/preview/callback inputs from the route bridge. No MockModel contract in its presentation props. |
| app/pages/components/CommunityHomeHero.tsx + module | Existing intro artwork, copy, featured Azul preview and supplied event action. Reuse Heading, Button, Icon, Botanical and GameArt; do not force this distinct illustration layout into HeroFeaturePanel. |
| app/pages/components/CommunityWeeklySchedule.tsx + module | Supplied Tuesday/Thursday schedule rows, time labels and existing decorative icons. Keep the two related rows together rather than adding a one-row abstraction. |
| events/components/CommunityEventsSection.tsx + module | Controlled Upcoming/Calendar switch, category controls, timezone note, card grid and calendar composition. Receive selected values, supplied event/calendar data and callbacks; reuse Tabs, FilterChip/FilterChipGroup, ActivityCard and Empty. No API/context/state in the presenter. |
| events/components/EventCalendar.tsx + module | Controlled existing month grid, weekday/day cells, bounded month actions, event actions and empty-month presentation. No internal selected month or speculative universal-calendar API. |
| Existing FeaturedActivityCard (keep) | Supplied Halloween highlight, current artwork and onOpen action. Keep its shared appearance; no extra wrapper component without a concrete responsibility. |
| Existing PromotionalBanner (keep) | Retain the guest-only paid-membership promotion, supplied copy and membership action. Reuse the shared component without an extra wrapper. |

Proposed parent vocabulary: selectedView, selectedCategory, visibleMonth; callbacks onViewChange, onCategoryChange, onMonthChange, onOpenEvent and onOpenMembership. Child action props use onOpenEvent with a supplied ID; parent/route adapter maps to the existing shared activity dialog. Replace Home's broad model/open/membership props with explicit data/preview/callback contracts, retaining the existing membership action through onOpenMembership. Page-specific children belong with app composition; event browsing/calendar presenters belong to events. Shared primitive and branded visual components stay shared.

### Data, state and mock continuity

Extend the existing communities/api.ts with readCommunityHomeContent for sample community/schedule/highlight configuration, supported by communities/types.ts. Add one events/api.ts with readCommunityHomeEvents and selectCommunityEvents for official-event mock projection/filtering, plus events/types.ts for explicit Home event/calendar contracts. Do not create another API file per resource or a hooks file merely for pure fixture reads. Keep static interface copy in presenters when it is not domain fixture data.

The existing App-owned mock items/seats must remain the single simulation snapshot shared with the activity dialog, Meet & Play and community Profile. Add a small route-level compatibility adapter that feeds that current snapshot through the events API, rather than introducing another fixture store or re-reading pristine seed data. Legacy fixture source types may be confined to the API adapter; new page/child contracts must not depend on MockModel. Reuse ActivityCard and narrow its data-facing type only as necessary for structural compatibility, without changing its rendering or shared dialog behavior. Identify any type-only shared-consumer adjustments before execution. No event/table mutation, reservation lifecycle or new store is introduced here.

Keep view/category/month UI state in CommunityHomePage. Preserve current remount behavior when navigating away, preview mode switching and dialog open/close; booking/cancel changes elsewhere must still update Home's displayed counts/status. Retain mock member/guest preview heading variants as sample presentation, without treating the flag as real account approval/entitlement. Community Home continues to show official events only, including when a category filter is active; do not add hosted-table rows. Preserve the frozen 2026 calendar, initial October, January/December bounds, category names, featured event IDs and local time labels. Do not silently convert sample Upcoming into a live clock-based feed, add multi-year navigation, invent cancellation/archive controls or connect backend data.

### Prototype preservation — accepted clarification 2026-10-25

D-064 defers paid membership/payment functionality, while Home currently shows a guest-only L300/month promotion and a Separate ticket required callout. The user explicitly directed retaining these existing prototype elements and deferring reconciliation until communities features are implemented. Preserve the promotion, its current guest-only condition, L300/month copy, Become a Member action and membership callback, plus the Halloween highlight's Separate ticket required callout. The earlier proposed removals are withdrawn. This is a scoped preservation decision; it does not change the eventual product/payment requirements or authorize new commercial functionality.

Retain the existing shared ActivityDialog behavior, including its guest admission prices, special-event checkout and legacy reservation simulation. This iteration breaks presentation into sensible components, organizes state/data boundaries and normalizes CSS; it does not resolve these community product inconsistencies. Record discrepancies for later community feature work without changing existing copy, conditions, callbacks or simulation behavior during this structural slice.

### Styling, verification and completion

Preserve existing rendering, including the promotion and ticket callout. Audit Home.module.css/global interaction and its 1600/1200/950/700px overrides, then move each rule to its owner. Parent owns external section separation; child modules own internal composition. Reuse card/heading/eyebrow/body/meta/action tokens by purpose and the approved spacing primitives. Preserve documented Home-specific artwork palettes, tracking, borders, shadows, transforms, irregular local measurements and calendar-event categorical paints/1.4 leading. Explain local exceptions beside rules. Shared HeroFeaturePanel/InsightCard/Button/GameArt/etc. are not restyled to fit this page. No new public tokens/themes/dependencies or global token refinement.

Keep the calendar's existing narrow-screen internal scrolling/minimum geometry as a local presentation contract while avoiding document overflow. Compare Upcoming/Calendar, categories, January/December bounds, empty months, keyboard focus/actions, preview headings, hero/highlight actions, dialog dismissal and shared seat/count continuity at mobile/tablet/desktop and all relevant breakpoint boundaries. Use synthetic fixtures for interaction/state coverage and increased text spacing; no hosted writes. Include affected ActivityCard consumers if a type contract moves; verify actual zoom/screens/readers only where supported and report limits.

Run build/lint/relevant navigation/mock-state tests and token checks, adding meaningful missing cases for derived filtering/calendar data and preserved mock lifetime. Update affected structure/style/architecture/status documentation. No schema/real API/deployment changes. Stop after Community Home completion for review before planning the following page. Component/API names and implementation were subsequently approved; preservation of the existing commercial copy, promotion and shared dialog behavior is settled by the user's clarification above.

Community Home implementation approval (2026-10-25): user approved the revised plan and instructed execution. Implement the named page/children and feature API boundaries, preserving the commercial prototype elements, existing simulation lifetime and rendering. ActivityCard receives a narrower feature-owned presentation contract; legacy callers remain structurally compatible. Shared date/time formatting may move unchanged to lib with a compatibility re-export for legacy consumers so new UI does not import mock utilities. No backend, deployment or broader community feature implementation.

Community Home completion checkpoint (2026-10-25): implemented the approved page/children/API/types organization and relocated CSS ownership. Shared ActivityCard receives a narrower compatible type; date/time formatting moves unchanged to lib with a legacy re-export. Existing promotion, ticket copy, guest/member preview conditions, shared booking/checkout simulation, current snapshot counts/status, navigation reset behavior and frozen calendar remain intact. One local text-wrapping rule fixes calendar-title overflow under increased text spacing without changing normal rendering. No new API calls, tables, storage, dependencies, token definitions or deployment. Build/lint, 136 tests across 18 files, token checks and 64 responsive baseline comparisons pass; browser interactions and text-spacing fixture verified, with limits in docs/12. The temporary fixture was removed. Stop here for completion review before the next page plan.


## Meet & Play plan — approved and implemented, completion review 2026-10-25

Community Home was committed as 6defc2b. Next target: the existing Meet & Play route, including its create-table and matching-preferences dialogs. Preserve its prototype functionality and appearance; defer community product inconsistencies until domain implementation, following the user's current structural-refactor direction. The user approved this plan and instructed implementation.

### Proposed components and names

All files below live under features/meet-and-play, with a colocated CSS Module for each extracted component.

| File/name | Responsibility |
| --- | --- |
| pages/MeetPlayPage.tsx (replace flat features/MeetPlay.tsx) | Page coordinator, heading/action, Find a Table/My Tables view, existing notice/card grid/empty state/guidance and modal composition. Own browsing state, modal selection, editable drafts and creation error. Receive narrow snapshot/action props through the existing route bridge; no MockModel presentation contract. |
| components/MeetPlayHero.tsx | Existing introductory hero/artwork and matching shortcut. Reuse HeroFeaturePanel and Botanical; receive matching status and onOpenMatching. No separate wrapper for the shared shortcut. |
| components/TableFilters.tsx | Controlled search, game/location selects and beginner checkbox. Receive option lists, TableFilterValues and onFiltersChange. No data reads or filtering logic. |
| components/CreateTableModal.tsx | Existing shared Modal plus controlled table form, private/public location labels, current native constraints and supplied error. Receive CreateTableDraft, onDraftChange, onSubmit and onClose; no UUID generation, record construction, mutations or local draft state. |
| components/MatchingPreferencesModal.tsx | Existing shared Modal, explanatory copy and controlled preference form. Receive MatchingPreferencesDraft, options, onDraftChange, onSubmit and onClose. No matching service or notification delivery. |

Reuse Tabs, Heading, Button, Icon, Modal, Notice, Empty, ActivityCard and GuidanceNote directly. Keep the card grid in the page; no new TableCard, generic form framework, list wrapper, or shared form primitive without a concrete need. There is no established Input/Select React primitive in the current primitive inventory; use native labeled inputs/selects/textarea with the existing form styling conventions.

Proposed page vocabulary: selectedView, tableFilters, activeModal, createTableDraft, createTableError and matchingPreferencesDraft. TableFilterValues contains searchQuery, gameType, locationType and beginnerFriendlyOnly. Feature contracts also include CreateTableDraft, MatchingPreferencesDraft and MeetPlayTableSummary. Proposed external callbacks: onOpenTable(id), onCreateTable(draft) and onSaveMatchingPreferences(draft). Page handlers own opening/resetting/cancelling drafts and successful-create UI transitions; children only render supplied values and forward changes/submission.

### Feature API and simulation ownership

Create one meet-and-play/api.ts and types.ts. Proposed API exports:

- readMeetPlayContent: filter/form options, frozen create-form defaults and existing simulation configuration/copy where it represents mock data.
- readMeetPlayTables: project the current App-owned table/seat snapshot into listing contracts; omit exact addresses and detail-only fields from listing props. Preserve current host/status/beginner classification.
- selectMeetPlayTables: existing case-insensitive title/host/location search, category/public-private/beginner filters and Find a Table/My Tables selection, retaining source order. My Tables still includes host You or any current seat status; no new clock/lifecycle filter.
- createMockTable: preserve the current trimmed title/location, same-day end-after-start validation, UUID construction and legacy record shape/defaults. Return success/error and the simulated update for the route adapter to apply to the existing App store.
- saveMockMatchingPreferences: preserve the supplied preference values and return the simulated saved-preferences/matching-enabled update and existing notice for that same adapter.

The route bridge applies API results to the existing App-owned items/matchingPreferences/matching/notices. Pass only narrow action outcomes back to the page (creation error or success), so it never constructs legacy Activity records or coordinates mock-store setters. Confine legacy fixture contracts to the compatibility boundary; reuse ActivityCardData rather than duplicating its rendering fields. Do not introduce a second table collection, reread pristine seeds, or reset shared seats/notices when navigating. No hook is needed for these synchronous fixture reads/actions; introduce request lifecycle hooks only with a concrete asynchronous boundary.

Creation drafts initialize afresh on each opening and discard on cancellation, matching the existing unmounted form. Matching drafts initialize from the saved mock preferences on each opening; cancelling discards edits and submitting preserves them across navigation until refresh. Successful creation still prepends the table, records the existing notice, closes the modal, selects My Tables and clears all filters. Keep filters when opening/closing dialogs otherwise. Navigating away or switching into the route's guest gate still remounts/reset page-local browsing/draft state; App-owned tables, matching data, seats and notices remain. Retain existing error text/lifecycle and required/length/range constraints; no new validation policy or error redesign is bundled.

### Preserved discrepancies and scope

Keep the current guest membership gate/copy/action at its shared router boundary, matching shortcut/status wording, mock host You, fictional-address handling, default private-location selection, frozen 2026-10-17 / 16:00–19:00 form defaults, five total seats with one host seat filled, default request mode, instant/request choices and beginner defaults. Do not replace them with new community standing, real user identity, live dates, per-person/group rules or manually_confirm_seats semantics during extraction. D-055–D-065 remain the eventual domain requirements; Q-012's matching operations remain open. Do not connect the matching form to the global account matchmaking flag or deliver messages to hosts. Existing success notices remain in-memory simulations.

Retain the shared ActivityDialog for details/requests/waitlists/booking/cancellation and host controls, including its current limitations. No shared-dialog domain refactor, group/guest management, queue processing, new address authorization guarantee, schema, real APIs, persistence or deployment. Listing projection does not make the shipped prototype fixtures secure; all current address/access simulations remain explicitly mocked.

### Styling and verification

Audit MeetPlay.module.css plus meet-banner, filter-bar, search and relevant form/check-label/row/global rules before moving them. Hero/internal/filter/modal layout belongs to the child module; page owns external separation and shared-card/grid placement. Reuse card/heading/eyebrow/body/meta/action/focus roles by actual purpose and the 4/8/12/16/24/32px spacing primitives where applicable. Preserve documented local illustration, divider, compact input typography and editorial measurements without promoting them to shared tokens. Keep mobile inputs at 16px. Shared search/filter/form selectors also serve Discussion and other dialogs: remove only rules with no remaining consumers, keep required shared conventions and verify cascade/specificity rather than restyling those consumers. No new public tokens, shared value changes, themes or styling dependencies.

Verify baseline/post rendering and interactions at mobile/tablet/desktop and adjacent 700/950/1200px boundaries: both views, combined/no-result filters, keyboard/focus, modal scroll/dismissal, private/public location controls, preserved constraints and same-day/blank-input errors, cancel/reopen draft behavior, successful creation/filter reset, matching save/reopen/cancel and mode/navigation reset boundaries. Check that created tables and booking/count/status changes remain consistent with community Profile and the shared dialog across navigation; Community Home remains official-events-only. Use synthetic long content and increased text spacing without real addresses or hosted writes. Run build/lint/relevant tests and token reference/cycle/unused checks, update affected documentation and report unsupported zoom/screen-reader/theme checks accurately. Stop after this page for completion review.

The component/type/variable/API names and scope were approved by the user. Execute the plan, then stop for completion review.

Meet & Play completion checkpoint (2026-10-25): implemented all five approved component names, parent-owned state and one API/types boundary over the unchanged App simulation. New UI has no mock record/store imports; route bridge applies API command results. Preserved guest gate, matching/creation/booking behavior, defaults/constraints and appearance. Moved only the unshared hero rules out of App.css; retained shared native form/search/filter conventions. Build/lint, 150 tests across 20 files and token checks pass; 91 responsive baseline comparisons and 39 long-content/text-spacing checks pass. Browser verified native constraints/time errors, draft resets, matching persistence/cancel, creation and shared table/booking continuity. Temporary fixture removed; evidence/limits in docs/12. No backend, new storage, hooks, dependencies, public tokens or deployment. Stop for completion review before the next page plan.


## Championship plan — approved and implemented locally 2026-10-25

Meet & Play was committed as 5e2fee8. Next target: the existing Championship page, including all five in-page views and its entry/result/rules dialogs. This is structural presentation/data/CSS cleanup, not the separately deferred Championship domain redesign. Preserve the current mock functionality, copy, commercial previews and appearance, following the user's preservation direction. The user approved this plan and instructed implementation.

### Proposed components and names

All new files live under features/championships, using the canonical capability name. Each presenter/page has a colocated CSS Module.

| File/name | Responsibility |
| --- | --- |
| pages/ChampionshipPage.tsx (replace flat features/Championship.tsx) | Parent coordinator, heading, view selector, presentation composition and modal orchestration. Own selectedView, activeModal, feedback and matchResultDraft. Receive narrow snapshot/action props through the existing route bridge; no MockModel contract. |
| components/ChampionshipHero.tsx | Existing featured-game introduction, artwork, registration-dependent action and member/guest preview copy. Receive supplied content/state/onOpenResult; reuse Tag, Button, GameArt and Botanical. |
| components/ChampionshipStats.tsx | Existing four supplied statistics and responsive strip. Keep the statistics together; no generic statistics library or one-number components. |
| components/ChampionshipOverview.tsx | Existing numbered introduction and spirit-of-play aside as one coherent two-panel view. Receive steps and onOpenRules; reuse Notice/Icon/Botanical/Button. |
| components/ChampionshipLeaderboard.tsx | Supplied sorted rankings, semantic table, current-player presentation, podium decoration and existing scoring note. No scoring/sorting or generic data-table abstraction. |
| components/ChampionshipMatches.tsx | Supplied registration/empty/results state, current confirm/dispute/waiting presentation, action callbacks and feedback Notice. No record updates or child feedback state; no one-row wrapper without a concrete need. |
| components/ChampionshipFinalTable.tsx | Existing final-event panel and provisional ranking list as one coherent view. Reuse Avatar/Tag/Notice/artwork; no new qualification logic or shared leaderboard abstraction. |
| components/PastChampions.tsx | Supplied historical champion cards/grid. Keep the simple collection together; no new generic ChampionCard. |
| components/ChampionshipEntryModal.tsx | Existing registration/payment-preview dialog, member/guest copy and onRegister/onClose. Reuse Modal, GameArt, Notice and Button. |
| components/MatchResultModal.tsx | Existing controlled opponent/date/score form with supplied options/defaults, onDraftChange/onSubmit/onClose and native constraints. No FormData-driven domain construction, UUIDs, status/scoring logic or local draft state. |
| components/ChampionshipRulesModal.tsx | Supplied illustrative rule list/disclaimer inside the existing Modal. No policy implementation. |

Proposed state names: selectedView, activeModal, feedback, matchResultDraft. MatchResultDraft contains opponent, date, score and opponentScore; numeric-field drafts remain strings so empty/in-progress native edits work. Proposed contracts: ChampionshipContent, ChampionshipStanding and ChampionshipMatchSummary. Proposed external callback names: onRegister, onSubmitResult, onConfirmResult and onDisputeResult. Presentation children receive onOpenResult/onOpenRules/onClose plus action callbacks as needed.

These view/dialog components have distinct content, interactions or styling responsibilities. Keep layout and simple repeated rows in their owning view; do not add a universal tab-panel component, result-card abstraction, entry controller, shared profile component or generic form/table framework. Reuse existing primitives/shared visuals before considering new ones.

### Feature API and state ownership

Create one championships/api.ts and types.ts. Proposed API exports:

- readChampionshipContent: frozen October/game/event/statistics/steps/rules/history/form-options/defaults configuration. Keep ordinary interface copy in presenters where it is not fixture/domain content.
- readChampionshipStandings: existing seeded-player baseline plus confirmed-result contributions, profile-name display substitution and descending points order. Preserve point-tie ordering and current-player display/highlight behavior; no new tie-breaker or identity model.
- readChampionshipMatches: project the current shared result records into display labels/status and existing confirm/dispute/self-waiting eligibility, keeping raw fixture contracts out of presentation files.
- registerMockChampionship: existing registration flag update and in-memory welcome notice.
- submitMockMatchResult: UUID/record construction, numeric conversion, appended result and existing feedback; ties become disputed and other submitted results pending.
- confirmMockMatchResult / disputeMockMatchResult: existing result-status updates and feedback, retaining existing action eligibility and self-confirmation restriction. No new quorum/deadline/dispute workflow.

The route bridge applies API command results to App's existing registered/results/notices with functional updates so the latest shared state is retained. Do not create a second result collection, reset seed data on navigation, or compute rankings/mutation records in UI. Legacy Result types remain at the compatibility boundary; new page/children consume feature-owned contracts. Mock profileName remains the community preview name, independent from global Auth/account data. No hook is needed for this synchronous mock boundary.

The page decides whether a result action opens entry or result submission from the supplied registration flag. Successful entry closes the entry modal without automatically opening the result form, matching today. Result drafts initialize afresh on each opening (first existing opponent, 2026-10-04, empty score fields) and cancel discards edits. Successful submission closes the modal, selects My Matches and shows the returned feedback. Confirm/dispute changes shared results and page-local feedback; feedback remains across view switches as it currently does. Navigating away resets view/modal/draft/feedback state while shared registration/results remain until refresh. Switching member/guest preview on this accessible route preserves page state and existing registration rather than adopting Meet & Play's gate/remount behavior. Preserve native date bounds 2026-10-01 through 2026-10-24 and required integer scores 0–300.

### Preserved discrepancies and limits

Q-007 leaves real scoring/counting limits, repeat opponents, confirmation policy, disputes/ties and finalist selection unresolved; Q-008 leaves competition identity visibility/guest discovery unresolved. D-064 defers commercial features. Preserve this approved prototype slice without resolving any of those policies: illustrative 5/3 points; submitted ties sent to review; pending/disputed excluded from standings; seeded base standings; static 32 players/48 games counters; six provisional finalists; frozen October dates; mock You identity; three opponent options; profile-name substitution; current entry/payment copy/action and member-only-network wording. Entry remains independent from preview membership and never unlocks Meet & Play/Discussion. No real payment, notification delivery or championship permissions are introduced.

Do not add real registration eligibility, live dates, new sorting/tie rules, season selection, match editing, actual finalists/address access, event/table linking, participant directories, global matchmaking integration or persisted competition data. Shared booking dialogs and other pages remain outside the implementation scope, apart from compatibility verification. Existing mock name-based identity/highlight behavior is not promoted as a production identity design.

### Styling and verification

Current Championship presentation is in App.css, including hero/artwork, statistic strip, numbered steps/spirit panel, leaderboard/rank/current-player treatments, result rows, final panel/list, champion cards and responsive overrides. Move rules to their owning modules and parent-owned external placement. Reuse existing card/heading/eyebrow/body/meta/action/footer/list-row/focus roles and the approved 4/8/12/16/24/32px spacing primitives by purpose. Keep decorative podium/trophy/illustration paints and statistics/game-label typography as local treatments instead of borrowing feedback/heading tokens solely because values match. Document preserved editorial/geometry exceptions nearby. No shared token definition/value changes, new public tokens, themes or dependencies.

Audit shared panel/two-column/host/member-row/actions/rules/small-art/form/table-scroll/Tag/Notice selectors and late action-footer/:has()/wrapping overrides before removal or replacement. Keep required shared rules for Discussion, other dialogs and shared primitives; remove only zero-consumer Championship rules. Preserve table semantics/internal narrow-screen scrolling, modal scrolling, keyboard focus and 16px mobile fields; do not introduce a design refinement in the extraction.

Verify all five views and all three dialogs in member/guest, unregistered/registered, pending/confirmed/disputed and self-submitted states. Cover entry/cancel, default/native-invalid form fields, result append/feedback, tie review, confirm/dispute scoring changes, exclusion of pending/disputed results, inability to confirm one's own submission, standings/final-view consistency, profile-name changes, provisional/history/rules copy and view/modal/draft/feedback reset boundaries. Test shared state across navigation and preservation across preview-mode changes; championship entry must not change membership. Compare baseline/post styles/geometry at mobile/tablet/desktop and adjacent 700/950/1200px breakpoints. Use synthetic empty/long names/results and increased text spacing with no hosted writes or real payment. Run build/lint/relevant tests and token reference/cycle/unused checks, reconcile architecture/style/status documentation and report unsupported zoom/screen-reader/theme checks accurately. Stop after Championship completion for review before planning another page.

The component/type/variable/API names and scope were approved by the user. Implementation is complete locally and accepted by the user for commit.

Championship completion checkpoint (2026-10-25): implemented the approved page plus ten controlled presenters and colocated modules, single API/types boundary and parent-owned UI state over the unchanged App simulation. Removed the flat Championship file and only its unshared global rules. Preserved existing scoring/registration/result/modal/navigation/commercial behavior and appearance, with local wrapping fixes for long match/finalist/history names. Build/lint, 167 tests across 22 files and token checks pass; 169 baseline comparisons and 104 long-content/text-spacing checks pass across 13 widths. Browser verified entry independence from membership, native constraints, pending/tied submissions, confirm/dispute and reset/continuity boundaries. Temporary fixtures removed; screenshots/evidence saved outside the repo. No backend, new store/hook, shared tokens, dependencies or deployment. See docs/12 for remaining verification limits. The user accepted completion and requested commit plus planning for the next target. Discussion implementation still requires its own reviewed plan.
