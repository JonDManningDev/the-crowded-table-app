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
