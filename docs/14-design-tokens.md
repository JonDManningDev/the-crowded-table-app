# CSS-native design tokens

Status: architecture approved by the user on 2026-10-23 (D-123). Token batches through Community are accepted. Final static audit and cascade correction are accepted. Obsolete account-margin cleanup is implemented and verified, awaiting review; active extraction candidates below remain open. The [UI style guide](13-ui-style-guide.md) owns visual requirements; this document owns their CSS representation. See [implementation status](12-implementation-status.md) for verification. Other component-family migrations remain gated.

## Ownership and files

- `src/styles/tokens/primitives.css`: raw, reusable palette/family values and the approved general spacing scale.
- `src/styles/tokens/semantic.css`: default light-theme roles and responsive role mappings. All deprecated compatibility definitions have now been removed. A role may contain a direct value when a primitive would add only one-to-one indirection.
- `src/styles/tokens/index.css`: ordered imports of primitives, then semantics. Imported once by `src/index.css` after its external font import and before rules.
- `src/styles/tokens/themes.css`: reserved future responsibility, **not created/imported in this batch**. Alternate themes and their browser fixture are deferred until scoped themes are scheduled.
- `src/index.css`: resets, global element defaults and typography. App.css retains global composition and documented local/legacy exceptions after its accepted extraction batch. Colocated CSS Modules own component structure, layout, states, responsive composition and private values.

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

These are definitions/extractions, not approval for broad consumer replacement. The old names below record migration sources; surviving names are deprecated compatibility aliases. Batch two removes the old control/filter/action aliases and --nav-item-hover-bg/active-fg/indicator after their last consumers migrate. Batch nineteen removes --nav-item-active-bg and --muted after their last Sidebar consumers migrate. The CSS files remain authoritative; this catalog records role, source and intended use.

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

Batch twenty removes --cream after its final Topbar consumer migrates. Batch twenty-three removes --green after its final native-checkbox consumer migrates. Broad legacy `--ink`, `--line`, `--sage` resolve to primitives, not a falsely universal semantic role. `--peach: #f5e4d6` remains compatibility-only; its mixed decorative/legacy purposes require consumer classification. Batch nineteen removes --muted and retains its sole account-small treatment locally as #747c70. Remove unused `--rust` rather than adding an alias with no consumer. Unmigrated globals retain their existing names/behavior through compatibility definitions. Root font/background/body defaults may consume the new roles as part of infrastructure wiring.

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

## ActivityCard mapping and batch-eight impact

ActivityCard in components/Activity.tsx now owns its presentation through ActivityCard.module.css. Only its exclusive rules moved from App.css, with replacement class hooks; its native unstyled Button, markup, props, onOpen and seat-label logic are unchanged. Shared card-grid, host/location/availability helpers, dots, Avatar and GameArt remain with other consumers. The card's local host/location/status rules retain the same declarations while consuming tokens directly; ActivityDialog and other helpers are not migrated.

Reuse --ct-card-background/border-radius/padding (including 22px at <=1200px). Heading uses the card size, content line-height and heading color; schedule/location/footer use the metadata combination; host uses body size/line-height/color. Use ref-space-8 for the schedule gap, ref-space-4/8 for category padding and ref-space-16 for location separation. These are ordinary composition, not list-row or action-footer roles. Date-stamp serif uses the raw family primitive: its 24px numeral/9px month and category's 9px label are local decorative typography, not subsection/eyebrow semantics. Preserve inherited family, weight, line-height and tracking.

Keep #e2e5d9 border (already in the discrepancy register), base/hover shadows, -4px hover lift, artwork dimensions (168px default, 205px at >=1600px, 145px at <=1200px, 175px at <=950px and 200px at <=700px), label/date paints and corners, stamp offsets, 9px/11px content rhythm, 13px footer divider inset, and availability green local. These govern the interactive card composition; shadows do not need numbered primitives or public aliases. Full-status gray uses metadata color; dots retain the existing shared utility treatment. Preserve inherited global button transition/focus behavior and the existing global reduced-motion override. No new token definitions, shared-value changes or compatibility removals. Theme treatment of local paint remains deferred with the existing contract backlog.

Consumer impact: official-event cards on Community Home and community-hosted cards on Meet & Play. Parent grids/filtering, private-location labels, host attribution, full/open seats, confirmed/requested/waitlisted labels and details-dialog behavior must match. Verify before/after styles/geometry on both routes and isolated state/content samples at mobile/tablet/desktop and adjacent 700/950/1200px thresholds; also check the 1600px artwork threshold. Cover default, hover, pointer/keyboard activation, focus and dialog dismissal/restoration. Use temporary local samples for status combinations and callbacks without reserving or changing data. Check surviving shared helper consumers for regression, remove samples, run build/lint/relevant tests and reference/cycle/unused checks, then stop for review.

## ActivityDialog mapping and batch-nine impact

Move exclusive detail artwork/grid, reservation facts/meter/price/privacy, host-request list, chat container/form and preview-checkout rules from App.css to ActivityDialog.module.css. Replace only ActivityDialog class hooks in Activity.tsx; ActivityCard and all event handlers/conditions remain unchanged. Shared Modal/ui.module.css, Controls, Notice, Avatar, GameArt and global helpers still used by Discussion/profile/account views retain their existing definitions. Copy only the helper declarations needed for the dialog's own host, description, eyebrow, metadata, tags and chat-message composition, then consume semantic tokens by purpose.

Use card background/radius/padding for the reservation panel; card/subsection heading and content-leading roles for titles; body for prose, hosts, facts and request labels; metadata for secondary facts, status explanation, chat context, request metadata and privacy copy; eyebrow roles for category. Preserve fact weight 500. Request rows use list-row-padding-block and label-meta-gap; fact detail uses label-meta-gap. Use ref-space-4/8/12/24 for existing ordinary composition (price-caption gap, chat/privacy gaps, title margin/message padding, description margin). Divider #e3e5da uses the stone primitive because no shared divider semantic role is established. Price remains local 31px display typography using the serif primitive; its caption uses the body family and metadata metrics. The 11px chat input is local control text, not metadata typography.

Retain the 1.3fr/1fr grid and 30px gap, 225px artwork/7px corners/28px separation (180px/20px at <=700px), reservation-first mobile order, min-width constraints, 25px/30px section rhythm, local meter geometry/paints, fact-icon paint/17px width and chat-message surface/7px corners/avatar sizing. These existing local design decisions do not require public contracts or new scales; their theme treatment remains deferred. Baseline computation showed the old .danger #aa7055 declaration was overridden by the shared ghost action color (#173f32); remove that ineffective hook instead of activating it when moving CSS. Cancellation continues using the existing ghost action contract. No shared values or aliases change. Do not change the generic Modal's existing #7c8a6c direct-paragraph discrepancy; ActivityDialog's nested copy already uses approved body/metadata roles.

Consumer impact: App's existing lazy ActivityDialog, opened from official/table cards, featured invitation, calendar and other activity selectors. Preserve selected-item identity, native modal lifetime/focus, default/guest/special/full reservation states, pending/confirmed/waitlisted notices and cancellation, host request pending/accepted/declined/empty/full states, private-address visibility, conditional chat and blank-message handling. Preserve the clearly labeled preview checkout; this batch does not implement payment or settle domain rules. Capture baseline/post computed styles for live dialogs and isolated states across mobile/tablet/desktop and 700/950/1200px boundaries; verify hover/focus/pressed/disabled controls, keyboard activation, focus restoration and responsive scrolling. An isolated temporary fixture may use useMockState for synthetic mutations; remove it before checks. Compare retained global rules and shared consumers, run build/lint/relevant tests and token reference/cycle/unused checks, update status, then stop for review.

## Shared Modal mapping and batch-ten impact

Keep Modal in components/ui.tsx and its existing ui.module.css ownership. Replace shell/header --card-bg with --ct-card-background and content --card-padding with --ct-card-padding: this is the existing shared elevated content-surface/padding contract, including 22px at <=1200px. The title consumes --ct-heading-card-font-size, --ct-heading-content-line-height and --ct-heading-color. These are approved role mappings; inherited heading family/weight/tracking remain unchanged.

Replace broad --ink with --ct-ref-color-forest-900 for the shell's inherited default foreground and --line with --ct-ref-color-stone-200 for its header divider. These preserve palette use without claiming that every child is heading text or that a divider is a card outline. No shared semantic values or aliases change; surviving aliases retain other consumers.

