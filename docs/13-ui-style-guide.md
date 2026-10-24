# UI Style Guide

This guide establishes canonical UI patterns for The Crowded Table. Each UI facet has its own second-level section, with detailed conventions nested beneath it. Add future facets as peer sections as their guidelines are agreed upon.

Frontend architecture remains in [frontend patterns](05-frontend-patterns.md); implementation and deployment evidence remains in [implementation status](12-implementation-status.md).

## Application-wide scope — accepted 2026-10-21

Apply the account-established text roles, heading scale, off-white card surfaces, card padding/corners, 24px section stacks, 18px multi-column grids, 20px internal row padding, 5px label-to-metadata spacing and 24px action-footer separation throughout the app. Page/hero leading is 1.1; other heading leading is 1.2. Choose visual heading roles by purpose, independently of semantic HTML level. Mobile page actions sit below heading copy, and layouts wrap without a document minimum width.

Preserve decorative quotes, brand marks, illustration colors, chart/map geometry, and semantic success/error/selection treatments. Input text remains 16px on mobile to avoid focus zoom; inputs and navigation/action labels are distinct from body copy. Dense calendars and data tables may scroll within their own containers rather than compress text below the role sizes. This styling pass does not implement deferred billing, toast infrastructure, authorization or other domain behavior.

## Navigation, Links, and Buttons

### Objective

Establish consistent, accessible, and maintainable conventions for navigation and action controls throughout the application.

The application uses React Router for client-side navigation, React components, and CSS Modules for styling.

**Core principle:** HTML semantics determine what an element does. Visual styling determines how the element is presented. These decisions must remain independent.

### 1. Navigation vs. actions

Choose the underlying element based on behavior, never appearance.

| Behavior | Implementation |
|---|---|
| Navigate to an internal application route | React Router `Link` |
| Navigate within a persistent navigation menu | React Router `NavLink` |
| Navigate to an external URL | Native `<a>` |
| Navigate to an in-page fragment | Native `<a>` or router-compatible link, as appropriate |
| Submit a form | Native `<button type="submit">` |
| Trigger an operation or state change | Native `<button type="button">` |
| Open a modal, popover, or dropdown | Native `<button type="button">` |
| Expand or collapse interface content | Native `<button type="button">` |

Do not use buttons that call `navigate()` for ordinary navigation when a declarative link would suffice.

Programmatic navigation using React Router's `useNavigate()` is appropriate for workflow-driven transitions, such as redirecting after a successful form submission.

Authentication destinations should use `Link` when they navigate to routes. If they instead open authentication dialogs, use buttons.

### 2. Component architecture

Maintain separate semantic component families:

#### Link

Used for ordinary navigation within content and secondary interface elements.

- Uses React Router `Link` for internal routes.
- Uses native anchors for external destinations.
- Supports appropriate text-link visual variants.
- Does not imitate a button unless explicitly using the ActionLink component.

#### ActionLink

Used when a navigation destination requires prominent, button-like styling.

Examples:
- Create Account
- Explore Communities
- View Subscription Plans

Requirements:
- Uses React Router `Link` for internal destinations.
- Uses native anchors for external destinations.
- Shares visual design tokens and appearance variants with Button.
- Preserves native link behavior, including opening in a new tab.
- Does not use `role="button"` merely because it looks like a button.

#### Button

Used for actions rather than navigation.

Examples:
- Save Changes
- Delete Post
- Follow Community
- Submit Form
- Open Settings Dialog

Requirements:
- Renders a native `<button>`.
- Defaults to `type="button"` unless explicitly configured otherwise.
- Supports primary, secondary, outline, ghost, and destructive appearances where appropriate.
- Supports genuine disabled and loading states.
- Never serves as the default mechanism for route navigation.

#### NavItem

Used for navigation within structured menus, sidebars, account menus, and other persistent navigation areas.

Requirements:
- Uses React Router `NavLink` for internal destinations.
- Derives its active state from React Router instead of duplicating route state manually.
- Uses active-route detection appropriate to the destination. Consider `end` for exact matching when parent routes should not remain active.
- Relies on `NavLink` to provide `aria-current="page"` for the active destination.
- Supports default, hover, focus-visible, and active visual states.
- Maintains consistent icon alignment, label typography, spacing, and interactive hit areas.
- Does not reuse primary action styling to represent active navigation.

Avoid manually assigning `role="button"` to links or `role="link"` to buttons.

### 3. Visual hierarchy and styling

Visual treatment must reflect the control's purpose and context rather than its underlying HTML element.

Distinguish three presentation systems:

**Text links:** Low-emphasis navigation within content or secondary UI.

**Action controls:** Prominent operations or destinations. Buttons and ActionLinks may share identical visual appearances while retaining different semantics.

**Navigation items:** Controls within menus and navigation regions. Their visual states communicate location within the application, not action priority.

A filled primary action communicates "this is the action to notice."

A filled active NavItem communicates "this is the current location."

These meanings must remain distinct even if they share brand colors.

### 4. Shared design tokens

Button and ActionLink should consume shared appearance tokens rather than maintain duplicated styling values.

Shared tokens may include:

- Typography and font weight
- Border radius
- Horizontal and vertical padding
- Minimum interactive dimensions
- Border width and color
- Background and foreground colors
- Hover and pressed appearances
- Focus-visible indicators
- Transition timing

Use separate semantic tokens for action emphasis and navigation selection, such as:

- `--ct-action-primary-background`
- `--ct-action-primary-color`
- `--ct-action-outline-border-color`
- `--ct-nav-background-hover`
- `--ct-nav-background-current`
- `--ct-nav-color-current`

Follow the [approved token grammar](14-design-tokens.md). The prior names remain deprecated compatibility aliases for existing consumers, not choices for new code.

