# CSS-native design tokens

Status: architecture approved by the user on 2026-10-23 (D-123). Token batches through FeaturedActivityCard are accepted. PromotionalBanner batch seven is implemented and verified, awaiting review. The [UI style guide](13-ui-style-guide.md) owns visual requirements; this document owns their CSS representation. See [implementation status](12-implementation-status.md) for verification. Other component-family migrations remain gated.

## Ownership and files

- `src/styles/tokens/primitives.css`: raw, reusable palette/family values and the approved general spacing scale.
- `src/styles/tokens/semantic.css`: default light-theme roles, responsive role mappings, and clearly deprecated compatibility names for remaining consumers. A role may contain a direct value when a primitive would add only one-to-one indirection.
- `src/styles/tokens/index.css`: ordered imports of primitives, then semantics. Imported once by `src/index.css` after its external font import and before rules.
- `src/styles/tokens/themes.css`: reserved future responsibility, **not created/imported in this batch**. Alternate themes and their browser fixture are deferred until scoped themes are scheduled.
- `src/index.css`: resets, global element defaults and typography. Existing App.css rules remain until their own approved migration batches. Colocated CSS Modules own component structure, layout, states, responsive composition and private values.

CSS custom properties are the sole token source. No JSON token source, generation, Style Dictionary, Sass, Tailwind, dependencies, cascade layers or universal Card API. There is no existing shared React Card primitive to retrofit. Specialized cards retain independent structure and behavior.

## Naming and admission

| Kind | Grammar | Example |
| --- | --- | --- |
| Primitive | `--ct-ref-<category>-<value-key>` | `--ct-ref-space-12`, `--ct-ref-color-forest-900` |
| Semantic | `--ct-<role>-<property>[-<state>]` | `--ct-body-color`, `--ct-card-padding`, `--ct-action-primary-background-hover` |
| Public component contract, when justified | `--ct-cmp-<family>-<part-or-variant>-<property>[-<state>]` | `--ct-cmp-notice-pending-icon-color` |
| Private component variable | `--_ct-<family>-<part>-<property>` | `--_ct-insight-icon-size` |

Use lowercase kebab case and full CSS property terms: background, color, font-size, line-height, border-radius, box-shadow. `size` can coordinate width/height. Put states last; use hover, pressed, selected, selected-hover, disabled, and current for the current route. Do not add unimplemented states. Role-first naming is shorter than a mandatory `sys/category/role/property` layer while preserving searchable `--ct-ref-`, `--ct-cmp-` and role prefixes. Avoid ambiguous fg/bg/leading abbreviations in new names.

A public token must represent reusable foundations, an independently governed role, or an intentional theme contract. Repetition is evidence, not proof of shared meaning. Do not add a global token just because a literal exists. Direct semantic shadows are preferable to numbered shadow primitives with one consumer; the first batch adds no shadows or elevation scale. Existing specialized shadows remain local pending their own review.

For new components: identify the actual role, choose its complete approved combination below, then use spacing primitives for ordinary composition without a role. Never choose a token solely because it has the wanted number/color. If no existing choice fits, explain the need and ownership before adding a value. Unapproved new raw shared paint, typography, spacing, radius or motion values are discouraged and require a design decision; structural values such as 0, auto, 100%, flex behavior and aspect ratios normally stay CSS. A justified local design exception needs a nearby rationale or a documented component rule, not a global token by default.

Adding a public token requires purpose, owner, value/source, consumers or explicit contract need, theme dependence and verification plan. Changing one requires a direct/transitive consumer-impact analysis, all relevant states/breakpoints/themes and approval of visual changes. Deprecation requires a replacement (or local ownership rationale), migration list, and a removal checkpoint after zero consumers; no indefinite duplicate aliases. Compatibility tokens are forbidden in new component code.

## Foundations versus preserved measurements