Documented local treatments: default 560px/wide 950px caps, 30px/35px viewport allowances, 90dvh scroll limit, sticky header/z-index 5, header 18px 25px padding (15px 18px at <=700px), 15px gap, 12px shell corners, 20px direct-h3 separation, shadow and blurred translucent backdrop. These govern this dialog shell, not a general spacing/radius/elevation scale. Preserve them as ordinary CSS, with no new public or private custom properties. Unresolved discrepancies: outer border #e4e7d9 and direct-paragraph #7c8a6c remain local pending visual review. The broad inherited foreground and local shell paints require explicit classification in the future complete theme contract; extraction does not claim scoped-theme readiness.

Consumer impact: App activity/membership/notification dialogs; Meet & Play, Championship, Discussion/community and Profile dialogs; account-profile editor. Verify representative wide activity, default prose and default form consumers and isolated long-content/long-title samples. Compare shell, backdrop, header/title, content, close control and children at mobile/tablet/desktop and either side of 700/1200px; include the consumer's 950px boundary. Check overflow/sticky scrolling, focus/keyboard activation, close/Escape/backdrop callbacks and focus restoration, disabled form controls and content clicks. Keep temporary samples local and remove before build/lint/tests. Existing global icon-button/focus/reduced-motion styles and Modal handlers remain untouched. Check unchanged unrelated rules, token references/cycles/unused aliases, update status and stop for review.

## Shared Tabs mapping and batch-eleven impact

Tabs in components/ui.tsx remains a controlled local-view selector composed of unstyled Buttons with aria-pressed; it is not an ARIA tablist or route navigation. Account navigation imports only the shared container class and continues using NavItem links with aria-current. Keep selectors, specificity, source order, callbacks, legacy tabs/active class hooks and markup unchanged.

Add three public component paint contracts in semantic.css. These extract existing repeated state decisions for the Tabs family across five community pages; they are not metadata typography, route-current navigation, action or filter roles. All three join every future theme boundary's complete paint contract, assigned there directly to invariant primitives (never public defaults on the component root). Default light values remain exactly as rendered:

| Contract | Value/reference | Existing declaration and purpose |
| --- | --- | --- |
| --ct-cmp-tabs-item-color | var(--ct-ref-color-warm-gray-600), #6b665e | .tabs button color: var(--text-meta-color); inactive local-view control label |
| --ct-cmp-tabs-item-color-selected | var(--ct-ref-color-forest-800), #224c3a | .tabs button.active color: var(--green); selected control label |
| --ct-cmp-tabs-indicator-color-selected | var(--ct-ref-color-forest-800), #224c3a | .tabs button.active border-color: var(--green); selected underline, independently governed from label paint |

Replace container --line with --ct-ref-color-stone-200: this is a divider, not a card outline. Replace --account-stack-gap with --ct-section-gap for navigation-to-content separation; use ref-space-24 for ordinary inter-item composition and ref-space-12 for existing mobile button top padding. No existing token value changes and no compatibility alias is removed while other consumers remain. Account links inherit only the container changes, retaining their existing nav roles and 12px label treatment.

Local measurements remain CSS: 15px/13px button padding, 12px default and 11px <=950px labels, weight 500, inherited line-height/family, 2px underline, transparent inactive border, wrapping/no-wrap behavior, 19px <=950px and 22px <=700px gaps. These are existing control composition, not body/metadata typography or a new spacing scale. Existing App.css compact section-heading treatment (surface/selected surface/shadow/corners/3px inset, zero gap, 10px labels with 6px 16px padding; 9px and 6px 10px at <=700px), Profile treatment (16px gap/10px labels at <=1200px and top-margin adjustment), and account container override remain owned by their existing consumers. Their future theme-sensitive paints and accessibility review stay separate; do not normalize them or add invented hover/pressed/disabled states.

Consumer impact: Home Upcoming/Calendar; Meet & Play Find a Table/My Tables; Championship's five views; Discussion's four views; Profile's outer three and nested activity-history views; account's four route links sharing only the container. Capture actual consumer baselines for default/selected combinations, compact/Profile variants, wrapping, account destinations and font-loaded geometry at mobile/tablet/desktop and adjacent 700/950/1200px boundaries. Verify pointer/Enter/Space selection, keyboard focus/Tab order, repeated selection and parent content changes. Test hover and actual pressed paint; Tabs has no disabled/loading API. Isolated local samples may exercise callback counts/long labels without backend writes, and must be removed before checks. Compare surviving styles and Modal/other presenters, run build/lint/relevant tests and undefined/cycle/unused-alias checks, then update status and stop for review.

## Shared Heading mapping and batch-twelve impact

Heading in components/ui.tsx retains its existing page-heading hook, CSS Module, eyebrow div, h1 with data-heading="page", optional paragraph and optional caller-supplied action. The local Heading variables used to select HTML levels inside specialized cards are unrelated and remain unchanged. Keep all selectors/source order, account-page overrides and inherited global heading/eyebrow foundations; this batch does not migrate index.css/App.css or duplicate their desktop typography rules.

Replace eleven module references by purpose: paragraph --text-body-color/size/leading to --ct-body-color/font-size/line-height; <=700px --account-stack-gap to --ct-section-gap; title --heading-page-size, --heading-title-leading and --text-heading-color to --ct-heading-page-font-size, --ct-heading-title-line-height and --ct-heading-color; eyebrow --text-eyebrow-size/leading/color to --ct-eyebrow-font-size/line-height/color; final mobile title --heading-page-small-size to --ct-heading-page-compact-font-size. Preserve the later 36px rule's override of the earlier 48px mobile declaration rather than restructuring the cascade during extraction. No new tokens, shared definition changes or zero-consumer aliases arise.

Approved roles remain page title 48px/1.1, compact 36px/1.1, body 13px/1.8/#53644f and eyebrow 9px/1.6/#173f32. Existing serif family/400 weight, title tracking/margins and global eyebrow weight/margin remain global foundations. Preserve local 20px flex gap, 31px desktop bottom margin, 1.5px mobile eyebrow tracking and direct-action 10px label/8px 10px padding/37px minimum height. These are existing component composition measurements, not list-row padding, a general spacing/type scale or new public contracts. Mobile layout retains column order, start alignment, 24px separation and action shrink protection. The 31px heading separation versus the general 24px section rule remains a review question, with existing rendering preserved; this batch does not approve a new shared spacing role.

Consumer impact: all five community pages (including guest/member Home title), account's four views (Overview alone supplies its signed-in action) and Premium Features. Account's more specific heading/eyebrow rules retain ownership until its own migration. Verify actual route headings and isolated no-description/no-action, rich-description, long accented title/eyebrow and enabled/disabled action samples across mobile/tablet/desktop and adjacent 700/950/1200px shell boundaries. Compare loaded fonts, text, typography, geometry, wrapping, heading-to-content spacing and action placement. Check that existing actions still open the same dialogs and close without mutation; exercise callback samples locally. Preserve disabled semantics and heading hierarchy. Remove temporary samples, compare unrelated module rules and shared definitions, run build/lint/relevant tests and reference/cycle/unused checks, update status and stop for review.

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
| Borders | Shared #e3e5da versus activity #e2e5d9, hero #dde3d3, banner #dfe5d5, Modal #e4e7d9 | Intentional surface distinctions or drift? |
| Dialog copy | #7c8a6c versus body #53644f | Classify dialog text before convergence |
| Focus | Search #82956f versus shared #ad704c | Retain separate role or unify after review? |
| Disabled opacity | Global .5 versus filter .55 | Intentional control treatment or drift? |
| Calendar metadata | 1.4 leading versus metadata 1.8 | Density exception or inconsistency? |
| Configurable heading levels | HeroFeaturePanel, FeaturedActivityCard and PromotionalBanner h4 inherit DM Sans/700 while h2/h3 use Libre Caslon Display/400; HeroFeaturePanel/PromotionalBanner remain 24px and FeaturedActivityCard 30px, all at 1.2 line-height | Decide whether family/weight should be normalized across semantic levels. Existing rendering is preserved; no new typography role is introduced. |
| Responsive sidebar | Existing max-1200 rules versus shell 1200/950/700 transitions, including intermediate-width personal-navigation availability | Separate layout review; do not repair during tokens |
| Sidebar mobile selection | Local #e3eada background/#2b5139 foreground versus generic navigation roles | Classify the mobile distinction before theme mapping; retain existing paint during extraction |
| Heading separation | Existing shared Heading 31px desktop bottom margin versus 24px mobile/general section spacing | Decide whether the desktop page-introduction rhythm is intentional before normalization |
| Decorative paint/type | Component illustrations, quotes, broad palette names | Deferred variant review; no invented brand identity |

Separate accessibility-review backlog: existing text/icon/placeholder/focus contrast on actual surfaces and states; 9px/11px text at 200% zoom and user text-spacing overrides; 34/36/43px controls and target spacing; disabled readability and focus visibility; dialog keyboard/focus/backdrop treatment. Preserve approved values during extraction and request a design decision for any needed correction. Token migration passing visual checks does not close this backlog.