### 5. React Router integration

Use React Router's declarative navigation primitives consistently.

- Use `Link` for ordinary internal navigation.
- Use `NavLink` when the UI needs route-aware active styling.
- Use `useNavigate()` for imperative transitions resulting from workflows, not as a replacement for ordinary links.
- Preserve search parameters, hash fragments, and route-relative navigation semantics where needed.
- Use the project's installed React Router version and existing import conventions.
- Do not implement redundant route tracking or manually synchronize navigation state when React Router already provides it.

For NavItem implementations, prefer the `NavLink` render-prop API or supported class-name callbacks to determine active styling.

Example:

```tsx
<NavLink
  to="/home"
  end
  className={({ isActive }) =>
    isActive
      ? `${styles.item} ${styles.active}`
      : styles.item
  }
>
  <HomeIcon aria-hidden="true" />
  <span>My Home</span>
</NavLink>
```

The actual component should encapsulate these details so consumers do not repeatedly implement active-state logic.

### 6. Accessibility and interaction

All interactive controls must provide appropriate:

- Keyboard accessibility
- Visible keyboard focus (`:focus-visible`)
- Accessible names
- Hover feedback where applicable
- Sufficient text and icon contrast
- Consistent hit targets across comparable controls

Navigation landmarks should use semantic `<nav>` elements with meaningful accessible labels when multiple navigation regions exist.

Indicate active navigation using more than color alone, such as a background shape, indicator, or typography change.

Do not add `aria-current="page"` manually when React Router's `NavLink` already supplies it.

Disabled links require explicit design consideration because anchors do not support native disabled behavior. Where navigation is unavailable, prefer omitting the link or rendering noninteractive content rather than creating a superficially disabled anchor.

When switching account tabs or other app-layout routes, start the viewport at the top with the breadcrumb visible. Move keyboard focus to the main content using `focus({ preventScroll: true })` so focus does not override the scroll reset. Apply the reset before paint to avoid a visible jump. The explicit Skip to content link still scrolls to its target.

### 7. Application-specific classifications

Apply these conventions to the existing UI:

| Control | Component | Appearance |
|---|---|---|
| Sign in | Link | Header text link |
| Create Account | ActionLink | Outlined call to action |
| Your account | NavItem, if it navigates | Account navigation styling |
| My Communities | NavItem | Default or active navigation styling |
| My Home | NavItem | Default or active navigation styling |

These classifications assume the authentication controls navigate to routes rather than open dialogs.

Account avatar and account heading presentations should be evaluated separately to ensure their clickable behavior is visually clear.

### 8. Refactoring expectations

When applying these guidelines:

1. Audit existing anchors, buttons, React Router links, and navigation controls.
2. Identify their actual behaviors before changing their underlying elements.
3. Consolidate duplicated visual patterns into shared styles and tokens.
4. Introduce or reuse component abstractions only where they provide meaningful consistency.
5. Preserve existing behavior, routing, accessibility, and responsive layouts.
6. Replace imperative navigation with declarative links where appropriate.
7. Eliminate manually managed active-route state when `NavLink` can provide it.
8. Avoid unnecessary visual redesign during semantic refactoring.

**Implementation constraint:** These guidelines define architectural conventions, not a requirement to create new components or files. Inspect the existing component hierarchy and styling conventions first. Prefer extending established abstractions over introducing parallel ones.

### Governing principle

**Use Link for destinations, NavLink for route-aware navigation, and Button for actions. Use ActionLink when a destination needs button-like visual emphasis. Share presentation tokens without conflating semantics, visual priority, or navigation state.**

### Repository application and verification

Status: canonical, accepted from the user's supplied guidelines on 2026-10-16. This guide owns navigation/control semantics and presentation; frontend patterns retain architecture ownership. Existing warm colors, typography, responsive layout and mock business behavior remain unchanged.

Use the shared control families in `src/components/primitives/Controls.tsx` with colocated CSS Modules. CSS-native definitions in `src/styles/tokens/` are authoritative and imported by `src/index.css`; follow [token ownership and migration rules](14-design-tokens.md). Button and ActionLink share action appearance classes/tokens. Navigation selection has independent tokens and an indicator/weight change. Specialized interactive cards, filter chips and icon controls may use the Button's unstyled appearance with their existing component styles. Keep legacy layout hooks and token aliases during incremental migration. Default light remains the only implemented theme.

Account tabs are page navigation: use a labeled nav with exact NavItems, not button tabs or ARIA tab roles. Existing in-page view selectors remain pressed-state buttons. Sidebar/mobile community destinations use exact matching. The personal navigation area contains only the account link, with comfortable interior padding; it opens Overview and stays active throughout /account and its descendant routes. My Home and My Communities remain available in the account tabs. The community avatar is a labeled link. Sign in is a text Link; Create Account is an outline ActionLink; Start New Community and premium Manage/Explore are destinations. Modal editing, sign-out, retries, filters and save/send commands remain buttons. Every form submission declares `type="submit"`; Button defaults to `type="button"`.

Do not fabricate disabled anchors. Omit unavailable Manage destinations; show noninteractive explanatory text. While an auth/creation command is pending, replace its optional navigation with noninteractive text rather than allowing an accidental duplicate workflow. After successful commands, programmatic routing remains allowed. Preserve drafts, authentication callback processing and permission boundaries.

Verification must cover native link destinations/new-tab semantics, exact active state and browser history, action versus submit behavior, disabled/loading commands, keyboard focus, responsive navigation, and existing auth/profile/community workflows. Implementation and deployment evidence belongs in [implementation status](12-implementation-status.md).

## Page Layout and Scrolling

