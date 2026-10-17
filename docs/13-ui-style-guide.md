# UI Style Guide

This guide establishes canonical UI patterns for The Crowded Table. Each UI facet has its own second-level section, with detailed conventions nested beneath it. Add future facets as peer sections as their guidelines are agreed upon.

Frontend architecture remains in [frontend patterns](05-frontend-patterns.md); implementation and deployment evidence remains in [implementation status](12-implementation-status.md).

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

- `--action-primary-bg`
- `--action-primary-fg`
- `--action-outline-border`
- `--nav-item-hover-bg`
- `--nav-item-active-bg`
- `--nav-item-active-fg`

Adapt names to the repository's existing token conventions. Do not introduce competing token systems.

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

Use the shared control families in `src/components/primitives/Controls.tsx` with colocated CSS Modules. Extend the existing `:root` tokens in `src/index.css`; do not create a second theme system. Button and ActionLink share action appearance classes/tokens. Navigation selection has independent tokens and an indicator/weight change. Specialized interactive cards, filter chips and icon controls may use the Button's unstyled appearance with their existing component styles. Keep legacy layout hooks during incremental stylesheet migration.

Account tabs are page navigation: use a labeled nav with exact NavItems, not button tabs or ARIA tab roles. Existing in-page view selectors remain pressed-state buttons. Sidebar/mobile community destinations use exact matching. The personal navigation area contains only the account link, with comfortable interior padding; it opens Overview and stays active throughout /account and its descendant routes. My Home and My Communities remain available in the account tabs. The community avatar is a labeled link. Sign in is a text Link; Create Account is an outline ActionLink; Start New Community and premium Manage/Explore are destinations. Modal editing, sign-out, retries, filters and save/send commands remain buttons. Every form submission declares `type="submit"`; Button defaults to `type="button"`.

Do not fabricate disabled anchors. Omit unavailable Manage destinations; show noninteractive explanatory text. While an auth/creation command is pending, replace its optional navigation with noninteractive text rather than allowing an accidental duplicate workflow. After successful commands, programmatic routing remains allowed. Preserve drafts, authentication callback processing and permission boundaries.

Verification must cover native link destinations/new-tab semantics, exact active state and browser history, action versus submit behavior, disabled/loading commands, keyboard focus, responsive navigation, and existing auth/profile/community workflows. Implementation and deployment evidence belongs in [implementation status](12-implementation-status.md).

## Page Layout and Scrolling

Reserve a stable scrollbar gutter on the document root. Switching between short and long pages must not shift the horizontal position of the shared heading, navigation, or content. Keep the shared page container responsible for alignment; do not compensate with tab-specific offsets.
