# Incremental page presentation refactor

Recorded 2026-10-25. Workflow and Settings implementation plan **approved by the user**. Settings was committed as 5b3f5a4. The AccountHomeTab slice is implemented, verified locally and accepted for commit; the user authorized moving to Profile planning. No deployment occurred. See docs/12 for evidence and verification limits.

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