Reserve a stable scrollbar gutter on the document root. Switching between short and long pages must not shift the horizontal position of the shared heading, navigation, or content. Keep the shared page container responsible for alignment; do not compensate with tab-specific offsets.

Account-tab content uses the full width of the shared tab container. In particular, My Communities must not apply a narrower page-level maximum width; its community list aligns with the right edge of the tabs row.


### Account cards and signed-out views

Use Overview's standard panel as the account-card baseline: warm off-white (#fffef9), 27px padding (22px at widths up to 1200px, matching Overview’s responsive panels), 9px corners, and the existing line-color border. Shared card tokens apply to account panels, My Home cards and hero, and community rows. Preserve the Overview summary's specialized internal composition.

Remove standalone introductory/placeholder notes. Signed-out account tabs show only their tab-specific message below the shared heading/navigation: “Sign in to see your account.”, “Sign in to review your activity feed.”, “Sign in to see your communities.”, or “Sign in to manage your account settings.” Do not render mock content, sample rows or settings behind these messages. During session restoration show a loading state, not mock content. Signed-in unfinished features remain placeholders; this change does not implement new data sources. Typography follows the accepted roles below.


## Typography

| Role | Font size | Line height | Account usage |
| --- | --- | --- | --- |
| Body copy | 13px | 1.8 | Descriptions, explanatory paragraphs, status/sign-in messages and setting labels |
| Secondary metadata | 11px | 1.8 | Locations, community handle/role/status, statistics labels, setting help text, tags and subscription details |
| Eyebrows | 9px | 1.6 | Uppercase section labels, including Coming soon |

Use shared typography tokens for these roles at all account breakpoints. Headings, statistics values, decorative serif quotes, navigation and button labels keep their own sizes. Account overrides must not alter the separate community preview pages.

### Text colors

Accepted 2026-10-20; apply these canonical roles across the account tabs. Preserve existing weight and letter spacing.

| Role | Color | Token |
| --- | --- | --- |
| Heading | #173f32 | --ct-heading-color |
| Body copy | #53644f | --ct-body-color |
| Secondary metadata | #6b665e | --ct-meta-color |
| Eyebrow | #173f32 | --ct-eyebrow-color |

Eyebrows complement headings; size, capitalization and tracking distinguish them. Keep separate semantic tokens even where colors match. Preserve interactive control and feedback styles. Decorative quotes, mottos and illustration lettering remain unchanged: review them once more content is available to compare, with a possible small set of distinct variants. No decorative palette has been approved yet.

The warm-gray metadata color #6b665e supersedes #8a8f7f following the user's Overview browser comparison on 2026-10-20. Its calculated contrast is 5.64:1 on card #fffef9, 5.31:1 on page #f8f7f2, and 4.83:1 on tag #e9eee3. Preserve the 11px/1.8 metadata role; hue and size distinguish it from green body copy. The shared source token is now updated; deployment evidence remains in the implementation status document.

Apply approved colors and check readability against actual surfaces; report findings without silently substituting another palette.

## Feedback

### Accepted toast behavior — 2026-10-20

Use toasts for API success/error feedback after explicit actions, with politely announced success. Avoid duplicate announcements and success toasts for background reads. These are accepted requirements, not implemented infrastructure.

- Both success and failure auto-dismiss after 4 seconds. This supersedes the earlier 10-second failure duration: detailed recovery information is retained inline.
- Begin with an icon representing success or failure, followed by a concise, outcome-specific action message. Examples: “Account profile updated.” / “Failed to update account profile.” and “Seat reserved for {person}.” / “Failed to reserve seat for {person}.” The placeholder represents the relevant person's name, not literal UI text. Keep codes, detailed reasons and recovery instructions in the affected interface rather than the toast.
- Show at most 3 toasts on desktops/larger tablets and 2 on smaller screens.
- Start the timer when the toast becomes visible. Pause while hovered, keyboard-focused, or the browser tab is hidden.
- Every toast has a dismiss button.
- At capacity, a new toast replaces the oldest toast, except a toast currently receiving keyboard focus must not be removed.
- Combine repeated identical notifications instead of filling the stack.

Still open: the exact responsive breakpoint, placement, visual styles, component/library choice, duplicate matching/timer-reset semantics, and how to admit a new toast if focus protection prevents normal oldest-toast eviction. Do not silently choose a policy that violates either the visible limit or focus protection.

### Accepted form-validation behavior

Show field-specific text beside the input, associated accessibly with the field. Validate on blur or submit, then revalidate as users correct errors. Preserve entered values on failure, focus the first invalid field after an invalid submission, and avoid duplicate toast/inline announcements. Feedback must not rely on color alone. The validation pattern is accepted; it is not yet a shared implementation.

### Accepted inline recovery

“Inline” means within the affected form or content section, rather than only in the transient toast stack. Retain detailed error feedback and applicable recovery actions after a toast expires or is evicted. For API failures, include the response code and the specific error message returned by the API, rather than substituting only a generic failure message. A future typed error taxonomy (for example ValidationError, DatabaseError and BadRequestError) will classify failures and preserve their specific reasons; its exact types and response contract are deferred, not implemented here.

- Profile save failure: retain the open editor and draft; show a form-level message near Save so the user can retry.
- Community-list load failure: show an error and Retry within the list area.
- Invalid display name: show the explanation beside that field; correct it there without a toast for each validation error.

This is contextual recovery, not a second permanent notification stack. Proposed lifecycle: retain unresolved failures while the affected UI is present; clear or update the message when the operation succeeds or the relevant validation error is corrected. Exact clearing behavior and presentation remain under discussion. Network failures without an API response need a defined representation in the future error contract; do not fabricate a response code.

Recommended implementation details, not additional approved UI decisions: connect field messages using aria-describedby and aria-invalid, preserve normal help text, map server field errors to the same presentation, and consider a summary for forms with multiple errors. Final feedback colors, layout and components remain open.