| Class | Values and rationale | Treatment |
| --- | --- | --- |
| Approved general spacing | 4, 8, 12, 16, 24, 32px | `--ct-ref-space-<px>`. User-approved compact 4px-based selection: 8/12/24 already serve filter gaps/action groups/stacks; 4/16/32 provide restrained small/medium/large composition choices. Do not generate every multiple of 4. All six are intentional foundation values even before every step has a consumer. |
| Approved shared role measurements | Card padding 27px / 22px at <=1200px; grid gap 18px; row padding 20px; label/meta gap 5px; card radius 9px; control radius 6px and minimum height 43px | Direct semantic values, outside the general spacing scale. Preserve unchanged. |
| Approved typography roles | Body 13, meta 11, eyebrow 9; headings 20/24/30/48 with compact 36 and hero clamp(36px, 4vw, 54px) | Purpose-specific semantic sizes, not an invented mathematical font scale. Preserve px and current root font size. |
| Approved local exceptions | Insight icon 63px and gap 21px; featured media 35%/130px; hero icon 38px; guidance 8px radius and 25px/35px padding (20px mobile); filter 36px minimum height and pill corners | Component ownership; do not add to a global scale. Equal numbers elsewhere do not imply the same decision. |
| Legacy/unresolved values | Existing raw rules and broad `--muted`/`--peach` palette names | Preserve during extraction; classify before migration. Do not create new permanent roles to legitimize them. |

No general radius scale is introduced: card/control roles and circular/pill geometry have distinct purposes. Existing 7px input corners remain local pending the input batch. No arbitrary new palette steps, font sizes or motion scale are added.

## Initial token catalog and legacy mapping

These are definitions/extractions, not approval for broad consumer replacement. The old names below record migration sources; surviving names are deprecated compatibility aliases. Batch two removes the old control/filter/action aliases and --nav-item-hover-bg/active-fg/indicator after their last consumers migrate. --nav-item-active-bg remains for Sidebar. The CSS files remain authoritative; this catalog records role, source and intended use.

### Primitives

| Token suffix after `--ct-ref-` | Value | Evidence/use |
| --- | --- | --- |
| `space-4`, `space-8`, `space-12`, `space-16`, `space-24`, `space-32` | Corresponding px values | Approved 2026-10-23 general scale |
| `color-forest-900` | #173f32 | Approved heading/eyebrow; current navigation |
| `color-forest-800` | #224c3a | Existing primary action/navigation indicator |
| `color-moss-600` | #53644f | Approved body text |
| `color-warm-gray-600` | #6b665e | Approved metadata replacement |
| `color-ivory-50` | #fffef9 | Approved card/filter surface |
| `color-ivory-100` | #f8f7f2 | Existing page surface |
| `color-sage-100` | #e8ede3 | Existing current-navigation surface |
| `color-stone-200` | #e3e5da | Shared default card/filter border |
| `font-family-sans` | 'DM Sans', sans-serif | Existing body font import |
| `font-family-serif` | 'Libre Caslon Display', Georgia, serif | Existing heading family |

Color numbers identify sparse existing palette positions; they do not promise a calibrated perceptual scale or authorize filling missing steps. Unique interaction-state paints may be direct semantic values rather than one-consumer palette aliases.

### Shared roles

All new names in this table carry the `--ct-` prefix. All color/background/border-color roles in the catalog are theme-dependent; spacing, radii, dimensions, type metrics/families and duration are invariant for the initially planned color-theme contract. A future typography/density theme requires separate approval and an expanded contract.