## Migration and verification gates

1. **Infrastructure + InsightCard (completed and accepted):** baseline computed styles and screenshots for account Overview and community Profile; extract definitions with compatibility aliases; migrate this module only. Check mobile/tablet/desktop, 700px, and both sides of 1200px card padding. Keep existing layout/interaction behavior. Run build, lint, relevant navigation tests, undefined-reference/cycle and unused-alias checks.
2. **Shared controls/filters (completed and accepted):** follow the contract/impact section above; verification is recorded in implementation status.
3. **Notice (completed and accepted):** follow its contract/impact section above; verification is recorded in implementation status.
4. **GuidanceNote (completed and accepted):** follow its mapping/impact section above; verification is recorded in implementation status.
5. **HeroFeaturePanel (completed and accepted):** follow its mapping/impact section above; verification is recorded in implementation status.
6. **FeaturedActivityCard (completed and accepted):** follow its mapping/impact section above; verification is recorded in implementation status.
7. **PromotionalBanner (completed and accepted):** follow its mapping/impact section above; verification is recorded in implementation status.
8. **ActivityCard (completed and accepted):** follow its mapping/impact section above; verification is recorded in implementation status.
9. **ActivityDialog (completed and accepted):** follow its mapping/impact section above; verification is recorded in implementation status.
10. **Shared Modal (completed and accepted):** follow its mapping/impact section above; verification is recorded in implementation status.
11. **Shared Tabs (completed and accepted):** follow its mapping/impact section above; verification is recorded in implementation status.
12. **Shared Heading (completed and accepted):** follow its mapping/impact section above. Related shared primitives and page families still require separate authorization. For each batch inventory direct/transitive consumers, classify each mapping, capture before/after styles/screenshots, exercise relevant hover/focus/pressed/disabled and dialog states, verify breakpoints, build/lint/relevant tests, and update status. Do not combine design corrections with extraction.
13. **Shared Empty (completed and accepted):** follow the batch-thirteen mapping below.
14. **Shared Tag (completed and accepted):** follow the batch-fourteen mapping below.
15. **Shared Avatar (completed and accepted):** follow the batch-fifteen mapping below.
16. **Shared Botanical (completed and accepted):** no substitution warranted; follow the batch-sixteen assessment below.
17. **Shared Icon (completed and accepted):** no substitution warranted; follow the batch-seventeen assessment below.
18. **Shared GameArt (completed and accepted):** follow the batch-eighteen mapping below.
19. **Sidebar (completed and accepted):** follow the batch-nineteen mapping below.
20. **Topbar (completed and accepted):** follow the batch-twenty mapping below.
21. **Footer (completed and accepted):** follow the batch-twenty-one mapping below.
22. **App shell (completed and accepted):** follow the batch-twenty-two mapping below.
23. **Global index.css (completed and accepted):** follow the batch-twenty-three mapping below and stop for review.
24. **Remaining App.css (completed and accepted):** follow the batch-twenty-four mapping below and stop for review.
25. **Auth.css (completed and accepted):** follow the batch-twenty-five mapping below and stop for review.
26. **CreateCommunity.css (completed and accepted):** follow the batch-twenty-six mapping below and stop for review.
27. **MyHomeTab (completed and accepted):** follow the batch-twenty-seven mapping below and stop for review.
28. **AccountPanel (completed and accepted):** follow the batch-twenty-eight mapping below and stop for review.
29. **UserAccountPage (completed and accepted):** follow the batch-twenty-nine mapping below and stop for review.
30. **ProfileOverview (completed and accepted):** follow the batch-thirty mapping below and stop for review.
31. **MyCommunitiesTab (completed and accepted):** follow the batch-thirty-one mapping below and stop for review.
32. **OwnedCommunities (completed and accepted):** follow the batch-thirty-two mapping below and stop for review.
33. **Home (accepted):** follow the batch-thirty-three mapping below and stop for review.
34. **MeetPlay (accepted):** follow the batch-thirty-four mapping below and stop for review.
35. **Community (accepted):** follow the batch-thirty-five mapping below and stop for review. Final compatibility alias removed after its last consumer migrated.
36. **Final token audit (completed; awaiting review):** after a full source consumer search, remove zero-consumer aliases. Final checks cover CSS and inline custom-property references, undefined values/fallbacks, cycles, valid property types, remaining raw design values, unresolved register entries and unintended visual changes. The six approved spacing primitives may remain without consumers as a deliberately bounded foundation; semantic aliases need actual consumers or an explicit approved contract.
37. **Scoped themes, separately scheduled:** expand the complete contract, resolve/cover theme-sensitive local paints, then implement and test the boundary/overlay cases above. Keep all theme implementation deferred until authorized.

Breakpoints remain literal media queries (700/950/1200/1600px, and existing local 1100px). Native var() does not supply media-query thresholds. Do not change breakpoint behavior or introduce preprocessing.

## Architectural references