## Panel and Row Spacing

### Narrow account layouts — accepted 2026-10-21

Do not impose a minimum document width. Account navigation and card contents must reflow within the available width, including zoom-reduced viewports. Allow tabs and comparable rows to wrap rather than hiding overflow or shrinking text. At mobile widths (up to 700px), place account header actions below the heading copy. Standalone community cards use card padding, never the internal-list-row padding rule; remove obsolete standalone-list styling rather than overriding it again.

### Account panel actions

Account card-ending actions, including Settings panel footers and the My Home hero, use a shared AccountPanel CSS Module: 24px between the preceding content/divider and the action row, 12px between actions, and wrapping when needed. The footer owns this separation; preceding list bottom margins must not add a second gap. This implements the requested Save/Explore spacing consistency. Button/ActionLink internal padding and height continue to use the existing shared controls; panel padding remains governed by the card baseline.

### Settings and comparable list rows

Accepted 2026-10-21: use 20px vertical padding for comparable settings/list rows and a 5px gap between the label and its secondary metadata. Metadata is displayed as a block below the label. Consume --ct-list-row-padding-block and --ct-label-meta-gap by purpose; prior --settings-row-padding-block and --label-metadata-gap names remain compatibility aliases until their consumer batches migrate.

Apply this pattern to personal discovery settings, community preferences, and premium-feature rows. Preserve existing horizontal layout, control sizing, typography, colors and divider treatment. Standalone community cards retain the separate card-padding rule; these are not internal settings rows. Preserve intentional differences such as a placeholder notice or a Manage link versus a switch.


### Account stacks and local role styling — accepted 2026-10-21

Use 24px between vertically stacked sections/cards and 18px between cards in a multi-column grid. A grid that becomes a single-column stack uses 24px. Use shared spacing tokens; parent containers own gaps, and card children do not add sample-specific or trailing margins. Keep specialized Overview summary composition and decorative text unchanged.

My Communities retry uses the shared outline action appearance. My Home and My Communities consume approved text-role tokens directly rather than relying on page overrides to hide obsolete colors. Remove unused standalone-page styles. Heading roles are now settled by the heading scale below; semantic HTML hierarchy is unchanged.


### Heading roles — accepted 2026-10-21

Choose HTML heading levels for document hierarchy, independently of visual role. Use explicit data-heading roles and shared size/leading tokens within account pages; never choose a heading element just to obtain a font size. Retain Libre Caslon Display and the approved heading color.

| Visual role | Size | Line height | Account examples |
| --- | --- | --- | --- |
| Page | 48px; 36px at viewport widths up to 700px | 1.1 | My Account |
| Hero | clamp(36px, 4vw, 54px) | 1.1 | All your tables, in one place |
| Card/section | 30px | 1.2 | About me, profile name, community names, Settings panels, My Home cards |
| Subsection | 24px | 1.2 | At the table, I'm; My Home placeholder headings |
| Item | 20px | 1.2 | Favorite game names |

Multiline review criteria: load the actual serif font before judging; check two/three-line headings, accents and descenders for collisions/clipping, long user names/community names for overflow, and wrapping for readable phrase groups without unnecessary forced breaks or an isolated short final word. Judge line cohesion separately from margins between heading and surrounding content. Check 360/390px mobile, tablet and desktop widths plus breakpoint boundaries, 200% browser zoom and increased user text spacing. No text should be lost, overlap controls, or require horizontal scrolling. Uneven wrapping in editable names is preferable to truncating essential text. Existing deliberate hero line breaks may remain but must survive narrow screens. These are review criteria, not a claim of completed visual QA or a reason to automatically change the agreed sizes.

## Filter chips — accepted 2026-10-22

FilterChip is a native button for filtering displayed content, not route navigation or a metadata tag. Use 12px/1.6 control text at weight 500, a pill shape, 12px horizontal padding and a minimum 36px height. Labels may wrap; groups wrap with 8px gaps and an accessible group label. The parent owns 24px separation from results.

Use dedicated filter tokens: off-white default surface with body-color text and the shared line border; pale-green selected surface with heading-color text and a visible checkmark. Selected/unselected hover backgrounds remain distinct. Use the shared focus ring with a 4px offset, native disabled behavior, and aria-pressed for selection. Keep chip width stable across selection: unselected labels are centered with the 20px checkmark-and-gap allowance split equally into horizontal padding (22px per side). Selected chips use 12px per side around the centered icon-and-label group. Do not leave an invisible leading icon that offsets unselected labels. Home allows exactly one active category; reselecting it preserves the selection and All evenings resets the filter. Multi-select behavior may later compose the same controlled chip; it is not added to Home.

The implementation must verify text/readability in normal, hover, selected and selected-hover states and responsive wrapping. Callout recommendations remain proposals and are excluded from this change.

Filter-chip palette and verification (2026-10-22): default #fffef9/#53644f; hover #ecefe5/#53644f; selected #e6ebdc/#173f32; selected hover #dbe3cf/#173f32 (background/text). Text contrast is respectively 6.30:1, 5.46:1, 9.64:1 and 8.87:1. The shared #ad704c focus ring contrasts 3.77:1 against the page and 4.00:1 against the card surface. The subtle line border is decorative; text, grouping and the selected checkmark convey the control and state. Disabled controls retain native semantics and reduced opacity; contrast values above describe enabled states, not a full accessibility certification.

## Purpose-specific content patterns — accepted definitions, 2026-10-22

These definitions replace the proposed generic Callout abstraction. Implementation is incremental; see the implementation-status document for completed components. Shared text, card and control tokens still apply. Line counts are normal-layout targets, not truncation limits. Allow wrapping at narrow widths, with enlarged text and for long dynamic content; do not clip essential titles or descriptions. Detailed visual variants remain to be settled where noted.

