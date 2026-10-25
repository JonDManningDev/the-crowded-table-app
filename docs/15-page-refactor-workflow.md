# Incremental page presentation refactor

Recorded 2026-10-25. Workflow and Settings implementation plan **approved by the user**. Settings was committed as 5b3f5a4. The AccountHomeTab slice was committed as 31dea35. The independently requested InsightsCarousel addition was committed as f4e86ab; the remaining Profile refactor is approved and implemented locally; completion review precedes Communities planning. No deployment occurred. See docs/12 for evidence and verification limits.

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