| New suffix | Value/reference | Existing source / purpose |
| --- | --- | --- |
| `page-background` | ref color-ivory-100 | Root #f8f7f2 page background |
| `body-font-family`, `heading-font-family` | ref font-family-sans / serif | Root font-family / `--serif` |
| `body-font-size`, `body-line-height`, `body-color` | 13px / 1.8 / ref color-moss-600 | `--text-body-size/leading/color` |
| `meta-font-size`, `meta-line-height`, `meta-color` | 11px / 1.8 / ref color-warm-gray-600 | `--text-meta-size/leading/color` |
| `eyebrow-font-size`, `eyebrow-line-height`, `eyebrow-color` | 9px / 1.6 / ref color-forest-900 | `--text-eyebrow-size/leading/color`; independent from heading meaning |
| `heading-color` | ref color-forest-900 | `--text-heading-color` |
| `heading-page-font-size`, `heading-page-compact-font-size` | 48px / 36px | `--heading-page-size`, `--heading-page-small-size`; existing consumer chooses compact at <=700px |
| `heading-hero-font-size` | clamp(36px, 4vw, 54px) | `--heading-hero-size` |
| `heading-card-font-size`, `heading-subsection-font-size`, `heading-item-font-size` | 30px / 24px / 20px | Corresponding `--heading-*-size` |
| `heading-title-line-height`, `heading-content-line-height` | 1.1 / 1.2 | Corresponding `--heading-*-leading` |
| `card-background`, `card-border-color`, `card-border-radius` | ref color-ivory-50 / ref color-stone-200 / 9px | `--card-bg`, card use of `--line`, `--card-radius` |
| `card-padding` | 27px; 22px at <=1200px | `--card-padding`; responsive definition stays in semantic.css |
| `section-gap`, `card-grid-gap` | ref space-24 / 18px | `--account-stack-gap`, `--account-grid-gap` |
| `action-footer-gap` | ref space-24 | Approved content-to-action separation; HeroFeaturePanel and FeaturedActivityCard replace their uses of `--account-stack-gap` |
| `list-row-padding-block`, `label-meta-gap` | 20px / 5px | `--settings-row-padding-block`, `--label-metadata-gap` |
| `control-border-radius`, `control-min-height`, `control-transition-duration`, `focus-outline-color` | 6px / 43px / .18s / #ad704c | `--control-radius/height/transition/focus` |
| `filter-background`, `filter-color`, `filter-border-color` | ref color-ivory-50 / ref color-moss-600 / ref color-stone-200 | `--filter-bg/fg/border` |
| `filter-background-hover`, `filter-background-selected`, `filter-color-selected`, `filter-background-selected-hover` | #ecefe5 / #e6ebdc / ref color-forest-900 / #dbe3cf | Existing filter state tokens |
| `action-primary-background`, `action-primary-color`, `action-primary-background-hover` | ref color-forest-800 / #fffdf2 / #153d2b | `--action-primary-bg/fg/hover` |
| `action-outline-border-color` | #cbd3c0 | `--action-outline-border` |
| `action-destructive-background`, `action-destructive-background-hover` | #963e32 / #7b3026 | `--action-destructive-bg/hover` |
| `nav-background-hover`, `nav-background-current`, `nav-color-current`, `nav-indicator-color` | #e7eadf / ref color-sage-100 / ref color-forest-900 / ref color-forest-800 | `--nav-item-hover-bg/active-bg/active-fg/indicator` |

Broad legacy `--ink`, `--green`, `--line`, `--cream`, `--sage` resolve to primitives, not a falsely universal semantic role. `--muted: #747c70` and `--peach: #f5e4d6` remain compatibility-only raw values; their mixed decorative/legacy purposes require consumer classification. Remove unused `--rust` rather than adding an alias with no consumer. Unmigrated globals retain their existing names/behavior through compatibility definitions. Root font/background/body defaults may consume the new roles as part of infrastructure wiring.

### Typography-role matrix

Use the matching size, line-height and color together unless a documented exception applies. Family is inherited from the global body/heading foundations; heading HTML level remains independent from visual role.

| Purpose | Family | Size token suffix | Line-height token suffix | Color token suffix | Weight / other rules |
| --- | --- | --- | --- | --- | --- |
| Body copy | body-font-family | body-font-size | body-line-height | body-color | Normal 400; strong text remains 600 |
| Metadata | body-font-family | meta-font-size | meta-line-height | meta-color | Existing contextual weight |
| Eyebrow | body-font-family | eyebrow-font-size | eyebrow-line-height | eyebrow-color | Uppercase; tracking/weight contextual, not a universal 650 |
| Page title | heading-font-family | heading-page-font-size (compact at <=700px) | heading-title-line-height | heading-color | 400; preserve wrapping and existing tracking |
| Hero title | heading-font-family | heading-hero-font-size | heading-title-line-height | heading-color | 400 |
| Card / subsection / item title | heading-font-family | heading-card/subsection/item-font-size | heading-content-line-height | heading-color | 400 |
| Featured date (intentional exception) | body-font-family | body-font-size | body-line-height | heading-color | 600, approved emphasized date |