### Existing ActivityCard token extraction — 2026-10-23

ActivityCard remains a whole-card native Button that opens the caller's details dialog. Batch eight moves its exclusive styles to ActivityCard.module.css, using card background/padding/radius, card-heading typography, schedule/location/footer metadata, host body typography and ordinary spacing primitives. Preserve official/table content, public/private location icons, host attribution, full/open availability and confirmed/requested/waitlisted labels. Parent grids and filtering remain external.

The existing #e2e5d9 border, base/hover shadows and -4px lift, decorated category/date stamp, status paints and local content rhythm are preserved treatments, not newly approved global roles. Artwork height remains 168px by default, 205px at >=1600px, 145px at <=1200px, 175px at <=950px and 200px at <=700px. The global focus and reduced-motion rules remain in force. This extraction does not resolve the border discrepancy, redesign state colors or implement reservation rules. Verification and the review gate are recorded in implementation status.

### Existing shared Heading token extraction — 2026-10-23

The page Heading retains its h1/data-heading="page", eyebrow, optional description and caller-owned action. Its CSS Module consumes existing body, page-title, eyebrow and section-spacing roles directly. Preserve 48px/1.1 titles and 36px/1.1 at <=700px, body/eyebrow combinations, global family/weight/margins and account-page overrides. Keep the 20px internal gap, 31px desktop separation, 24px mobile separation, mobile tracking and compact action sizing unchanged; the 31px/general-section distinction remains in the token guide's visual review register. Mobile actions remain below the copy. This extraction adds no new type/spacing values or component API. Verification is recorded in implementation status.

### Existing shared Tabs token extraction — 2026-10-23

Local-view Tabs remain native Buttons with aria-pressed and the same controlled value/onChange API; account tabs remain NavItem destinations. Keep inactive labels #6b665e, selected labels and underline #224c3a through independently governed Tabs paint contracts, rather than metadata or route-navigation roles. Reuse section-gap for content separation, spacing primitives for existing 24px gap/12px mobile top padding, and stone for the container divider. Preserve local typography, responsive 19px/22px gaps, compact Home/Meet & Play treatment, Profile overrides, wrapping and account-link presentation. The token guide records exact mapping and future theme ownership; implementation status records verification. Existing control-size/contrast/type accessibility review remains separate.

### Existing shared Modal token extraction — 2026-10-23

Modal retains its native dialog, existing ui.module.css and close button. Reuse the existing card-surface/content-padding contract and card-heading size/content-leading/color roles. The shell's broad inherited foreground and header divider retain palette primitives; they are not heading or card-outline semantics. Preserve 560px/950px caps, 30px/35px viewport allowances, 90dvh scrolling, sticky header, 12px corners, local header spacing, shadow and blurred backdrop. Keep the distinct #e4e7d9 outline and #7c8a6c direct-paragraph color in the unresolved visual register. No theme or accessibility refinement is included. Mapping, consumer impact and verification are recorded in the token guide and implementation status.

### Existing ActivityDialog token extraction — 2026-10-23

ActivityDialog uses ActivityDialog.module.css for its content, reservation summary, host requests, chat and legacy preview checkout. Reuse card, heading/body/metadata/eyebrow, list-row and label/meta roles by purpose. Preserve 1.3fr/1fr columns with a 30px gap, local artwork/meter/icon/chat treatment and price typography. At <=700px, content becomes one column, reservation comes first and artwork becomes 180px high. The shared native Modal still owns its shell, scrolling, backdrop and lifecycle; controls and Notice retain their own contracts.

This is an appearance-preserving extraction, not new reservation or commercial policy. Computed baseline evidence showed the old cancellation .danger paint was overridden by the ghost action; keep the rendered ghost color and remove the ineffective hook. Preserve seat-state labels, mock address/chat conditions and request behavior. Status and verification are recorded in implementation status; alternate themes and existing accessibility review remain separate.

### Promotional banner

Concisely advertises a currently locked in-app product that the user can unlock, usually but not always through payment. Optional leading icon; required one-row heading; optional one-row description; required unlocking action. No eyebrow. Implement only the current compact variant when authorized; small/large variants remain future possibilities. This presentation definition does not authorize billing implementation or reinstate legacy paid community access gates.

Implemented as `components/shared/PromotionalBanner.tsx` with a colocated CSS Module. The compact presentation uses shared off-white card background, padding and radius, a 24px/1.2 subsection heading, body description, and an 18px internal gap. The parent owns external spacing. Use a shared Button or navigation control for the required action; the caller owns unlock behavior and visibility. At narrow widths the action moves below the icon/copy, and text wraps without truncation. The optional icon is decorative alongside the text. Semantic heading level is configurable independently of visual size. Community Home retains its guest-only mock membership promotion and existing preview dialog.

Token extraction (2026-10-23, awaiting review): the CSS Module now consumes existing --ct- card and heading/body roles. The 18px compact gap, 7px description offset and 240px copy wrapping basis retain local ownership; no new tokens, border, component API or visual values were introduced. Verification is recorded in implementation status; the existing h4 family/weight difference remains in the token discrepancy register.

### Featured-activity card