- [DTCG 2025.10 format specification](https://www.designtokens.org/tr/2025.10/format/): types, aliases and organization inform the architecture; its JSON storage format is not adopted. This is a community specification, not a W3C Recommendation.
- [Atlassian design tokens](https://atlassian.design/foundations/tokens/design-tokens/): role/state naming and semantic separation. The original requested URL did not return readable content; this official replacement was retrieved during planning.
- [USWDS spacing units](https://designsystem.digital.gov/design-tokens/spacing-units/): disciplined, bounded foundations; its implementation and exact scale are not adopted.
- [CSS custom-property resolution](https://www.w3.org/TR/css-variables-1/#cycles) and [top-layer rendering](https://drafts.csswg.org/css-position-4/#top-layer): browser behavior behind the theme/overlay rules.

The exact --ct- grammar, six spacing steps, direct semantic exceptions, ownership boundaries and migration gates are Crowded Table decisions, not requirements imposed by those references.

## Shared Empty mapping and batch-thirteen impact

Replace only Empty's card-bg/card-radius aliases with ct-card-background/ct-card-border-radius. Preserve its 45px 25px padding, 20px outer margin, title margins and local #829070 inherited decorative leaf paint; these are local empty-state composition, not general scales or metadata color. Global h3/body foundations and the 32px decorative icon remain unchanged. Consumers are Home calendar, Meet & Play filtering, Championship matches, Discussion topics/members and Profile activity. No new tokens or shared values. Verify representative filtered states at shell boundaries and preserve caller filtering/restoration; stop after checks for review.

## Shared Tag mapping and batch-fourteen impact

Replace the five metadata alias references in ui.module.css's Tag rules with --ct-meta-color/font-size/line-height: these spans describe interests, categories and statuses, rather than actions or filter controls. Replace only the 4px vertical padding with --ct-ref-space-4. Preserve 9px horizontal padding, 5px icon gap, 4px corners and .1px tracking as existing local label composition; equal measurements do not make corners spacing or the icon gap a label-to-metadata relationship. No new public/private contracts or shared definition changes are needed.

Keep the default #e9eee3, peach #f5e7d9 and gold #f2e8c9 backgrounds locally owned. These existing categorical treatments are not feedback severity roles; their broader semantic meaning and future theme mappings remain deferred rather than inventing permanent status semantics. Before scoped themes ship, classify these local paints alongside inherited foreground and all caller overrides. Preserve the tone:string API, legacy and module class hooks, selector specificity, span semantics, child icons, wrapping and max-width. Parent-owned host offsets, mobile post typography and leaderboard/activity-row padding, account metadata overrides and tag-group layout stay unchanged.

Consumer impact includes Home's featured invitation, Championship labels/results/finals/history, Discussion posts/members/recommendations/local spots, Profile interests/activity/membership, account profile and ActivityDialog categories. Capture default/peach/gold and icon-bearing consumers before/after at mobile/tablet/desktop and adjacent 700/950/1200px boundaries. Verify contextual overrides/wrapping and dialog opening/closing without domain mutations. Tag has no independent interactive or disabled state; preserve parent interaction and semantics. Run build/lint/tests, compare unrelated rules and token definitions, check undefined references/cycles/unused aliases, update status and stop for review.

## Shared Avatar mapping and batch-fifteen impact

Replace large Avatar's --serif with --ct-ref-font-family-serif: initials are decorative identity artwork, not a heading. Classify its --peach use as a locally owned decorative tone and retain the exact #f5e4d6 value beside the other three tone pairs. This removes a mixed-purpose compatibility dependency without inventing a shared semantic role. No new tokens or existing definition changes; --serif/--peach still have other consumers.

Preserve base 35px and large 90px dimensions, 11px/33px initials, inherited leading, weight 600, .3px tracking, circular geometry, 2px/4px border widths, #fffdf4 border and large 0 0 0 1px #e4e2d5 ring. Preserve base fallback #e8d6c5/#735441, sage #e0e8d9/#496247, peach #f5e4d6/#935c3f, gold #f2e6bd/#866927 and lavender #e7e1ed/#705d83. These local identity treatments are not metadata, feedback, card, control or spacing roles. Their future theme classification remains deferred alongside other local decorative paint.

Keep name-derived tone selection, explicit tone override, initials generation (including You -> AM), aria-hidden span semantics and legacy/module hooks unchanged. Consumers include activity host/request/chat, Championship rows/finalists, Discussion author/member/recommendation/dialog, community Profile and account Overview. Caller-owned compact avatar dimensions/type and member/profile placement retain ownership; Home's separate avatar-stack artwork and shell avatar links are not this presenter. Verify all four explicit tones, automatic selection, unknown-tone fallback, normal/large sizes and initials samples in a temporary default-light fixture, plus actual Profile/dialog and activity-host consumers across responsive boundaries. Remove the fixture before build/lint/tests; compare unrelated styles, scan token references/cycles/unused aliases, update status and stop for review.

## Shared Botanical assessment and batch-sixteen impact

No token substitution is warranted in Botanical itself: the SVG already uses currentColor and contains no legacy custom-property references or raw palette values. Keep the 120x200 viewBox, path coordinates, five leaf-group transforms, 2-unit stem stroke, .17/.28 leaf opacity, fill/stroke inheritance and aria-hidden semantics as artwork, not global design tokens. Add only an ownership comment; no module or private variables are needed for invariant SVG geometry.

Preserve the botanical class hook. Sidebar quote, Home scene, Meet & Play banner, Championship hero/warm panel, Discussion hero, Profile/account summary and the legacy membership prompt own their contextual colors, dimensions, offsets, transforms, opacity and responsive changes. Do not move these differently governed compositions into a universal Botanical API or assign body/heading roles to their decorative paints. Contextual paint/theme classification stays with each caller's future migration and the existing decorative-paint review register; this assessment does not claim those callers are migrated or theme-ready.

Verify actual community routes and responsive boundaries, including sidebar visibility, clipped hero artwork and both Championship instances; inspect account and membership-prompt placement where reachable without mutation. Compare computed SVG/path paint, opacity, geometry, transforms and accessibility attributes. Confirm no source behavior or stylesheet change, run build/lint/relevant tests and token reference/cycle/unused checks, record coverage limits, and stop for review. This is an intentional no-substitution batch under the admission rules, not approval of new visual values.

## Shared Icon assessment and batch-seventeen impact

No token substitution is warranted: Icon has no legacy property references or palette literals. Preserve currentColor stroke inheritance, fill none, the 24x24 viewBox, 1.6-unit stroke with round caps/joins, dice's 3-unit pip stroke and all 24 glyph definitions. These are artwork geometry, not a border/motion/spacing scale. Keep default size 20 and the numeric size prop applied to width/height, including arbitrary existing caller measurements; do not force icons onto the spacing scale or introduce a token/API solely to replace this contract. Preserve name:string and unknown-name dice fallback, aria-hidden and current focus behavior.

Caller controls, navigation, Notice, cards, tags, headings, metadata and illustrations own actual-purpose paint, layout and accessible labels. Global SVG flex-shrink behavior stays global. Icon should inherit their semantic colors rather than create a universal icon-color role. Caller-local sizes and theme-sensitive paint remain their owners' responsibility, including legacy callers not yet migrated. No new module, token, dependency or component refactor; add only an ownership comment.

Verify all glyphs/default size/fallback and representative explicit sizes in a temporary default-light sample, plus actual Home/navigation and activity-dialog icons at mobile/tablet/desktop and adjacent 700/950/1200px boundaries. Compare SVG and child geometry, computed stroke/fill, sizing, visibility and aria-hidden. Check parent dialog opening/closing without mutation. Remove sample files before build/lint/tests, scan token references/cycles/unused aliases, record coverage limitations and stop for review. This is a no-substitution assessment under the admission rules, not a new visual standard.

## Shared GameArt mapping and batch-eighteen impact

Move the seven TypeScript palette triples into GameArt.module.css as private --_ct-game-art-palette-background, --_ct-game-art-palette-primary-color and --_ct-game-art-palette-secondary-color variables. Each module-scoped art variant assigns all three on the artwork root; SVG fill/stroke attributes consume them. They coordinate repeatedly used illustration colors across shapes and are independently owned by this artwork, not application surface/text/feedback roles or public theme contracts. Keep the existing Art union, type/className API and legacy game-art/art-* hooks; append the variant's module class without changing selector order elsewhere. No global token or primitive changes.

Preserve exact background/primary/secondary triples: azul #e8bc80/#19636b/#ce6c49; birds #d7dfd0/#f8f0de/#b6744e; rpg #253c35/#b18050/#e3c28b; social #c17956/#efe0b9/#374d41; rail #e2c294/#3f6058/#a8513a; forest #8b9e81/#355747/#eadcb9; mystery #463c48/#a88466/#e7c699. CSS becomes the authoritative palette source. Retain local wrapper fallback #e1dcc9 and fixed detail colors (#f4ead7/#e8c482 tile details, #658888 bird alternate, #253c35 eyes, #5e5544 legs, #577660 trees). Detail values are artwork, not shared roles; numerical equality with palette values does not establish shared governance. Preserve Georgia/40 text and ?, spade, 20 symbols, all paths/transforms/opacity, 480x280 viewBox, slice cropping and aria-hidden. Invariant illustration palettes remain local when future color themes are scheduled; changing that policy requires separate art review.

Consumers: Home hero/featured invitation, ActivityCard/ActivityDialog, Championship hero/champions/dialog, Discussion recommendations/places/dialog, Profile activity and shared profile favorites (including account). Their dimensions, transforms, masks, corners and responsive overrides remain unchanged. Verify all seven variants in wide/square/narrow containers plus actual Home and activity-dialog artwork at mobile/tablet/desktop and adjacent 700/950/1200px boundaries. Compare every shape's computed fill/stroke, geometry, typography, wrapper/SVG bounds and cropping; check dialog activation/closing without mutations. Remove temporary samples before build/lint/tests, verify only planned source changes and token references/cycles/unused aliases, update status and stop for review.

## Sidebar mapping and batch-nineteen impact

Sidebar.module.css replaces three --line divider references with --ct-ref-color-stone-200; two --serif brand/quote references with --ct-ref-font-family-serif (neither is a content heading); the subtitle font literal with --ct-ref-font-family-sans; location's three metadata references with --ct-meta-font-size/color/line-height; two --ink navigation foreground references with --ct-nav-color; and two --nav-item-active-bg references with --ct-nav-background-current. Retain the currently unrendered account-small rule's #747c70 locally instead of promoting --muted into a role. Remove --nav-item-active-bg and --muted definitions after their last consumers migrate; no other definitions change.

Keep the original stylesheet cascade, including successive <=1200px rules culminating in fixed bottom navigation, and <=700px personal navigation. Do not correct the existing intermediate-width personal-navigation availability in this token batch. Preserve brand/quote type, subtitle tracking, geometry/spacing, botanical paint, desktop #f1f2e9 surface, mobile #f8f8eff7 surface/#dce2d0 border, and mobile selected #e3eada/#2b5139 overrides. These are locally owned legacy treatments, not new semantic roles; mobile selected paint versus generic navigation remains a design-review question before theme work. Generic NavItem still owns hover/focus/current indicator and link semantics. Keep account ellipsis/title, loading label, guest lock icons, hiding behavior, exact community destinations, descendant account selection and MobilePersonalNavigation API unchanged.

Verify font-loaded shell styles at 360/390, adjacent 700/950/1200 boundaries, 834 and 1440px; check current/inactive, hover and keyboard focus at desktop/mobile, guest locks, route changes/history and account descendant selection. Preserve zero backend mutations. Compare original cascade and shared definitions against the baseline, run build/lint/navigation and other relevant tests, scan undefined properties/cycles/unused aliases, update status and stop for review. No new public tokens, themes, route refactor or unrelated family migration.

## Topbar mapping and batch-twenty impact

Replace eight compatibility references in Topbar.module.css: divider --line to --ct-ref-color-stone-200; breadcrumb and preview-caption metadata size/color/leading to --ct-meta-font-size/color/line-height; notification-dot outline --cream to --ct-ref-color-ivory-100. The outline preserves existing palette use, rather than claiming the translucent header is the page surface. Remove --cream after its final Topbar consumer migrates; no surviving shared definition changes. Preview button retains its own 11px/10px action typography and inherited color/leading, not a new metadata control role.

Preserve local header 79px/62px height, padding, gaps and breakpoint rules; #f8f7f2ee translucent surface; #586750 breadcrumb emphasis; preview border/surface/corners; notification 36px circle and #e9eddf hover; unread dot #b77b55 with existing outline; member #789466 and guest #b18462 indicators. These shell-specific treatments are not feedback severity or generic action roles. Keep avatar hiding, breadcrumb/caption hiding and wrapping, personal/community conditional rendering, AccountActions ownership and current focus behavior. Theme-sensitive local paints remain deferred for classification; do not invent new public contracts or a disabled/pressed treatment.

Verify member/guest community and personal routes at mobile/tablet/desktop and adjacent 700/950/1200px boundaries; compare computed styles/geometry including indicator, icon and avatar children. Exercise preview toggle, notifications opening/closing, keyboard focus and profile-link navigation/history without signing out or mutating account data. Cover absent indicator and account-loading/guest variants with isolated read-only samples or record source-review limits. Run build/lint/relevant tests and undefined/cycle/unused checks, confirm only intended module substitutions, update status and stop for review.

## Footer mapping and batch-twenty-one impact

Replace Footer.module.css's --line with --ct-ref-color-stone-200 (page divider, not card border), --serif with --ct-ref-font-family-serif (decorative brand copy, not a heading), first-span 8px gap with --ct-ref-space-8 and mobile 32px top margin with --ct-ref-space-32. These two spacing uses are ordinary composition, not action-footer or section-stack roles. No shared definitions or alias removals; ref-space-32 gains its first consumer.

Preserve local #929886 text/icon paint, 17px serif motto, 8px/7px uppercase tagline, 2px tracking, 44px desktop top margin, 23px/28px vertical padding, 10px/15px container gap and <=700px column/centering. Retain leaf Icon size 16, text, markup and inherited leading. This is application footer branding, distinct from AccountPanel action footers and post footers. Existing contrast/small-type questions remain in the accessibility backlog; do not normalize to metadata or body roles.

Footer renders after route content in the App shell. Compare actual community and account routes at mobile/tablet/desktop and adjacent 700/950/1200 boundaries, including text/icon geometry, colors, typography, divider and spacing. Verify scroll reachability above bottom navigation without modifying shell layout. No independent controls or interactive states exist. Compare source scope, run build/lint/tests and token reference/cycle/unused checks, update documentation and stop for review.

## App shell mapping and batch-twenty-two impact

In App.module.css replace skip-link --green with --ct-ref-color-forest-800, preserving its palette treatment rather than borrowing primary-button or route-selection roles. Replace its 12px padding with --ct-ref-space-12. Keep white foreground local to the skip-link pair; no new public role, alias removal or shared definition changes. Theme classification of the pair remains deferred.

Preserve 100vh minimum height, 238/210/175/0px main offsets, 1370px content maximum, all 37/45/48/30/28/25/23/20px padding values, 68px mobile bottom clearance and overflow-wrap. These are shell geometry, not a general spacing scale. Keep 1600/1200/950/700px breakpoints/order, skip-link fixed positioning (-60px hidden top, 10px focused top, 260px desktop/15px mobile left, z-index 100), href/activation/focus behavior and route-change focus/scroll reset. Existing Sidebar bottom-navigation transition at 1200px versus shell offsets through 700px remains an unresolved layout discrepancy; do not repair it here.

Verify community/account shell computed styles and geometry at mobile/tablet/desktop, adjacent 700/950/1200 boundaries and 1599/1600/1601px. Check skip-link hidden/focused styles and Enter transfer to main, route navigation and mobile footer clearance. No other shell component migrations or auth/overlay refactors. Compare source scope, run build/lint/tests and token reference/cycle/unused checks, update documentation and stop for review.

## Global index.css mapping and batch-twenty-three impact

Preserve font/token import order, selectors, specificity, resets and source order. Root already uses the approved roles. Map h1/h2/h3 family/color/leading and sizes to heading roles (h1 page/title, h2 card, h3 subsection); map p and small aliases to complete body/metadata roles; native field text to body color. Do not add h4-h6 to the heading selector or normalize specialized-card discrepancies. Map checkbox accent --green to forest-800 palette use pending dedicated native-control design, not primary-action semantics.

Reuse --ct-control-transition-duration for each existing .18s global button transition, preserving the background/transform/box-shadow property list and existing reduced-motion overrides. Use existing focus outline width/color/offset roles for global focus-visible and control/link outline offsets. Ordinary paragraph 16px bottom margin uses ref-space-16. No new tokens or shared value changes; remove compatibility aliases only if a full consumer scan proves them unused.

Keep native input/select/textarea #d7dccf border, 7px corners, 11px/13px padding, #fffefa background, #8b9186 placeholder; textarea 110px minimum and vertical resize; #d7e0cd selection; global disabled .5 opacity; heading margins/tracking and all structural resets unchanged. These legacy native-field/selection treatments are unresolved design values, not approved new universal semantic roles. Existing focus/contrast/small-type/control-size and reduced-motion review remain separate; no behavior, validation, HTML hierarchy or theme changes.

Impact is application-wide including auth and standalone routes. Verify a temporary native-elements sample (h1-h6, paragraphs/metadata, links/buttons, disabled fields, text/checkbox/select/textarea, placeholder and selection computed styles) plus actual community Home/account Overview and global keyboard focus. Compare font-loaded computed styles and geometry across mobile/tablet/desktop and shell breakpoint boundaries. Confirm basic typing/check/select and focus without submissions or account mutations. Remove samples before build/lint/tests; compare intended declaration changes, check undefined/cycles/unused aliases, reconcile documentation and stop for review. Auth/other feature overrides not individually exercised must be stated as limits.


## Remaining App.css mapping and batch-twenty-four impact

Replace legacy body/meta/eyebrow and heading size/color/leading references with their existing purpose-based roles; card background/padding/radius, card-grid gap, list-row padding and label-to-metadata gap use their approved semantic equivalents. Section stacks use section-gap; action footers use action-footer-gap. Mobile grid/stat-strip gaps use ref-space-24 rather than inventing a responsive grid role. Card enclosure borders use card-border-color; dividers, fieldsets and topic-button outlines retain the stone palette primitive. Decorative game names, metrics, step numbers, quotes and price use the serif primitive, not the heading role. Explicit metadata sans family uses the sans primitive. Local peach decoration retains #f5e4d6 beside other categorical paints.

Preserve every selector, source order, breakpoint, reduced-motion override and local declaration outside these substitutions. Existing search focus/field paint, compact tabs, toggle geometry/.15s motion, categorical tones, maps/art, native-form sizes, errors, hover treatments and irregular spacing remain local legacy decisions. Their preservation is not approval as new shared standards; contrast, typography, control sizes and theme classification remain in the separate review backlog. No new tokens, themes, feature refactor or backend behavior changes. Remove only compatibility definitions proven to have zero source consumers.

Consumer impact spans community Home/Meet & Play/Championship/Discussion/Profile, account pages, dialogs and legacy form composition. Compare computed type/paint/borders/spacing/layout across mobile/tablet/desktop and adjacent 700/950/1200px boundaries, exercise local view selection and filtering/dialog dismissal without submissions, run build/lint/tests and undefined/cycle/unused checks. Record unexercised branches honestly, reconcile status and stop for review.

Batch twenty-four removes --settings-row-padding-block, --label-metadata-gap and --peach after their final consumers migrate. All surviving definitions remain unchanged.


## Auth.css mapping and batch-twenty-five impact

Auth card h1 uses page/title and compact-page tokens; auth-links retains body-size only, with inherited link color/leading unchanged. Ordinary heading margins (12/24px), auth-links separation (24px) and wrapping gap (12px) use spacing primitives. Feedback's legacy sage maps to the sage-100 palette primitive: the same banner displays both alert errors and status notices, so it must not borrow positive Notice semantics. Preserve local #913d27 error paint, 14px/28px feedback padding, 238/210/175/0px shell alignment, 80vh page minimum, 48px/20px page padding and 520px card maximum. These are legacy auth composition rather than a new scale or public contract; existing feedback/error contrast and shell coordination remain separate review questions.

Keep global selectors/order, imports, inherited panel/form/control styling and 700/950/1200px breakpoints unchanged. No React, credential, redirect, recovery, email-send, cooldown or session changes. Verify actual read-only auth views and a temporary isolated sample for feedback/error/disabled states without sending emails, submitting credentials or changing the signed-in session. Compare computed styles and keyboard focus at responsive boundaries; run build/lint/tests and token scans. Remove temporary sample, update status and stop for review. Remove aliases only after zero consumers are proven.

Batch twenty-five retains all existing shared definitions: each compatibility alias still has consumers outside Auth.css. No alias is removed in this batch.


## CreateCommunity.css mapping and batch-twenty-six impact

Use page/title/compact heading roles, body font size for existing helper/participation copy, metadata roles for summary terms, and card background/padding/border/radius for the independently bordered participation panel. Heading margins use space-12/24; participation paragraph spacing and summary row gap use space-8; mobile summary gap uses space-4. Preserve fieldset 18px gap as local form composition, not card-grid semantics; keep 680px maximum, -10px helper offset, 20px summary column gap and structural declarations local. No new values or tokens. Preserve the existing .form fieldset cascade and inherited control styles, even where they override creation-fields declarations.

Keep component markup, validation, busy locking, optional participant checkbox, saved summary, navigation and create_tenant RPC unchanged. Verify the actual form without creating a tenant, plus temporary saved-summary/disabled/error samples; compare responsive styles and focus, input/select/checkbox behavior. Preserve 700px summary stacking and 1200px card padding. Remove samples, run build/lint/tests and token scans, update status and stop for review. Existing accessibility/theme concerns remain separate; this extraction does not approve new values or backend behavior.

Batch twenty-six retains all shared definitions and aliases: remaining consumers still use them. No new token or shared value change.


## MyHomeTab mapping and batch-twenty-seven impact

Map welcome/section enclosure to card padding/background/border/radius, label/coming-soon text to eyebrow roles, body copy to body roles and illustration caption size/leading to metadata roles while retaining its inherited decorative color. Page's broad ink inheritance and icon's sage background use forest-900/sage-100 palette primitives rather than inventing universal text/status semantics. Placeholder divider uses stone-200, not card-border semantics. Sections use card-grid-gap and section-gap, including the established 24px stacked separation. Welcome gap 32px, section-title gap 8px and section-heading bottom margin 12px use ordinary spacing primitives.

Keep 17/22px title margins, 26px illustration gap, 28px illustration padding, 10px icon padding, placeholder 25/22px and compact 18/14px offsets, illustration paints/arch corners, 460px copy maximum and 1100/700px breakpoints local. No new roles, theme or feed implementation. Preserve placeholder copy, AccountPanel action-footer ownership, My Communities action and existing shared focus/interaction behavior. Verify actual route at responsive boundaries including 1100px, keyboard focus and link navigation; run build/lint/tests and token scans. Remove only zero-consumer aliases; update status and stop for review.

Batch twenty-seven removes --sage, --ink and --account-grid-gap after a full source scan confirms their final consumers migrated. No surviving shared values change.


## AccountPanel mapping and batch-twenty-eight impact

Map actions gap 12px to ref-space-12 and margin-top account-stack-gap to action-footer-gap (24px). This is the established separation of card-ending actions from preceding content, not a general section stack. Preserve flex alignment/wrapping and premiumList's module-plus-global selector with zero bottom margin. No new tokens or changes to shared definitions.

Consumers are MyHomeTab's My Communities action, AccountPreferencesPanel's preference-save footer, and PremiumFeaturesPanel's Explore Premium Features action. Preserve inherited controls, disabled/busy handling, premium placeholder behavior and AccountPanel CSS Module ownership. Verify actual home/settings/premium consumers across responsive boundaries, focus and navigation without saving preferences or introducing billing. Check source scope, build/lint/tests and token references/cycles/unused aliases; update status and stop for review. No other panel-family migration.


## UserAccountPage mapping and batch-twenty-nine impact

Replace compatibility body/meta/eyebrow/heading typography references with their corresponding existing roles and account-stack-gap with section-gap. Preserve all account-scope selectors, :where/:is specificity, exclusion of decorative quotes and alert/status/auth-error paint, metadata overrides, visual-heading data attributes, layout wrapping, favorites minimum, zero margins and mobile page sizing. No new tokens, raw values or shared definition changes; remove compatibility aliases only after their last consumers migrate.

Consumers include account Overview/shared profile presenters, My Home, My Communities (fetched/sample/loading/error), Settings panels and the nested profile editor. Keep account versus community profile scope, state, validation and persistence untouched. Verify actual four tabs plus editor opening/focus/dismissal at responsive boundaries without saving, build/lint/tests and token scans. Record untested state branches, reconcile docs and stop for review.

Batch twenty-nine removes --heading-page-size, --heading-page-small-size and --heading-card-size after zero-consumer verification. Other compatibility names retain consumers; surviving token definitions are unchanged.


## ProfileOverview mapping and batch-thirty impact

Replace the sole --account-stack-gap reference with --ct-section-gap (24px). Preserve grid display, min-width:0 and the direct-child global panel margin reset. Keep account/community ownership, optional edit behavior, profile copy and decorative composition unchanged; no typography or child-family migration is needed. Verify both actual consumers and their edit opening/dismissal at responsive boundaries; do not save profile changes. Run build/lint/tests and token-reference/cycle/unused checks, remove only zero-consumer aliases, reconcile status and stop for review.

Batch thirty retains all shared definitions and aliases: account-stack-gap still has other consumers.


## MyCommunitiesTab mapping and batch-thirty-one impact

Map body and account-metadata triples to existing body/meta roles; sample card padding/background/border/radius to card roles; toolbar separation to section-gap. Sample-card 24px internal gap and heading 8px vertical margin use spacing primitives, not section-stack or heading-size roles. Preserve local 7px icon/text gap and 20px toolbar gap, flex sizing and both 700px stacking rules. Preserve account-scoped overrides, CSS Module ownership and inherited OwnedCommunities loading/error/list behavior. No new token, visual value, list-query, auth or navigation changes.

Verify actual loaded list and sample row across responsive boundaries and keyboard focus/navigation of Start New Community and Explore community, without creating tenants. Loading/error/empty variants remain covered by existing tests/source review unless separately exercised. Run build/lint/tests and token checks; remove only aliases proven unused, reconcile status and stop for review. OwnedCommunities is not itself migrated in this batch.

Batch thirty-one retains all shared definitions and aliases; the source scan finds no unused entries.


## OwnedCommunities mapping and batch-thirty-two impact

Replace the sole 4px h2/paragraph bottom margin with ref-space-4. This is ordinary internal composition, not label-meta-gap or section spacing. Preserve overflow-wrap:anywhere, selector scope/order and inherited community-list/card/account typography. Rows are noninteractive; shared retry is outside this module's card selector. Preserve owner-only query, loading/error/retry/empty states, archived/active labels and optional sample insertion unchanged. No new token or shared value changes.

Verify the actual fetched row and sample context across responsive boundaries, unchanged surrounding navigation/focus, and existing owner-list read/failure tests and source review of retry. Do not create, archive or modify tenants. Record untested branches, run build/lint/tests and token scans, reconcile status and stop for review.

Batch thirty-two changes no shared definitions or aliases; the source scan finds no unused entries.


## Home mapping and batch-thirty-three impact

Map existing card and typography aliases to their purpose-based roles; hero-art-card strong is an item heading and uses heading-font-family. Rhythm/weekday dividers retain stone-200 palette use; calendar enclosure uses card-border-color. Section separations use section-gap; hero action separation uses action-footer-gap. Rhythm internal gaps/padding, calendar ordinary padding/margins and small composition measurements on the approved scale use spacing primitives, without treating artwork offsets/corners/shadow coordinates as spacing. Preserve calendar event's local 1.4 leading and categorical paints; metadata font size does not authorize changing its other typography.

Retain hero-specific #dde3d3 border, avatar-stack and illustration palettes, arch/card geometry, shadows, gradients, art transforms/offsets, irregular 3/5/6/10/13/15/17/18/20/22/25/30/35px composition, calendar 630px scroll minimum, day minimum heights and breakpoint order (1600/1200/950/700). No palette, control, theme or calendar behavior redesign; preserve later responsive overrides. Verify Upcoming/Calendar, category filters, month navigation, focus and activity-dialog opening/dismissal across responsive boundaries without booking. Remove only unused aliases, run build/lint/tests and token scans, reconcile documentation and stop for review.

Batch thirty-three removes 20 zero-consumer aliases: serif; text-body-size/leading/color; text-meta-size/leading/color; text-eyebrow-size/leading/color; heading-hero/subsection/item-size; heading-title/content-leading; text-heading-color; card-bg/padding/radius; line (each with its original -- prefix). Only --account-stack-gap remains for Community.module.css and MeetPlay.module.css. No surviving shared definitions change.


## MeetPlay mapping and batch-thirty-four impact

Replace guidance and stacked feature outer margins with section-gap (24px). Mobile feature padding uses ref-space-24: ordinary inset from its divider, not an outer section stack. Preserve local #cfd8c1 divider paint, 30px desktop inset, 300px flex basis, z-index, structural declarations and the 950px breakpoint. These existing hero composition values remain local exceptions, not new shared standards. No new raw values or tokens.

Keep selectors, source order, React behavior and shared definitions unchanged. The account-stack-gap compatibility alias remains necessary for Community.module.css. Verify actual Meet & Play layouts around 700/950/1200px, focus, local filters/tabs and dialog opening/dismissal without submitting preferences, creating tables or booking. Compare computed styles, run build/lint/tests and token checks, reconcile status and stop for review.


## Community mapping and batch-thirty-five impact

Map member-preview guidance margin-top from account-stack-gap to section-gap (24px), preserving the separation of guidance from profile interests. No new roles, values or selectors. The only direct consumer of account-stack-gap is Community.module.css; no alias depends on it. After migration remove that final compatibility definition and its empty block/comment. All authoritative values remain unchanged.

The affected family is the community member-preview native dialog, including inherited focus, responsive wrapping and overlay behavior. Compare actual dialog computed styles at mobile/tablet/desktop and adjacent 700/950/1200px boundaries; verify member search, keyboard opening, Escape/close and focus return without posting or changing data. Run build/lint/tests and token reference/cycle/unused checks. Preserve the existing light theme and mock privacy behavior; no theme or domain refactor. Update status and stop for review.


## Final token audit — 2026-10-24 (gate 36)

Community batch thirty-five is accepted. This is a read-only source audit plus documentation reconciliation, not another rendering-change batch. Application files were not changed. Extraction of deprecated aliases is complete; this does **not** mean all raw design literals are gone or all visual decisions are settled.

### Method and results

Parsed all 32 CSS files with the installed PostCSS parser and scanned all 88 CSS/TS/TSX/JS/JSX source files for literal var() references, including SVG paint references and nested fallbacks. Built a union dependency graph across all definition variants, checked every definition for cycles (including disconnected definitions), and traced reachability from ordinary declarations and source references. No dependencies, generated token sources or permanent audit tooling added.

- 107 distinct custom properties: 96 public (16 primitives and 80 semantic/component contracts) and 11 private component properties.
- Zero legacy-name definitions or references; zero undefined references, dependency cycles or unused definitions/aliases under this source-reachability check. All six spacing primitives have consumers.
- Repeated private definitions are intentional Controls/Notice/GameArt variants; the public card-padding override remains 27px / 22px at max-width 1200px. Variant class application and the primary-action border fallback were source-reviewed. Private icon sizes remain local to InsightCard/HeroFeaturePanel.
- Token entry import occurs once in index.css; primitives precede semantics. No alternate-theme file or scope was introduced. CSS remains authoritative.
- TypeScript/SVG review found GameArt's three private palette references plus documented fixed artwork paints. Activity.tsx seat-fill percentage and Community.tsx map-marker percentages are data/illustration geometry, not missing global tokens.
- Static definition existence/reachability is not proof of every runtime scope, invalid-at-computed-value case, or selector liveness. Existing per-batch browser evidence remains the rendering evidence; this audit did not repeat the browser matrix or accessibility assessment.

### Remaining raw-value inventory and classification

A literal screening pass found **843 ordinary CSS declarations** outside token files containing a hex/rgb/hsl paint or a numeric px/rem/em/ms/s value. This deliberately broad count includes borders, dimensions, artwork, mixed token/literal calc expressions and geometry; it is not a count of defects. It excludes custom-property definitions, percentage-only/unitless declarations, media-query conditions and SVG attributes, which were reviewed separately. Counts are a snapshot, not a target of zero.

| Location/family | Screened declarations | Disposition |
| --- | ---: | --- |
| App.css | 380 | Global composition, legacy form/control/feedback states and decorative/status paint; follow-up candidates below |
| Home.module.css | 78 | Preserved hero/calendar/artwork and local density exceptions |
| Sidebar / Topbar / Footer | 68 / 38 / 10 | Preserved shell/brand/navigation composition, local mobile paint/type; responsive discrepancy remains open |
| ActivityCard / ActivityDialog | 44 / 46 | Preserved media/stamp/map geometry, status paints, shadows and dialog discrepancies |
| ui.module.css / GameArt.module.css | 58 / 1 | Shared-family local geometry/type/paint; artwork wrapper fallback |
| Controls / FilterChip / Notice | 18 / 7 / 7 | Documented control composition and message geometry, not body/card roles |
| FeaturedActivityCard / GuidanceNote / HeroFeaturePanel / InsightCard / PromotionalBanner | 5 / 6 / 3 / 5 / 3 | Documented independent component dimensions, padding, corners and decorative treatments |
| App.module.css / index.css | 14 / 12 | Shell dimensions; native fields/selection remain legacy design-review items |
| Auth / CreateCommunity / MeetPlay | 7 / 5 / 4 | Preserved form alignment, local errors, layout and hero divider |
| MyHomeTab / MyCommunitiesTab / UserAccountPage | 20 / 3 / 1 | Illustration geometry and local composition/width constraints |
| Community / AccountPanel / OwnedCommunities / ProfileOverview | 0 each | No screened literals; structural CSS still exists |

**Cascade/consumer recheck — 2026-10-24 (supersedes the initial candidate table):** A raw literal is not automatically an active token-migration candidate. Trace its actual JSX consumers, matching selectors, specificity, shorthand/longhand overrides and responsive rules first. CSS Module class names do not match similarly named global classes unless explicitly composed. No styles were changed during this recheck.

| Selector / declaration | Actual consumer and winning cascade | Classification and proposed follow-up |
| --- | --- | --- |
| .account-settings > .panel — margin-bottom:24px | AccountSettingsTab is rendered inside UserAccountPage's .page[data-account-page]. The scoped account selector resets each panel to margin:0. Parent .account-settings is a column flex container with gap:var(--ct-section-gap). Browser confirms panel margins 0 and parent gap 24px at all six checked widths. | **Removed in the authorized account-margin cleanup; awaiting review.** The obsolete rule was deleted, not tokenized. Keep parent gap ownership and account reset unless separately proven unnecessary. |
| .premium-feature-list — margin:0 | PremiumFeaturesPanel now uses only the global list class; AccountPanel retains its actions class. Paragraph margin supplies 16px separation, row padding remains 20px, and the action footer owns 24px separation. | **Approved refinement implemented; awaiting review.** Removed the redundant .premiumList bottom override and JSX class reference. No new token needed for structural zero. |
| .premium-feature-list li — shared setting-row | PremiumFeaturesPanel li now carries setting-row and inherits its layout, 20px gap, label/meta presentation, divider and wrapping. Manage replaces the toggle. | **User-approved shared row treatment implemented; awaiting review.** Deleted duplicate premium li/small rules and redundant account selectors. The former 16px gap is superseded, not tokenized. |
| .account-actions — gap:16px | AccountActions is mounted by Topbar. Signed-in branch has one Sign Out child; signed-out branch has Sign in and Create Account siblings. Loading returns a separate status span. Topbar's module .actions styles an ancestor, not .account-actions, and does not override this gap. | **Active, state-dependent layout**, not unreachable code. Candidate: ref-space-16. Signed-in browser shows computed 16px but one child means no visible gap; signed-out two-child need is confirmed in source, not exercised by signing out. |
| .community-list > li — gap:24px | OwnedCommunities rows and MyCommunitiesTab sample row. Global selector specificity (0,1,1) beats sample module .preview (0,1,0), which already declares the same 24px primitive. Account scope resets margins, not internal gaps. Owned rows currently contain one wrapper, sample row contains two children. <=700px changes direction to column, retaining gap. | **Active internal row composition**, visibly needed by sample row; single-child owned rows have no visible gap. Candidate: ref-space-24 for the global declaration. The sample module token is not currently the winning declaration; retain or clean up that duplication only after explicit ownership review. |
| .community-list > li — margin:0 0 18px | All production list consumers are under UserAccountPage. Its more-specific scoped selector resets li margins to 0; .community-list parent owns a 24px section gap. Browser confirms both fetched and sample rows have margin:0 at all six widths. Isolated OwnedCommunities tests render without this page wrapper, but are not a production route contract. | **Removed in the authorized account-margin cleanup; awaiting review.** The obsolete margin declaration was deleted; no 18px token or new vertical-list role was introduced. Do not remove the rest of the active row rule. |

The account resets win by specificity, not by an assumed stylesheet loading order: .page[data-account-page] .account-settings > .panel has specificity (0,4,0) versus (0,2,0); the scoped list-row selector has (0,3,1) versus (0,1,1). Preserve the broader reset groups: they cover other legacy defaults too.

The additional App.css candidates named in the initial audit were also traced through source and responsive rules:

| Candidate | Actual consumer / cascade qualification | Disposition |
| --- | --- | --- |
| .check-label gap:8px!important | MeetPlay filters/create form, CreateCommunity checkbox and Profile edit form; important gap overrides ordinary form-label gap. Mobile filter width/margin changes do not replace gap. | Active; ref-space-8 candidate, retaining !important until specificity is separately reviewed. |
| .step gap:16px; .step h3 bottom margin:8px | Championship Overview steps. Heading rule has margin:2px 0 8px; later heading role rules do not replace margins. | Active; ref-space-16/8 candidates. Preserve the local 2px top margin. |
| .actions gap:12px | Global class in Championship result actions and CreateCommunity saved-summary actions; also a separate community preferences component. AccountPanel/Topbar module .actions are distinct generated classes. Later .panel > .actions governs margin-top, not gap. | Active; ref-space-12 candidate. Do not conflate with already-tokenized AccountPanel actions. |
| .guideline>svg margin-bottom:12px | Discussion topic-sidebar Icon is a direct SVG child. At <=950px the parent .guideline is display:none. | Active above 950px, hidden below; ref-space-12 candidate, not an obsolete rule. |
| .member-card h3 margin-bottom:8px | Discussion Members card headings. Global h3 margin provides other sides; this more-specific longhand wins on bottom. | Active; ref-space-8 candidate. |
| .recommendation h3 margin-top:12px | Discussion Game Recommendations headings; overrides global heading top margin. | Active; ref-space-12 candidate. |
| .place-card h3 margin:12px 0 | Discussion Local Spots headings; more-specific shorthand owns both vertical margins. | Active; ref-space-12 candidate. |
| .form-row gap:16px | MeetPlay creation, Championship registration, Profile editor, CreateCommunity form. At <=700px later .form-row sets gap:10px; three-column variant changes columns too. | **Responsive override, not globally dead.** Tokenize desktop 16px only if authorized; preserve mobile 10px as local legacy measurement. |
| .interest-options gap:12px | Community Profile edit interests container. Child labels have their own 6px gap, a different relationship. | Active; ref-space-12 candidate; do not replace child gap. |
| .chat-message padding:12px | Discussion post replies use global class. ActivityDialog uses a distinct CSS Module chat-message with its own already-tokenized padding. | Active for Discussion replies; ref-space-12 candidate. Do not treat ActivityDialog as a consumer of this rule. |

Sidebar/Topbar scale-aligned gaps/insets and compact tabs/search/table cells remain documented local composition, not newly proposed cleanup targets. Responsive overrides there are not evidence that desktop rules are dead. Their earlier accepted mappings and visual-review boundaries remain intact.

**Evidence and limits:** production source consumer search plus selector/specificity/media-query review; read-only browser computed styles on Settings and My Communities at 390/700/701/950/1200/1440px. Both fetched and sample community rows were present. Verified account margins, parent gaps, list top/bottom margins, row gaps and row direction. Supplemental community/form candidates are source/cascade-reviewed, not a newly repeated interaction matrix. No auth changes, submissions, fixtures, application edits or style deletion. Build/lint/tests were not rerun for this documentation-only correction; the preceding audit's passes remain the latest results. Future style cleanup must verify its own affected states, widths and checks.

**Unresolved visual decisions:** keep the existing discrepancy register open (borders, dialog copy, search focus, disabled opacity, calendar leading, configurable heading levels, sidebar transitions/mobile paints, heading separation and decoration). Native input border #d7dccf/background #fffefa/placeholder #8b9186/7px corners and selection #d7e0cd remain legacy values, as do form error paints and toggle motion. They must not acquire permanent semantic names merely to make the literal count smaller.

**Accessibility and themes:** existing contrast, small type/zoom/text-spacing, control targets, focus/disabled and dialog review remains separate. Local paint classification and complete scope/overlay contracts are prerequisites for future themes. No alternate palette, theme fixture or accessibility redesign is authorized by this audit.

### Verification and review boundary

Build and lint pass; all 65 tests in 8 files pass. Existing Vite warning remains for the 521.35kB shared chunk. No temporary fixture or application change was introduced. Review gate: approve the audit findings, then separately authorize any residual spacing cleanup or design refinements. Do not report the unresolved visual/accessibility/theme backlog as complete.


## Obsolete account margins cleanup — authorized 2026-10-24

The cascade correction is accepted. Remove only App.css's .account-settings > .panel margin-bottom:24px rule and the margin:0 0 18px declaration in .community-list > li. Keep all active row styling, parent section-gap, scoped account margin resets, premium-list margins and remaining token candidates unchanged. No new token, visual value or behavior. Compare actual Settings and loaded fetched/sample My Communities computed styles at mobile/tablet/desktop and adjacent 700/950/1200px boundaries; run build/lint/tests, reconcile status, then stop for review.

Cleanup completion: removed exactly the two planned App.css declarations. All 26 loaded-state computed-style comparisons match (Settings and My Communities, each at 360/390/699/700/701/834/949/950/951/1199/1200/1201/1440px). Compared account-content descendants for dimensions, margins/padding/gaps, flex/layout, type, borders and paint; fetched and sample rows were present. An initial settings comparison encountered asynchronous preference loading; reran only after the save control appeared and all 13 loaded-state comparisons matched. Mobile screenshot reviewed. No preferences saved, data mutations, fixture or token changes. Build/lint and all 65 tests in 8 files pass; existing 521.35kB shared-chunk warning remains. Stop for review before active-spacing cleanup. The 843-literal inventory above is the pre-cleanup historical snapshot.


## Premium notice removal and margin reassessment — 2026-10-24

User authorized removing the temporary subscription-data Notice before evaluating durable list spacing. Remove only that Notice and its unused import from PremiumFeaturesPanel; preserve the remaining sample row, actions and billing deferral. Reassess paragraph/list margin collapse, row padding and action-footer ownership on the resulting actual layout before recommending a spacing change.

Reassessment result: temporary Notice and import removed. Browser checks at 390/700/701/950/1200/1440px confirm preceding element is now the descriptive paragraph, paragraph bottom margin 16px, effective list margin 24px 0 0, collapsed paragraph-to-list gap 24px, row padding 20px vertically and list-to-action-footer gap 24px. The top margin is active, not an obsolete override; preserving it as a token would canonize a design choice not yet approved. Recommend list margin:0 and removal of the then-redundant .premiumList bottom override (and unused class wiring), retaining paragraph spacing, row padding and action-footer ownership. Expected visible change is 8px less space before the list; this is proposed, not implemented. Build/lint and 65 tests pass; existing 521.35kB bundle warning remains. No preference/billing changes or submissions. Stop for review.


## Premium list margin refinement — authorized 2026-10-24

User approved margin:0 on the premium list and removal of the redundant AccountPanel bottom-margin override/class reference. Paragraph owns the 16px pre-list separation; row padding remains 20px and action-footer gap remains 24px. This intentionally reduces pre-list spacing by 8px after Notice removal. No other spacing candidates or shared token values change. Verify responsive computed geometry, build/lint/tests, update status and stop for review.

Refinement completion: list margin is 0; obsolete .premiumList override/comment and JSX class reference removed. Verified computed margin 0, paragraph-to-list gap 16px, row padding 20px, footer separation 24px, wrapping and no horizontal overflow at 360/390/699/700/701/834/949/950/951/1199/1200/1201/1440px. Mobile screenshot reviewed. Build/lint pass; 65 tests in 8 files pass. Existing bundle-size warning remains. No shared token changes or preference submissions. Stop for review; other candidates remain untouched. Earlier reassessment paragraphs describe the pre-approval state.


## Premium setting-row alignment — 2026-10-24

User directed premium items to render like setting rows with Manage instead of a toggle. PremiumFeaturesPanel li now composes setting-row; removed duplicate premium row/metadata rules from App.css and premium-only account selectors now covered by setting-row. Shared setting-row rules/values remain unchanged. Preserve ul/li semantics, list margin:0, action footer and existing outline Manage navigation. Control size/content can affect natural height and wrapping; no forced equal heights or billing behavior introduced.

Verification: computed row layout/alignment/gap/padding/divider/wrapping and strong/small typography/display/spacing exactly match discovery setting rows at 360/390/699/700/701/834/949/950/951/1199/1200/1201/1440px. No horizontal overflow. Manage keyboard focus and navigation to My Communities verified. Build/lint and all 65 tests pass; existing bundle warning remains. No preference saves. Stop for review.