Filter labels (12px/1.6/500), control labels, mobile inputs (16px), decorative text and statistics are separate local treatments; do not force them into body or metadata roles. Existing h4 behavior is not silently repaired in the InsightCard token extraction.

## Component ownership and first-batch mapping

InsightCard maps padding/background/radius/border to the card roles; body copy/icon color to body; eyebrow to eyebrow (rather than borrowing heading color); heading to heading-card size/content line height/heading color. Its 12px heading margin uses ref-space-12. The icon's 63px flex basis and height share private `--_ct-insight-icon-size`. Keep 21px gap, 220px wrapping basis, 50% circular corners, decorative #d6e0c9 and 2px tracking local: these govern this composition, not a shared family contract. Preserve values and natural wrapping.

Later batches should directly reuse card/action-footer roles instead of creating aliases per card family. The approved 24px action-footer separation is now --ct-action-footer-gap; the 12px action-group gap should become an independent purpose-based role when its consumers migrate. Both reference spacing primitives. FeaturedActivityCard media geometry, GuidanceNote treatment and ActivityCard shadows remain local; HeroFeaturePanel icon dimensions use a private variable. Notice variant paints are public component contracts because the four approved states are independently governed. No public component token is needed for the initial InsightCard batch.

## Shared controls/filter batch contract and impact

The user authorized batch two after approving the first batch. Button and ActionLink share the action contract; Link owns text-link color, NavItem owns navigation color/state, and FilterChip retains its dedicated state roles. No React/API, selector, specificity, event or routing changes are included. Searches found no external consumers of Controls' old private --action-bg/fg/hover/border variables, so these become --_ct-action-variant-* variables defined on each variant's element. Legacy --nav-item-active-bg remains for Sidebar; 20 other control/filter/action/nav aliases are removed after a zero-consumer search. Existing shared role values do not change.

New semantic suffixes below carry --ct-. These extract current declarations with unchanged values; they are independently governed action/link/nav or focus decisions, not new palette choices. All paint and box-shadow entries join the future complete theme contract; focus geometry remains invariant. Do not infer that equal secondary/outline/ghost hover colors are one permanent role.

| Semantic suffix | Exact value/reference | Source and consumers |
| --- | --- | --- |
| action-primary-border-color | ref color-forest-800 | Existing action border fallback, Button/ActionLink |
| action-secondary-background / color / border-color / background-hover | ref color-ivory-100 / forest-900 / stone-200 / sage-100 | Secondary action's old cream/ink/line/sage |
| action-outline-color / background-hover | ref color-forest-800 / sage-100 | Outline action's old green/sage; transparent background stays local |
| action-ghost-color / background-hover | ref color-forest-900 / sage-100 | Ghost action's old ink/sage; transparent background/border stay local |
| action-destructive-color / border-color | #fff / #963e32 | Preserve white destructive text separately from primary #fffdf2; destructive border keeps its own paint |
| action-box-shadow-hover | 0 3px 10px #224c3a1a | Existing shared action hover shadow, direct semantic value |
| action-box-shadow-pressed | inset 0 1px 3px #173f3230 | Existing shared action press shadow, direct semantic value |
| link-color / nav-color | ref color-forest-900 / ref color-forest-900 | Replace borrowing ink without conflating link/navigation/headings |
| focus-outline-width / focus-outline-offset | 2px / ref space-4 | Existing shared focus ring geometry, Controls and FilterChip |

Retain control typography and local composition values (12px/500 ordinary actions, 11px/600 ghost, 11px small, menu/tab labels; 19px horizontal action padding, 5px/9px ghost spacing, 34px small height, 13px nav gap and existing menu/tab padding). They are existing independently scoped component measurements, not body/meta typography or a new global scale. Use ref-space-12 for existing 12px action gap/padding and ref-space-8 for filter-group gap. Filter icon gap 6px, 36px minimum height, 7px vertical padding, 999px corners, 22px unselected padding and .55 opacity stay local with their existing rationale. Global button opacity .5 is not normalized. Focus geometry, text-link underline metrics and nav indicator geometry retain their exact values.