Supports an event or table. Required prominent category tag (interest, game type or another category), required one-row heading, optional one-row description, required date, optional short special callouts such as Separate ticket required, and a required action below the content that opens the associated activity details modal. Optional image area at the right. Date uses 13px/1.8, weight 600 and heading green (#173f32), distinct from regular-weight body-green description text. Place special callouts on a separate row using the established secondary metadata role. No eyebrow is specified; the tag supplies category context.

Implementation (2026-10-22): `components/shared/FeaturedActivityCard.tsx` and its CSS Module supply the shared presentation. The caller supplies the shared Tag, display date, action label and details-modal callback, plus optional description, special-callout text and image. A 30px/1.2 card heading is independent of semantic heading level. Use shared card background/border/padding/radius, a 24px action-footer gap and parent-owned 24px separation from surrounding stacked content. Artwork occupies the right 35% on larger screens; at 700px and below it moves beneath the copy into a 130px-high area. Preserve wrapping rather than enforcing line counts. Domain data, permissions and dialog state remain outside the presenter.

Token migration (2026-10-23): the module directly consumes --ct- card, heading/body/metadata and action-footer roles, with ref-space-12 for the heading margin. The approved emphasized date combination, 5px row margins and media treatment remain unchanged; no new token definitions. See the [mapping and impact](14-design-tokens.md#featuredactivitycard-mapping-and-batch-six-impact). The existing h4 family/weight discrepancy remains in the separate review register.

### Hero feature panel

A shortcut/invitation to an app feature within a hero. Optional icon, required heading, optional multiline description, followed by an action button related to the feature. Use destination/action semantics according to the existing navigation rules.

Implementation (2026-10-22): `components/shared/HeroFeaturePanel.tsx` and its CSS Module own the content presentation. Use a 24px/1.2 subsection heading, body-role description, optional decorative 38px circular icon treatment and 24px action-footer gap. Heading level is configurable independently of visual size. Supply a shared Button for a local action or ActionLink for navigation. Text wraps naturally without forced line breaks. The parent owns placement, width and any divider within the hero; Meet & Play stacks the panel beneath the hero introduction at 950px and below. Feature state and modal behavior stay with the caller.

Token migration (2026-10-23): the module consumes --ct- heading/body roles and --ct-action-footer-gap directly. Private --_ct-hero-feature-icon-size coordinates the 38px dimensions; decorative paint and 10px spacing stay local. See the [mapping and impact](14-design-tokens.md#herofeaturepanel-mapping-and-batch-five-impact). Existing h4 inherited family/weight differs from h2/h3 and remains unchanged pending the token guide's separate discrepancy review.

### Insight card

Informational only, concerning something concrete such as a metric, activity or calendar date. Scope can be personal, community-wide, app-wide or authorized information about another user's activity. Required category icon, required mood/idea eyebrow, required one- or two-line heading, and required one- or two-line description. Supports standalone or grid placement; full-width layout is not mandatory. This does not authorize new data visibility or access rules.

Implementation (2026-10-22): `components/shared/InsightCard.tsx` and its CSS Module own this informational presentation. The typed API requires icon, eyebrow, heading and description and exposes no action slot. Use shared off-white card background, border, padding and radius, a 30px/1.2 heading, eyebrow and body role tokens. The category icon is decorative alongside text, in the existing 63px sage circle; content uses a 21px internal gap. Content-driven flex wrapping places the icon above copy when space is limited, including narrow grid columns. Heading level is independent of visual size. Do not hard-code line breaks or truncate to enforce line targets. Parent containers own external spacing and grid placement; the shared profile example uses 24px stacked gaps. Sample statistics remain placeholders.

### Guidance note

Succinct suggestions or instructions concerning policies/rules, in community or app-wide contexts. Optional icon and required note body. No eyebrow or heading.

Implementation (2026-10-22): `components/shared/GuidanceNote.tsx` and GuidanceNote.module.css provide a required plain-text body and optional decorative icon, without heading, eyebrow, action or live-region behavior. Preserve the existing transparent surface, 1px dashed #cdd6bf border and 8px radius, with 25px/35px padding (20px at 700px and below). Body uses 13px/1.8 and #53644f; an 18px gap separates a nonshrinking icon aligned with the first line. Body text is left-aligned and wraps naturally. Parent modules own 24px stack separation. This is static editorial guidance, distinct from Notice's contextual states and error recovery.

Token migration (2026-10-23): GuidanceNote.module.css consumes --ct-body-color, --ct-body-font-size and --ct-body-line-height directly. Its approved border and composition stay local; no new component token or shared value change. See the [GuidanceNote mapping](14-design-tokens.md#guidancenote-mapping-and-batch-four-impact).

### Notice — accepted semantic variants, 2026-10-22

A simple, information-only item supplying succinct additional information within a larger context. Review all existing notice usages under this definition, including contextual explanations, championship dates, reservation state and action feedback. Use one Notice component with semantic variants: informational (context/explanation, including championship dates and private-address explanations), positive (confirmed/favorable state or outcome, including confirmed seats), pending (unresolved state, including host approval and waitlists), and caution (information warranting care, including an unverified sample venue). Variant palette and icon rules are approved below. Existing toast/inline recovery requirements remain in force. A notice's visual variant must not automatically determine live announcements or expiry behavior.

Accepted classification refinements: “Get to know each other at a shared table…” belongs to Guidance note. Unfinished-feature placeholders use informational Notice; do not introduce a permanent placeholder variant.

Notice palette and icon requirements are settled below. Earlier generic-callout size/spacing proposals were not approved by accepting these purpose-specific definitions.


#### Notice palette and icons — accepted 2026-10-22

All notice bodies use 13px/1.8 and body color #53644f. Informational: background #eef0eb, icon #6b665e; optional circled information icon by default, with contextual icons such as calendar or lock permitted. Positive: background #e8ede3, icon #224c3a, required circled check. Pending: background #eeeaf2, icon #665578, required static clock. Caution: background #f6ecd9, icon #805b24, required warning triangle. Positive/pending/caution icons cannot be omitted or substituted. Use subtle shared-line borders.

Icons are 20px outlines, nonshrinking, aligned to the first text line, with 10px separation from the body. Omit the slot entirely when informational icons are disabled. Wording must communicate meaning without color or icons; hide redundant icons from assistive technology. Visual variant does not automatically set an alert/live region or expiry; callers preserve appropriate existing announcement behavior.

Calculated body/icon contrast respectively: informational 5.54/4.96, positive 5.34/8.16, pending 5.35/5.64, caution 5.42/5.21 (ratios to 1). Verify rendered text and wrapping as well as palette contrast.

Token extraction (2026-10-23): semantic.css owns the nine --ct-cmp-notice-* variant/background/icon/border contracts; Notice.module.css consumes these and the shared body roles. See the [Notice token mapping](14-design-tokens.md#notice-contract-and-batch-three-impact). Preserve the existing local 14px padding, 17px block margin, 6px corners, 10px gap and first-line icon alignment, including parent placement overrides. This migration changes neither the approved palette nor variant/announcement behavior.

### Existing shared Empty extraction — 2026-10-23

Reuse card background and radius roles. Preserve local 45px 25px padding, 20px outer margin, title margins and #829070 decorative leaf paint; retain global subsection/body typography and the 32px icon. These local measurements do not create a new scale. No behavior or visual refinement.

### Existing shared Tag extraction - 2026-10-23

Tag keeps the approved metadata role (11px/1.8, #6b665e) through direct --ct-meta-* references. Vertical padding uses ref-space-4. The existing default/peach/gold categorical paints, 9px horizontal padding, 5px icon gap, 4px corners and .1px tracking remain local label composition, not general scales or feedback severity roles. No visual redesign or interaction change. See the [mapping and impact](14-design-tokens.md#shared-tag-mapping-and-batch-fourteen-impact).

### Existing shared Avatar extraction - 2026-10-23

Large decorative initials consume --ct-ref-font-family-serif, independently of heading semantics. The existing peach #f5e4d6 is locally owned alongside the other identity tone pairs. Keep normal/large dimensions, initials type, circular geometry, border/ring and caller-specific sizing unchanged. These are identity artwork, not metadata typography or a general size/radius scale. See the [mapping and impact](14-design-tokens.md#shared-avatar-mapping-and-batch-fifteen-impact); future theme classification remains deferred.

### Existing shared Botanical assessment - 2026-10-23

Botanical is decorative currentColor SVG artwork, aria-hidden, with invariant path geometry, stem stroke and leaf opacities. It has no legacy token references to replace. Preserve caller-specific paint, placement, clipping and responsive geometry; no universal decorative color or size is approved here. The [assessment](14-design-tokens.md#shared-botanical-assessment-and-batch-sixteen-impact) records why no new token/module/API is warranted. Caller paint classification for themes remains deferred.

### Existing shared Icon assessment - 2026-10-23

Icon inherits currentColor and preserves its 24 glyphs, dice fallback, default 20px/numeric size API and aria-hidden SVG semantics. Glyph geometry and stroke widths are artwork rather than spacing/border tokens. Actual-purpose color, dimensions and accessible control labels belong to callers. No universal icon-color or size scale is introduced. See the [assessment](14-design-tokens.md#shared-icon-assessment-and-batch-seventeen-impact).

### Existing shared GameArt extraction - 2026-10-23

The seven existing illustration palettes are authoritative in GameArt.module.css, using private background/primary/secondary palette variables. Preserve all original colors, artwork details, Georgia symbols, geometry and slice cropping. These are illustration palettes, not UI surface or feedback roles; existing caller dimensions/masks/transforms remain external. See the [mapping and impact](14-design-tokens.md#shared-gameart-mapping-and-batch-eighteen-impact). No visual redesign or alternate palette is included.

### Existing Sidebar extraction - 2026-10-23

Sidebar uses metadata roles for location, navigation roles for account/personal links and current backgrounds, serif/sans primitives for brand/quote/subtitle, and the stone divider primitive. Local brand metrics, shell paint and mobile selected colors remain unchanged; no new role is inferred from their values. Preserve the existing 1200px bottom-navigation transition and 700px personal navigation, including the unresolved intermediate-width behavior. See the [mapping and impact](14-design-tokens.md#sidebar-mapping-and-batch-nineteen-impact).

### Existing Topbar extraction - 2026-10-23

Topbar uses metadata roles for its breadcrumb/preview caption and existing palette primitives for the divider and notification-dot outline. Preserve local translucent header, emphasized breadcrumb, preview-control typography/paint, indicator colors, notification hover and responsive hiding/wrapping. No new universal shell/action role is introduced. See the [mapping and impact](14-design-tokens.md#topbar-mapping-and-batch-twenty-impact).

### Existing Footer extraction - 2026-10-23

Application Footer uses stone divider and serif-family primitives, with ref-space-8 for icon/copy separation and ref-space-32 for mobile top margin. Preserve its existing #929886 paint, 17px motto, 8px/7px tagline, tracking and other spacing. It is brand copy, not metadata, a content heading or an action footer. See the [mapping and impact](14-design-tokens.md#footer-mapping-and-batch-twenty-one-impact). Existing small-text/contrast review remains deferred.

### Existing app-shell extraction - 2026-10-23

App.module.css uses the forest-800 palette primitive and ref-space-12 for the existing skip-link background/padding. White foreground and shell geometry remain local. Preserve skip-link reveal/focus transfer, content widths/padding and all 700/950/1200/1600px rules. Existing Sidebar/shell breakpoint coordination remains a separate design-review question. See the [mapping and impact](14-design-tokens.md#app-shell-mapping-and-batch-twenty-two-impact).

### Existing global styles extraction - 2026-10-23

index.css directly consumes approved heading/body/metadata, focus-outline and control-duration roles. Paragraph margin uses ref-space-16; native-checkbox accent preserves forest-800 palette use. Keep h1-h3 selector scope, heading metrics, resets and overrides unchanged. Native-field surface/border/radius/padding, placeholder, selection and disabled opacity remain preserved exceptions pending design review, not new standards. See the [mapping and impact](14-design-tokens.md#global-indexcss-mapping-and-batch-twenty-three-impact).

### Remaining App.css extraction - 2026-10-23

Global legacy feature composition consumes approved typography/card/layout roles directly. Decorative serif and divider palette uses remain distinct; peach decoration stays local. Preserve all irregular geometry, compact tabs, search/toggle/error/hover treatments and responsive overrides without promoting them to new standards. See the [mapping and impact](14-design-tokens.md#remaining-appcss-mapping-and-batch-twenty-four-impact). Existing accessibility and theme-classification questions remain deferred.

### Existing Auth extraction - 2026-10-24

Auth uses page/title/compact heading roles, body font size for supplementary links and 12/24px spacing primitives. Its shared error/status banner retains sage-100 palette use rather than positive feedback semantics. Preserve local error color, padding, card/page geometry and shell offsets. See the [mapping and impact](14-design-tokens.md#authcss-mapping-and-batch-twenty-five-impact); contrast and shell coordination remain separate review questions.

### Existing community creation extraction - 2026-10-24

CreateCommunity uses heading/body/meta roles and card roles for its participation panel, plus 4/8/12/24px ordinary spacing primitives. Preserve local fieldset gap, helper offset, summary column gap, width and inherited form cascade; do not reinterpret the fieldset as a card grid. Summary terms stack at 700px unchanged. See the [mapping and impact](14-design-tokens.md#createcommunitycss-mapping-and-batch-twenty-six-impact).

### Existing My Home extraction - 2026-10-24

MyHomeTab uses card, body, eyebrow, metadata metrics and section/grid roles directly. Preserve illustration caption color, icon palette, arch geometry and local offsets; placeholder dividers use the stone primitive. Existing 1100px stacking and 700px illustration hiding remain unchanged. See the [mapping and impact](14-design-tokens.md#myhometab-mapping-and-batch-twenty-seven-impact). No feed behavior is added.

### Existing AccountPanel extraction - 2026-10-24

AccountPanel action rows directly use the established 24px action-footer separation and 12px spacing primitive. Preserve flex wrapping/alignment and the module-scoped premium list zero-bottom-margin override so the footer owns separation. See the [mapping and impact](14-design-tokens.md#accountpanel-mapping-and-batch-twenty-eight-impact).

### Existing UserAccountPage extraction - 2026-10-24

Account-only overrides consume existing body/meta/eyebrow/heading and section-gap roles. Preserve selector specificity, decorative quote and feedback exclusions, visual-heading attributes, wrapping and mobile sizing; community profile styling retains its separate scope. See the [mapping and impact](14-design-tokens.md#useraccountpage-mapping-and-batch-twenty-nine-impact).

### Existing ProfileOverview extraction - 2026-10-24

Shared profile sections use the established 24px section-gap role directly, retaining grid layout, min-width and direct-child panel margin reset. Account and community typography/artwork remain owned by their existing rules. See the [mapping and impact](14-design-tokens.md#profileoverview-mapping-and-batch-thirty-impact).

### Existing My Communities extraction - 2026-10-24

MyCommunitiesTab uses existing body/meta/card roles and section separation, with ordinary 24px card gap and 8px heading margin primitives. Preserve local icon/toolbar gaps, sample-card mobile stacking and account overrides. See the [mapping and impact](14-design-tokens.md#mycommunitiestab-mapping-and-batch-thirty-one-impact).

### Existing owned communities extraction - 2026-10-24

Owned-community heading/paragraph bottom margins use the ordinary 4px spacing primitive. Preserve overflow wrapping and inherited card/account layout; this is not the separate 5px label-to-metadata role. See the [mapping and impact](14-design-tokens.md#ownedcommunities-mapping-and-batch-thirty-two-impact).

### Existing Home extraction - 2026-10-24

Home uses existing typography/card/section/action-footer roles, ordinary spacing primitives and stone dividers. Hero artwork/avatars, local border/shadow/gradient treatments, calendar-event leading and categorical tones retain their values and ownership. Calendar stays horizontally scrollable at a 630px grid minimum; all media overrides remain ordered unchanged. See the [mapping and impact](14-design-tokens.md#home-mapping-and-batch-thirty-three-impact).

MeetPlay extraction (2026-10-24, accepted): section margins and 24px mobile divider inset now use existing tokens. Retain #cfd8c1 divider, 30px desktop inset, 300px feature basis and 950px stacking. This preserves legacy composition, without approving new shared visual standards.

Community extraction (2026-10-24, accepted): member-preview guidance retains its 24px outer section separation via section-gap. No new visual decision, typography, modal or privacy behavior change.

Final token audit (2026-10-24, awaiting review) confirms removal of compatibility aliases, not universal tokenization or visual refinement. Preserve documented local treatments. Residual ordinary spacing candidates, native-field/feedback paints and the existing accessibility review backlog are recorded in docs/14-design-tokens.md; no new visual standards were approved by the audit.

Premium list rhythm (approved 2026-10-24): without the temporary subscription Notice, use list margin:0. The preceding paragraph owns its standard 16px separation; list rows retain 20px vertical padding and the action footer owns 24px separation. No dedicated list-margin token or compensating bottom override is needed.

Premium feature rows (approved 2026-10-24): use the same setting-row presentation as discovery settings: layout, 20px internal gap, row padding/divider, block label and metadata spacing/type, and responsive wrapping. The control is a Manage action instead of a toggle; retain list semantics and the existing outline action styling. Content/control dimensions can naturally affect height and wrapping. List margin remains zero.