Verification must compare all five action appearances for Button/ActionLink, ordinary links, current/inactive menu/tab states, small/full/unstyled actions, disabled/loading behavior, filter default/selected/hover/selected-hover, keyboard focus and actual pressed shadows. Compare live Home wrapping/navigation at mobile/tablet/desktop and adjacent 700/950/1200px breakpoints; run relevant tests/build/lint and reference/cycle/unused-alias checks. A temporary local default-light verification page may exercise non-destructive state samples and must be removed before completion; it is not the deferred alternate-theme fixture. Stop for review after this batch.

## Notice contract and batch-three impact

Notice's informational, positive, pending and caution variants are independently governed contextual-message designs, so their paints are public component contracts. Define the following --ct-cmp-notice-* tokens in semantic.css and include all nine in every future theme's complete paint contract. Defaults belong at the token scope, never redeclared as public defaults on a Notice element. Unique paints use direct values; existing reusable primitives supply the others. Do not borrow action, metadata or card semantic roles merely because colors match.

| Suffix after --ct-cmp-notice- | Value/reference | Purpose and existing source |
| --- | --- | --- |
| informational-background | #eef0eb | Informational variant background |
| informational-icon-color | var(--ct-ref-color-warm-gray-600) | Existing #6b665e informational icon |
| positive-background | var(--ct-ref-color-sage-100) | Existing #e8ede3 favorable-state surface |
| positive-icon-color | var(--ct-ref-color-forest-800) | Existing #224c3a check-circle icon |
| pending-background | #eeeaf2 | Pending-state surface |
| pending-icon-color | #665578 | Static clock icon |
| caution-background | #f6ecd9 | Caution-state surface |
| caution-icon-color | #805b24 | Warning-triangle icon |
| container-border-color | var(--ct-ref-color-stone-200) | Existing subtle #e3e5da border across all variants |

Notice.module.css resolves private --_ct-notice-variant-background/icon-color aliases on each variant element, consumes body-font-size/body-line-height/body-color directly and consumes the Notice border contract. No external consumers of the old private --notice-bg/--notice-icon names exist; remove those names without compatibility aliases. The remaining legacy body/line aliases still have other consumers and stay intact. No existing shared token value changes, no new primitive scale, and no further component migration are authorized.

Keep the existing 14px padding, 17px block margin, 6px radius, 10px icon gap and 20px icon geometry local. These are Notice composition/first-line-alignment decisions, not card padding, control corners, generic spacing-scale additions or a new global icon-size contract. Preserve the calc using body metrics and 20px icon height; do not change the TSX icon sizing or API. Preserve custom className/HTML attributes, children, contextual or iconless informational cases, required positive/pending/caution icons, and caller-owned live-region semantics. Numeric equality with another family is not a reason to couple them.

Consumer impact: activity-hosting/reservation notices, Championship static/feedback/dialog notices, Meet & Play advice, community Profile visibility, sample-venue caution and premium placeholders all inherit this CSS Module. Their parent placement overrides, variant selection, data, modal lifecycle and announcement behavior stay unchanged. Verify all four variants plus contextual/iconless, long wrapping content, explicit role/status attributes and real page/dialog contexts using baseline/post computed styles and screenshots; run build/lint/relevant tests and token reference/cycle/unused checks. Any temporary default-light verification page must be removed. Stop for review; alternate themes and their fixture remain deferred.

## GuidanceNote mapping and batch-four impact

GuidanceNote's plain-text copy uses the approved body role. Map --text-body-color to --ct-body-color (#53644f), --text-body-size to --ct-body-font-size (13px), and --text-body-leading to --ct-body-line-height (1.8). Keep the inherited font family and icon color. These are direct uses of existing roles, not new component aliases. No shared token value changes; the legacy aliases remain for other consumers.

The approved local treatment remains ordinary CSS: transparent surface, 1px dashed #cdd6bf border, 8px corners, 25px/35px padding (20px at <=700px), 18px gap and 2px icon alignment padding. These belong to this editorial guidance composition, not card/control geometry or the general spacing scale. Keep the border paint local under the existing ownership decision and review its theme-sensitive treatment when scoped themes are scheduled. No new public contract is needed for this batch.

Both consumers are affected: Meet & Play etiquette and Discussion member-dialog advice. Their parent-owned 24px separation, copy, icon selection, optional-icon behavior, plain-text API and absence of actions/live regions stay unchanged. No route, data, authorization or modal lifecycle code changes. Compare baseline/post computed styles and geometry in both real contexts at mobile/tablet/desktop and both sides of the 700px padding threshold; also cover iconless and long content using a temporary default-light page removed after verification. Run build/lint, relevant tests and undefined-reference/cycle/unused-alias checks, then stop for review.

## HeroFeaturePanel mapping and batch-five impact

Map the heading to --ct-heading-subsection-font-size (24px), --ct-heading-content-line-height (1.2) and --ct-heading-color (#173f32); description to --ct-body-font-size (13px), --ct-body-line-height (1.8) and --ct-body-color (#53644f); icon color to the existing body role. Preserve inherited font families and heading-level behavior. No React markup, API or copy changes.

Introduce --ct-action-footer-gap: var(--ct-ref-space-24) in semantic.css for the approved separation between content and its action footer. HeroFeaturePanel was its first direct consumer, replacing this use of --account-stack-gap. FeaturedActivityCard now shares this independently approved footer role after its own migration batch. This role is distinct from section stacks even though both currently use 24px. It is invariant under the planned color-theme contract; no existing shared value changes. Keep legacy aliases needed elsewhere. Do not introduce the separate action-group role until it has an authorized consumer.

Coordinate width/height with private --_ct-hero-feature-icon-size: 38px on the icon element. Keep the existing local #d8e0cd decorative circle, 50% geometry and 10px icon/description spacing. They belong to this composition; do not borrow card, navigation or Notice roles. Decorative theme treatment remains a later review item. Parent MeetPlay.module.css retains placement, 300px flex basis, 30px divider offset and its 950px transition; none are migrated in this batch.

Consumer impact: the live Meet & Play invitation and its caller-owned Find my people/Update your preferences action. Preserve the shared Button, existing matching dialog, state and conditional label. Verify baseline/post styles and rectangles across mobile/tablet/desktop and both sides of 700/950/1200px, including parent placement. A temporary default-light sample may cover optional icon/description, heading levels, long text and supplied Button/ActionLink semantics; remove it before completion. Exercise keyboard activation, focus and dialog dismissal without submitting preferences. Run build/lint/relevant tests and token reference/cycle/unused checks, then stop for review.

## FeaturedActivityCard mapping and batch-six impact

Use existing --ct-card-background/border-color/border-radius/padding roles for the shared foundation (off-white, #e3e5da border, 9px corners, 27px padding / 22px at <=1200px). Heading uses --ct-heading-card-font-size (30px), --ct-heading-content-line-height (1.2) and --ct-heading-color. Replace the ordinary 12px heading margin with --ct-ref-space-12. Description uses the body combination; date retains the approved exception of body size/line-height with heading color and local weight 600. Special-callout copy uses the complete metadata combination. Replace this action margin's --account-stack-gap with --ct-action-footer-gap (24px).

Keep local 5px date/callout row margins: these are the card's content rhythm, not the label/metadata-row gap contract. Preserve the 35% image width, 130px mobile media height, 700px stacking query, flex behavior, overflow clipping and mask gradient. The gradient's black stop is opacity-mask geometry, not a brand color to tokenize. No new public/private tokens, shared definition changes or compatibility removal; all legacy aliases still have other consumers. Supplied Tag/GameArt/Button styling and the parent Home.module.css stack margin stay unchanged.

Consumer impact: Community Home's featured Halloween invitation. The same presenter also supports events/tables supplied by other callers; this batch changes no data, headings, copy, date formatting, callback, modal or reservation behavior. Compare baseline/post computed styles and rectangles for the real card and optional description/callout/image combinations, long text and heading levels at mobile/tablet/desktop and both sides of 700/1200px. Check keyboard focus and activation, correct details dialog and focus restoration without reserving. Remove any temporary default-light sample before build/lint; run relevant tests and token reference/cycle/unused checks, then stop for review. Alternate themes remain deferred.

## PromotionalBanner mapping and batch-seven impact

Use existing --ct-card-padding/background/border-radius roles for the compact surface: 27px padding (22px at <=1200px), #fffef9 background and 9px corners. There is no border to add. Map the heading to --ct-heading-subsection-font-size (24px), --ct-heading-content-line-height (1.2) and --ct-heading-color; description to the complete body size/line-height/color combination; decorative icon color to body-color. Preserve inherited heading family/weight. These replace the corresponding legacy card and text/heading aliases without new definitions or shared value changes; compatibility aliases remain for other consumers.

Keep the approved 18px internal gap, 7px description margin and 240px copy flex basis local. They govern compact banner composition, not card-grid spacing, label/metadata rows or the 24px action-footer contract. Preserve the 700px action-stacking query, natural wrapping, flex/min/max sizing and parent-owned external separation. No private alias is needed for a measurement used once. The supplied shared Button or navigation action retains its own styling and behavior.

Consumer impact: Community Home's guest-only membership promotion is the only live caller. Keep its optional leaf icon, heading/copy, conditional visibility and mock membership dialog unchanged; this migration does not reconcile legacy commercial copy or implement billing. Verify baseline/post styles and rectangles at mobile/tablet/desktop and both sides of 700/1200px, including parent placement. A temporary default-light sample covers optional icon/description, heading levels, long text and supplied Button/ActionLink semantics. Check keyboard focus, callbacks and opening/dismissing the existing preview dialog without submitting membership actions. Remove temporary samples before build/lint; run relevant tests and undefined-reference/cycle/unused-alias checks, then stop for review. Alternate themes remain deferred.

## Theme correctness — contract only, implementation deferred

Keep the default light theme. Future themes must use curated identifiers at the application root or a community subtree; no arbitrary tenant CSS. Each supported theme boundary, including a nested default-light reset, must explicitly assign the **complete published theme-dependent contract**, including roles whose mappings are unchanged. The current catalog marks every paint role; every future public component paint contract must join that inventory. Before shipping themes, finish classifying legacy palette consumers, local theme-sensitive paint and all action/feedback/dialog states: this first extraction is not complete application-wide theme support.

CSS aliases compute on the element where they are declared, before inheritance. Overriding a referenced semantic token in a child does not recompute an alias inherited from the parent. Therefore map each theme-dependent role directly to invariant primitives (or its approved raw value) at every theme boundary. Rebind any semantic-to-semantic or compatibility aliases on the same boundary if still used; alternatively remove their consumers before enabling themes. Do not override primitive palettes as a substitute for the complete semantic contract.

Application-wide themes go on the root; community themes go on the community boundary. Public component contracts inherit from that boundary: do not redeclare public defaults on the component root and mask inherited overrides. Private component variables may refer to the public contract on the component itself, where resolution occurs in the correct scope. A component-specific default must participate in each supported theme's complete mapping.

Native dialog top-layer rendering does not move its DOM ancestry, so the current in-tree dialog inherits its originating scope. A future React portal/out-of-tree dialog must carry the origin's theme identifier on a per-overlay wrapper that receives the full contract; update it if the origin theme changes, and preserve it for nested overlays. Never switch the entire application theme to style one community dialog. Backdrops and native control color-scheme require explicit review.

No alternate palette, theme selector implementation, dark mode, portal refactor or browser fixture is included now. When scoped themes are scheduled, verify root alternate, nested community alternate, nested default reset, public component contracts, in-tree dialogs and external/nested overlays. Include unchanged-role resets and alias resolution in those tests.

## Extraction, discrepancies and accessibility backlog

Approved standards are the shared roles cataloged above and the style guide's values. Documented intentional exceptions are the component treatments and featured-date combination above. Unresolved discrepancies must stay in this review register, with original rendering intact; they are not new permanent semantic roles:

| Review item | Existing distinction to preserve | Decision needed before refinement |
| --- | --- | --- |
| Borders | Shared #e3e5da versus activity #e2e5d9, hero #dde3d3, banner #dfe5d5 | Intentional surface distinctions or drift? |
| Dialog copy | #7c8a6c versus body #53644f | Classify dialog text before convergence |
| Focus | Search #82956f versus shared #ad704c | Retain separate role or unify after review? |
| Disabled opacity | Global .5 versus filter .55 | Intentional control treatment or drift? |
| Calendar metadata | 1.4 leading versus metadata 1.8 | Density exception or inconsistency? |
| Configurable heading levels | HeroFeaturePanel, FeaturedActivityCard and PromotionalBanner h4 inherit DM Sans/700 while h2/h3 use Libre Caslon Display/400; HeroFeaturePanel/PromotionalBanner remain 24px and FeaturedActivityCard 30px, all at 1.2 line-height | Decide whether family/weight should be normalized across semantic levels. Existing rendering is preserved; no new typography role is introduced. |
| Responsive sidebar | Existing max-1200 rules versus shell 1200/950/700 transitions | Separate layout review; do not repair during tokens |
| Decorative paint/type | Component illustrations, quotes, broad palette names | Deferred variant review; no invented brand identity |

Separate accessibility-review backlog: existing text/icon/placeholder/focus contrast on actual surfaces and states; 9px/11px text at 200% zoom and user text-spacing overrides; 34/36/43px controls and target spacing; disabled readability and focus visibility; dialog keyboard/focus/backdrop treatment. Preserve approved values during extraction and request a design decision for any needed correction. Token migration passing visual checks does not close this backlog.

## Migration and verification gates

1. **Infrastructure + InsightCard (completed and accepted):** baseline computed styles and screenshots for account Overview and community Profile; extract definitions with compatibility aliases; migrate this module only. Check mobile/tablet/desktop, 700px, and both sides of 1200px card padding. Keep existing layout/interaction behavior. Run build, lint, relevant navigation tests, undefined-reference/cycle and unused-alias checks.
2. **Shared controls/filters (completed and accepted):** follow the contract/impact section above; verification is recorded in implementation status.
3. **Notice (completed and accepted):** follow its contract/impact section above; verification is recorded in implementation status.
4. **GuidanceNote (completed and accepted):** follow its mapping/impact section above; verification is recorded in implementation status.
5. **HeroFeaturePanel (completed and accepted):** follow its mapping/impact section above; verification is recorded in implementation status.
6. **FeaturedActivityCard (completed and accepted):** follow its mapping/impact section above; verification is recorded in implementation status.
7. **PromotionalBanner (batch seven, implemented and verified; awaiting review):** follow its mapping/impact section above. Related content presenters and page families still require separate authorization. For each batch inventory direct/transitive consumers, classify each mapping, capture before/after styles/screenshots, exercise relevant hover/focus/pressed/disabled and dialog states, verify breakpoints, build/lint/relevant tests, and update status. Do not combine design corrections with extraction.
8. **Compatibility removal:** after a full source consumer search, remove zero-consumer aliases. Final checks cover CSS and inline custom-property references, undefined values/fallbacks, cycles, valid property types, remaining raw design values, unresolved register entries and unintended visual changes. The six approved spacing primitives may remain without consumers as a deliberately bounded foundation; semantic aliases need actual consumers or an explicit approved contract.
9. **Scoped themes, separately scheduled:** expand the complete contract, resolve/cover theme-sensitive local paints, then implement and test the boundary/overlay cases above. Keep all theme implementation deferred until authorized.

Breakpoints remain literal media queries (700/950/1200/1600px, and existing local 1100px). Native var() does not supply media-query thresholds. Do not change breakpoint behavior or introduce preprocessing.

## Architectural references

- [DTCG 2025.10 format specification](https://www.designtokens.org/tr/2025.10/format/): types, aliases and organization inform the architecture; its JSON storage format is not adopted. This is a community specification, not a W3C Recommendation.
- [Atlassian design tokens](https://atlassian.design/foundations/tokens/design-tokens/): role/state naming and semantic separation. The original requested URL did not return readable content; this official replacement was retrieved during planning.
- [USWDS spacing units](https://designsystem.digital.gov/design-tokens/spacing-units/): disciplined, bounded foundations; its implementation and exact scale are not adopted.
- [CSS custom-property resolution](https://www.w3.org/TR/css-variables-1/#cycles) and [top-layer rendering](https://drafts.csswg.org/css-position-4/#top-layer): browser behavior behind the theme/overlay rules.

The exact --ct- grammar, six spacing steps, direct semantic exceptions, ownership boundaries and migration gates are Crowded Table decisions, not requirements imposed by those references.
