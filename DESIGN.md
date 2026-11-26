---
version: alpha
name: Restate UI
description: The component system of the Restate web UI and the Restate Cloud console. Role tokens come from @restate/util-styles, components from the @restate/ui-* libs in libs/ui.
---

# Restate UI design system

Start here before you build or change UI, whether you are a person or an agent. This file says which component does which job, how components are built and named, and the rules that keep screens consistent. The Restate Cloud console builds on the same libs, so the same rules apply there.

Colors have their own guide, [`libs/util/styles/DESIGN.md`](libs/util/styles/DESIGN.md) (`@libs/util/styles/DESIGN.md`). Tokens live in `theme.css`, not in this file, so there is one source of truth. The sections follow the open [DESIGN.md format](https://github.com/google-labs-code/design.md), with Accessibility and Contributing added at the end.

**Three rules before you write a class:**

1. **Use a component.** Find the job in the [catalog](#catalog) and use what shipped pages use. Don't build a look-alike.
2. **`className` places a component; props style it.** Pass `className` for layout only: margins, width, flex and grid placement, position, visibility. Size, color, radius, padding and type come from props. If the prop you need doesn't exist, add a variant to the component instead of overriding it from outside.
3. **Tokens only.** Colors from role tokens, font sizes from the [type scale](#typography), radii from the [shape scale](#shapes). No palette classes, literal colors or new arbitrary values outside illustrations.

**Planned** below marks a change that isn't in the code yet. Until it lands, follow the "today" advice next to it, and don't write another local copy of the missing piece.

## Overview

Restate UI is an operations tool for developers who run durable services: invocations, journals, deployments, state, queues. It should feel calm, precise and dense: data first, chrome last.

- **Calm.** Neutral layers; color only where it means something (a status, or the accent on things you can click). No decoration for its own sake: no new gradients or sheens, and loops only for live state.
- **Dense but readable.** 12–14 px text in tables and panels, tabular numbers, long IDs truncated with a tooltip instead of wrapped.
- **Familiar.** A new screen looks like the screens around it. Reuse shipped components and patterns, and fix spacing and alignment before reaching for a new layout.
- **Universal.** Screens work for any service, handler and payload. Don't build views around one SDK's or library's handler names; reach library-specific actions through generic tools (the playground, generic cancel).
- **Accessible by default.** React Aria gives keyboard and screen reader support. Hand-rolled controls lose it.

### Layers of the system

```text
@restate/util-styles   theme.css: role tokens for light and dark; tv() and cx()
        ↓
react-aria-components  behavior, keyboard, ARIA; styled only inside libs/ui
        ↓
@restate/ui-*          libs/ui: styled components, one family per lib
        ↓
@restate/features-*    patterns and domain widgets built from ui-*
        ↓
apps/web-ui and Cloud  routes and pages
```

- Each `libs/ui/<name>` is a package, `@restate/ui-<name>`, imported by package name.
- `libs/ui` takes plain props and doesn't import `@restate/features-*` or `@restate/data-access-*`. Two old imports break this (`ui-issue-banner` → `features-system-health`, `ui-dialog` → `features-user-preference`); lint (`restate/ui-layer-imports`) rejects any other.
- The whole theme lives in `@restate/util-styles/theme.css`: role colors, the `text-3xs`, `text-2xs` and `text-0.5xs` sizes, the fonts, the keyframes, the `3xl` breakpoint and the `@tall:` variant. An app imports it once after `tailwindcss`; its own stylesheet keeps only page-level rules.
- Storybook shows every shared component with its variants and states, in both themes: `pnpm nx serve storybook`, stories in `apps/storybook/src`. Three libs draw nothing themselves and have no stories: `focus` (the focus ring style), `portal` (moves content into a slot elsewhere on the page) and `timeline-zoom` (the journal timeline's zoom hooks). `query-builder` shows through the filter stories, since `filter-builder` is built on it. The dev server shows the color tokens at `/ui/design-system`.

## Colors

The short version of [the color guide](libs/util/styles/DESIGN.md). Read the guide before you pick a background or a text color.

- **Role tokens only:** `bg-surface`, `text-muted`, `border-default`, `bg-danger-subtle`. No palette classes (`bg-gray-100`) and no literal colors; `restate/no-palette-colors` rejects them.
- **Backgrounds by role:** the page is `bg-canvas`, panels and cards `bg-surface`, quiet areas inside them `bg-subtle`, pressable controls `bg-raised`, fields and inset wells `bg-inset`, floating frames `bg-overlay`.
- **Text tiers:** `text-primary`, `text-secondary`, `text-tertiary`, `text-muted`, `text-subtle`, `text-faint`, from most to least emphasis.
- **Families:** `accent` means you can click it; `info`, `success`, `warning`, `danger` and `pending` are states. Each has the same tiers (`-subtle`, `-muted`, `-emphasis`, `-strong`, `-vivid`).
- **Themes:** light and dark come from the tokens. Don't use `dark:` to change a color.

## Typography

Inter Variable is the default font (`font-sans`); JetBrains Mono Variable (`font-mono`) is for code, IDs and payloads.

| Class        | Size  | Use for                                                      |
| ------------ | ----- | ------------------------------------------------------------ |
| `text-3xs`   | 10 px | Tiny chart and chip labels                                   |
| `text-2xs`   | 11 px | Counters, `Badge size="xs"`, row metadata                    |
| `text-xs`    | 12 px | Table cells, card rows, captions, editors                    |
| `text-0.5xs` | 13 px | Dense body text: callouts, code snippets, field descriptions |
| `text-sm`    | 14 px | Default body: forms, buttons, dialogs, tabs                  |
| `text-base`  | 16 px | Empty-state titles                                           |
| `text-lg`    | 18 px | Dialog titles                                                |

Text roles in use today. Use the component where there is one; copy the classes where there isn't.

| Role                  | Today                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| List page title       | `ListPageHeader`: `text-sm font-semibold` in an accent pill, description `text-sm text-muted`                       |
| Page title            | `Heading level={1} size="xl"` (`text-xl font-semibold`)                                                             |
| Panel title           | `Heading size="lg"`, the `DialogTitle` look for a side panel                                                        |
| Panel or form heading | `Heading size="sm"` (`text-sm font-semibold`); `tone="tertiary"` above an empty panel's text                        |
| Dialog title          | `DialogTitle` from `@restate/ui-dialog` (`text-lg leading-6 font-medium text-primary`, wired to the dialog's label) |
| Field label           | `FormFieldLabel` (or a field's `label` prop): `text-sm font-medium text-secondary`                                  |
| Section title         | `SectionTitle`: `text-xs font-semibold uppercase text-subtle`                                                       |
| Card title            | `CardHeader title`: `text-xs font-semibold`                                                                         |
| Empty state           | `EmptyState`: title `text-base font-semibold`, description `text-sm text-muted`                                     |
| Caption               | `text-xs text-muted`                                                                                                |
| Code and IDs          | `font-mono` at the size of its context                                                                              |
| Numbers               | add `tabular-nums` in columns, counters and durations                                                               |

- Don't add font sizes. `text-[…]` is for illustrations only: `text-[0.8125rem]` is `text-0.5xs`, and `text-[0.6875rem]` is `text-2xs`.
- `Heading level size tone` from `@restate/ui-heading` draws a heading: `level` picks `h1`–`h6`, `size` is `sm`, `md` (the default, the `EmptyState` title), `lg` or `xl`, and `tone` is `primary`, `secondary` or `tertiary`. Use it instead of styling an `h1`–`h6` with classes.
- **Planned:** named text roles in util-styles (label, caption), so the remaining role classes stop being copied.

## Layout

The app shell comes from `@restate/ui-layout`:

- `LayoutProvider` sets up the shell, and `LayoutOutlet zone={LayoutZone.…}` renders into one of its zones: `AppBar`, `Nav`, `SideBar`, `Toolbar`, `Content` or `Complementary`. `SidebarNav` and `SidebarNavItem` build the sidebar. The layouts also render `NotificationRegion`.
- `ComplementaryWithSearchParam` docks a side panel that a search param opens.
- `ListPageHeader` heads list pages; `Header` is the sticky header of a details page, tinted by its `intent`; `Breadcrumbs` shows the trail.

Spacing uses Tailwind's 4 px scale; don't write arbitrary spacing values. A heading sits at least as far from its first section as the sections sit from each other.

Control heights:

| Control                                                    | Height            | Use                                               |
| ---------------------------------------------------------- | ----------------- | ------------------------------------------------- |
| Text field, select                                         | 34 px             | Forms                                             |
| `Button` (primary, secondary, destructive)                 | 38 px             | Dialog and page actions                           |
| `Button size="sm"`                                         | 34 px             | Next to a text field                              |
| `Button size="xs"`                                         | 26 px             | Toolbars, card and panel actions                  |
| Tab in `@restate/ui-tabs`                                  | 28 px             | Tabs                                              |
| `Button variant="icon" size="2xs" \| "xs" \| "sm" \| "md"` | 18, 20, 26, 28 px | Next to small text, inline, toolbar, panel header |

A toolbar lines up when its text buttons are `size="xs"` and its icon buttons `size="sm"`: both are 26 px. **Planned:** the same scale for fields, so a field and its button share one `size`.

**Breakpoints:** Tailwind's (`sm` 40rem to `2xl` 96rem), plus `3xl` at 140rem. The `@tall:` variant applies from a 47rem viewport height.

**Layers:** there is no z-index scale yet. Reuse the layer you mean instead of a new number: `z-10` for sticky content, `z-80` for toasts, `z-100` for dialogs, the app bar and the side panel, `z-110` for the notification zone. React Aria places popovers, menus and tooltips above all of these with an inline `z-index: 100000`. **Planned:** named layers in util-styles (`z-(--z-overlay)`).

## Elevation & Depth

Depth comes from tonal layers, not shadows: `sunken` < `canvas` < `overlay` < `subtle` < `surface` < `muted` < `raised`. In dark mode each step up is lighter. Shadows are small and few:

- `shadow-xs` on panels, cards and raised controls.
- Floating layers (popovers, menus, dialogs) get their edge and shadow from `PopoverOverlay` and `DialogContent`. Don't add your own.
- Fields and inset wells use the recess shadow `shadow-[inset_0_1px_2px_0px_var(--box-shadow-color-inset)]`. **Planned:** an `inset-shadow-field` utility.
- No new sheens or glows. Gradients stay where components already have them: primary and destructive buttons, status glows on cards.

## Shapes

| Radius                | Use for                                                        |
| --------------------- | -------------------------------------------------------------- |
| `rounded` (4 px)      | Counters, tiny chips                                           |
| `rounded-md` (6 px)   | Small buttons, `Badge size="sm"`                               |
| `rounded-lg` (8 px)   | Text fields, `Badge`, toolbar icon buttons                     |
| `rounded-xl` (12 px)  | Buttons, cards, sections, callouts, code blocks, menu sections |
| `rounded-2xl` (16 px) | Page panels: `rounded-2xl border bg-surface shadow-xs`         |
| `rounded-[1.125rem]`  | Dialogs, set by `DialogContent`                                |
| `rounded-full`        | Pills, dots, `Badge size="xs"`                                 |

- **Nested corners:** the inner radius is the outer radius minus the gap between them. `Section` is `rounded-xl` with `p-0.5`, so its content is `rounded-[calc(0.75rem-0.125rem)]`.
- **Borders** are 1 px. A bare `border` already uses `border-default`.

## Motion & Micro-interaction

- Motion confirms a change; it never decorates. Hover and press change color at once or with the default `transition`. Overlays enter and leave in about 200 ms with `tailwindcss-animate` (`animate-in fade-in zoom-in-105`).
- Loops (`animate-ping`, `animate-pulse`, `animate-pulseButton`, `animate-scanlineSweep`) are only for live state: running work, pending items, loading. Wrap them in `motion-safe:` or hide them with `motion-reduce:`. Most existing loops don't yet; new ones must.
- Animate `transform` and `opacity`, not layout.
- The keyframes (`countdown`, `pulseButton`, `scanlineSweep`, `memoryScan` and others) live in util-styles' `theme.css`. Reuse one before adding a near-duplicate, and give a looping animation a `motion-reduce:` fallback, as `Skeleton` does.

## Voice & Content Strategy

- **Sentence case everywhere:** headings, buttons, menu items, labels ("Register deployment", "Create key").
- **Terms match the API, the CLI and the docs:** use the words in [`TERMINOLOGY.md`](TERMINOLOGY.md). Rename a term everywhere at once or not at all. To tell two similar things apart, add a qualifier ("admin URL", "ingress URL"), not a new word.
- **Action labels** are a verb plus what it acts on: "Cancel invocation", "Delete deployment". `ActionText` adds "…" when the action opens a follow-up step.
- **Hover notes:** one short sentence without a final period, no title that repeats the trigger, "Learn more" as a plain link. Explain only terms a reader may not know; don't add (i) icons after every line.
- **Dialogs:** a create dialog says in one line who or what it's for, then lists what it can do. A delete confirmation lists what happens: when it stops working, what stays, and that it can't be undone.
- **Empty states** say what belongs here and offer the action. Put the count in the list heading ("Deployments · 0") and keep an empty card to one line and its button.
- **Errors** say what failed and what to do next. Request errors go through `ErrorBanner`, which formats Restate errors; field errors through a field's `errorMessage`. Show "X is required" only after a submit.
- **Numbers, dates and durations:** format with `@restate/util-intl` (`formatDateTime`, `formatDuration`, `formatNumber`, `formatBytes`, `formatPlurals`) and show dates with `RelativeDate` or `DateTooltip`. Put formats in placeholders ("e.g. 10s, 5m or 1h").

## Components

### Catalog

Find the job, then use the component. Every package is `@restate/ui-<name>`.

**Actions**

| Job                                   | Use                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Lib                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Main, secondary or destructive action | `Button variant="primary" \| "secondary" \| "destructive"`; `size="sm"` (34 px) next to a field, `size="xs"` (26 px) in toolbars                                                                                                                                                                                                                                                                                                                                                                                                                              | `button`                  |
| Submit a form                         | `SubmitButton`: shows a spinner and disables itself while the form's fetcher or mutation runs                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `button`                  |
| Icon-only action                      | `Button variant="icon" size="sm" aria-label="…"`. `size`: `xs` 20 px (inline), `sm` 26 px (toolbars), `md` 28 px; without it the button pads its icon by 4 px                                                                                                                                                                                                                                                                                                                                                                                                 | `button`                  |
| Quiet text action                     | `Button variant="ghost"`: no frame, muted text, a hover background, 24 px; `size="xs"` for 11 px text. For "Last result", "Reset", "Edit" and counts that open a menu                                                                                                                                                                                                                                                                                                                                                                                         | `button`                  |
| Action with alternatives              | `SplitButton menus={…}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `split-button`            |
| Menu of actions                       | `Dropdown` › `DropdownTrigger` + `DropdownPopover` › `DropdownSection` › `DropdownMenu` › `DropdownItem` (`destructive` for dangerous items)                                                                                                                                                                                                                                                                                                                                                                                                                  | `dropdown`                |
| Risky action with confirmation        | `ConfirmationDialog`, or `withConfirmation` (below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `dialog`                  |
| Copy a value                          | `Copy copyText size tone`; `SnippetCopy size` in snippets; `TruncateWithTooltip copyText` for long IDs. `size` is the icon-button scale (`2xs` 18 px with a 10 px icon next to small text such as a breadcrumb or an ID in a card, `xs` 20 px, `sm` 26 px, `md` 28 px) and leaves the placement to `className` (`ml-1` after a value); without it the button keeps its old 34 px look and place, which older call sites still use: `Copy` pushes itself to the end of its row (`ml-auto`), `SnippetCopy` sits in the top-right corner of a `relative` snippet | `copy`, `code`, `tooltip` |
| Keyboard shortcut                     | `useSubmitShortcut`, `useFocusShortcut`, with `SubmitShortcutKey` or `FocusShortcutKey` as the hint                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `keyboard`                |

**Navigation**

| Job                              | Use                                                                                                                                                                                                                                                                                                                    | Lib             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Link in text                     | `Link`. A `?…` href merges into the current search params (`preserveQueryParams`, on by default); pass an array of names to carry those params to another path                                                                                                                                                         | `link`          |
| Link that looks like a button    | `Link variant="button" \| "secondary-button" \| "destructive-button"`: the `Button` look and `size`, with a link's pointer. `variant="icon"` is a quiet link with a hover background                                                                                                                                   | `link`          |
| Link in a callout or helper text | `Link intent="info" \| "success" \| "warning" \| "danger"`: the callout's color, a bit stronger, with a matching underline. Pass the callout's `intent`                                                                                                                                                                | `link`          |
| Sub-pages of a page              | `Nav` with `NavItem` (paths) or `NavSearchItem` (a search param value)                                                                                                                                                                                                                                                 | `nav`           |
| Tabs in a panel                  | `ContentPanel tabs={…}`                                                                                                                                                                                                                                                                                                | `content-panel` |
| Tabs with panels elsewhere       | `Tabs` › `TabList` › `Tab`, `TabPanels` › `TabPanel` (`queryParam` keeps the tab in the URL). No page uses it today, so check it fits first                                                                                                                                                                            | `tabs`          |
| Switch a view or a value         | `SegmentedControl label options value onChange` from `@restate/ui-tabs`: one Tab stop, arrow keys move the selection. `size="md"` for the bigger switch above the invocation list and the status chart; an option's `hint` shows on hover and its `count` after the label. `Tabs` when each choice shows its own panel | `tabs`          |
| Sidebar                          | `SidebarNav`, `SidebarNavItem`                                                                                                                                                                                                                                                                                         | `layout`        |
| Trail                            | `Breadcrumbs` inside `BreadcrumbsProvider`                                                                                                                                                                                                                                                                             | `breadcrumbs`   |

**Forms**

| Job                              | Use                                                                                                                                                                                                                                                                                                                                                                | Lib              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| Text, number, date, date range   | `FormFieldInput`, `FormFieldNumberInput`, `FormFieldDateTimeInput`, `FormFieldDateTimeRangeInput`                                                                                                                                                                                                                                                                  | `form-field`     |
| Long text, JSON, code            | `FormFieldTextarea`; `FormFieldCode` (Monaco)                                                                                                                                                                                                                                                                                                                      | `form-field`     |
| One value from a list            | `FormFieldSelect` with `Option`; `FormFieldCombobox` to type and filter; `FormFieldMultiCombobox` for several                                                                                                                                                                                                                                                      | `form-field`     |
| On or off                        | `FormFieldCheckbox` in a form; `Switch` for a setting that applies at once                                                                                                                                                                                                                                                                                         | `form-field`     |
| One of a few options             | `RadioGroup` with `Radio`; `RadioCards` with `RadioCard` when options need a description                                                                                                                                                                                                                                                                           | `radio-group`    |
| Label, description, error, group | Each field's `label` and `errorMessage` props; `FormFieldLabel`, `FormFieldError` and `FormFieldGroup` when you compose by hand                                                                                                                                                                                                                                    | `form-field`     |
| Filter a list                    | `FilterBuilder`, `AddFilterTrigger`, `FilterChip`, `FilteredResultsCaption`; `readFilterClauses` and `writeFilterClauses` keep filters in the URL. `AddFilterTrigger variant="toolbar"` is the compact field in a panel toolbar: a search icon, chips beside the field and a small popover. Import from `filter-builder`, not from `query-builder`, which it wraps | `filter-builder` |

**Overlays**

| Job                      | Use                                                                                                                                                                                                                                                                                                | Lib       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Dialog                   | `Dialog` (or `QueryDialog query="…"` when a search param opens it) › `DialogTrigger` + `DialogContent` › `DialogTitle`, content, `DialogFooter`, `DialogClose`. Width is layout, set with `className`: 24rem by default (confirmations), `max-w-lg` for forms, `max-w-3xl` for wide forms and code | `dialog`  |
| Confirm a risky action   | `ConfirmationDialog` or `ConfirmationQueryDialog` with `submitVariant="destructive"`; `alertIntent` and `alertContent` add a `Callout`                                                                                                                                                             | `dialog`  |
| Confirmed mutation       | `withConfirmation({…})` returns a `Trigger` and a `Dialog`. When the user has turned confirmations off, the trigger runs the mutation after a countdown toast they can cancel                                                                                                                      | `dialog`  |
| Interactive popover      | `Popover` › `PopoverTrigger` + `PopoverContent`; `PopoverHoverTrigger` opens it on hover                                                                                                                                                                                                           | `popover` |
| Short hint               | `Tooltip` › `TooltipTrigger` + `TooltipContent`: opens on hover and on keyboard focus                                                                                                                                                                                                              | `tooltip` |
| Extra detail on hover    | `HoverTooltip content={…}`: mouse only, so never the only place for something a keyboard user needs                                                                                                                                                                                                | `tooltip` |
| Hint on a link or preset | `HintTooltip hint={…}`: opens after 1 s and hides once pressed, so it never covers a click; renders only its children when there is no hint                                                                                                                                                        | `tooltip` |
| Explain a term or field  | `InlineTooltip title description learnMoreHref`                                                                                                                                                                                                                                                    | `tooltip` |
| Side panel               | `ComplementaryWithSearchParam paramName="…"`                                                                                                                                                                                                                                                       | `layout`  |

**Feedback and status**

| Job                          | Use                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Lib                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| Status label                 | `Badge intent="neutral" \| "info" \| "success" \| "warning" \| "danger"`, `size="xs" \| "sm" \| "md"`; `mono` for IDs, versions and URLs, `borderless` for the quiet tags in table cells                                                                                                                                                                                                                                                                                                                                                                                                                                             | `badge`            |
| Toast after an action        | `showSuccessNotification`, `showErrorNotification`, `showInfoNotification`, `showWarningNotification`, `showPendingNotification`, `showProgressNotification`, `showCountdownNotification`                                                                                                                                                                                                                                                                                                                                                                                                                                            | `notification`     |
| Request error                | `ErrorBanner error={…}` (or `errors={[…]}`): a rounded box with left-aligned text, also inside a centered `EmptyState`; `InlineError` next to a control; `ErrorBoundary` and `CrashError` for a crashed route                                                                                                                                                                                                                                                                                                                                                                                                                        | `error`            |
| Show more, details on demand | `Disclosure open defaultOpen onOpenChange disabled` with a `DisclosureTrigger` and a `DisclosurePanel`. Trigger `variant`: `ghost` (a quiet "Error details ▾" below content), `inline` (inside a sentence, in its color), `row` (the whole row of a card, the chevron at its right edge; it has no text, so its type requires `aria-label` or `aria-labelledby`). `DisclosurePanel animated` slides its height. `CollapsibleSection` and `Details` (a card whose `Summary` row opens it) are built on it. A row that also holds other controls, such as the state editor's key rows, puts its own `slot="trigger"` button under them | `disclosure`       |
| Nothing to show              | `EmptyState title description icon intent`, with actions as children                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `empty-state`      |
| Loading                      | `Spinner`; `Ellipsis`; `isLoading` on `PanelTable` shows skeleton rows. `Skeleton shape` stands in for content that is still loading: `text` (a line), `pill` (a value or chip), `block` (a row or field), `card` (a card); its size and display come from `className`                                                                                                                                                                                                                                                                                                                                                               | `loading`, `table` |
| Callout in content           | `Callout intent title` (`info`, `success`, `warning`, `danger`): a tinted box with the intent's icon. `title` is a bold lead-in, `icon` swaps the icon, `isPending` shows a spinner in its place while the message loads                                                                                                                                                                                                                                                                                                                                                                                                             | `callout`          |
| Live status dot              | `StatusDot intent pulse`: a small dot in the intent's color; `icon` swaps the dot for an icon (the health triangle), `label` names it for screen readers                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `loading`          |
| Service issues               | `IssueBadge`, `IssuesBannerStack`, `IssueBannerPill`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `issue-banner`     |

**Data display**

| Job                       | Use                                                                                                                                                                                                                                                                                                                                                                                                         | Lib                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Table                     | `PanelTable`: columns, sorting, selection, tree rows, virtualization, loading, empty and error states. Never a raw `<table>`. A `Cell` cuts its content with an ellipsis; `overflow="visible"` lets a menu, a focus ring or a chip draw outside it, and `align="top"` lines up rows whose cells wrap                                                                                                        | `table`              |
| Details as key-values     | `Card` › `CardHeader` + `CardRow`, `CardLinkRow`, `CardButtonRow`, `CardHeroValue`; lay cards out with `CardGrid`. A row's plain text value gets the value style (12 px, tertiary, tabular numbers); pass an element for anything else. A hero row takes `label` like any row                                                                                                                               | `card`               |
| Settings group            | `Section` › `SectionTitle` + `SectionContent`                                                                                                                                                                                                                                                                                                                                                               | `section`            |
| Page panel with a toolbar | `ContentPanel` › `ContentPanelToolbar`, `ContentPanelHeader`, `ContentPanelBody`, `ContentPanelSection`. `ContentPanelBody bottomSpace` leaves room below a list so its last rows scroll clear of the window's edge; leave it off for content that fills the panel, such as the journal or the playground. `ContentPanelToolbar variant="search"` spaces a toolbar that leads with a search or filter field | `content-panel`      |
| Chip, tag, target         | `ChipGroup` with `Chip` or `ChipSegment tone`                                                                                                                                                                                                                                                                                                                                                               | `chip`               |
| Code                      | `Code` (a block); `Snippet language` with `SnippetCopy size`, which sits beside the code; for several languages, a `SegmentedControl` and a `Copy` above the block, as in the playground's code samples, or `SnippetTabs languages defaultLanguage`, which puts the `SegmentedControl` above the code its children render. Put the `Code` block inside the children, so the switch stays outside it         | `code`               |
| Editor                    | `Editor` (Monaco, loaded on demand)                                                                                                                                                                                                                                                                                                                                                                         | `editor`             |
| Long text and IDs         | `TruncateWithTooltip` (cuts the end), `TruncateMiddle` (keeps both ends)                                                                                                                                                                                                                                                                                                                                    | `tooltip`            |
| Dates                     | `RelativeDate`, `DateTooltip`                                                                                                                                                                                                                                                                                                                                                                               | `tooltip`            |
| Charts                    | `Chart` or `ResponsiveChart` with `TimeXAxis`, `ValueYAxis`, `Series`, `BarTimeSeries`, `Pie` and `Slice`                                                                                                                                                                                                                                                                                                   | `charts`             |
| Schemas                   | `JsonSchemaTree`, `MarkdownDescription`; `JsonSchemaViewer` and `API` (Stoplight Elements, loaded on demand)                                                                                                                                                                                                                                                                                                | `json-schema`, `api` |
| Icons                     | `Icon name={IconName.X} size="sm"` (lucide). `size`: `2xs` 10 px (next to small text), `xs` 12 px, `sm` 14 px (rows), `md` 16 px (buttons), `lg` 20 px (callouts); without it the icon follows the font size. `tone` quiets it: `secondary`, `tertiary`, `muted` or `subtle` gray, or `dimmed`, its label's own color at 80% (icons in action menus and buttons). Add new icons to the `IconName` enum      | `icons`              |

**Domain widgets.** `RestateServer`, `MetricComparison`, `PanelTableQuickOpen`, `timeline-zoom` and `wave-animation` were built for particular Restate screens. Use them where they fit; don't treat them as general building blocks.

### Patterns

| Screen           | Recipe                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| List page        | `ListPageHeader`, then filters (`FilterBuilder`), then `PanelTable` in a `ContentPanel`; `EmptyState` when empty, `ErrorBanner` on error |
| Details page     | `Header`, then a `CardGrid` of `Card`s with `CardRow`s; sub-pages with `Nav`                                                             |
| Settings         | `Section`s with `SectionTitle`. A setting lives in its section; link to it rather than opening the same list in a dialog                 |
| Create something | A `Dialog` with fields and a `SubmitButton`; on success close it and call `showSuccessNotification`                                      |
| Risky action     | `ConfirmationDialog` with `submitVariant="destructive"` and a short list of what happens, or `withConfirmation`                          |
| Two-step flow    | No stepper. The second screen's heading names the choice, with a small back link above it                                                |

### Anatomy and composition

- **Compound components:** a root plus parts named `<Root><Part>`: `Card` and `CardHeader`, `Dialog` and `DialogContent`, `Dropdown` and `DropdownItem`. Parts read the root's context (`Card` hands its `intent` to `CardHeader`), so don't pass the same prop to every part.
- **Overlays** are a trigger plus content from the same lib: `DialogTrigger` + `DialogContent`, `PopoverTrigger` + `PopoverContent`, `TooltipTrigger` + `TooltipContent`.
- **Config components** with many props (`ConfirmationDialog`, `PanelTable`, `FilterBuilder`) are for flows that repeat across pages. For anything else, prefer composition.

### Component API conventions

New components follow these names, and so does any prop you add or change. The last column lists today's exceptions. When you touch one, add the standard prop and keep the old one as a deprecated alias for a release.

| Concept                   | Prop                                  | Values                                                                                              | Exceptions today                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Look and emphasis         | `variant`                             | Per component: `primary`, `secondary`, `destructive`, `icon`, `ghost`                               | —                                                                                                                                                                                                                                                                                                                                                          |
| Status meaning            | `intent`                              | `neutral`, `info`, `success`, `warning`, `danger`, `pending` (`Intent` from `@restate/util-styles`) | `IssueBannerPill severity` (the issue's own field); `Card` adds `none` for no status; `Badge variant` still works but is deprecated                                                                                                                                                                                                                        |
| Size                      | `size`                                | `xs`, `sm`, `md`, `lg`, `md` by default; `Icon`, icon buttons and `Copy` add `2xs`                  | `TooltipContent size="default"`, `SplitButton mini`; `DialogContent` and `PopoverContent` take their width from `className`, `Skeleton` its size; `Spinner` defaults to `lg`, `SegmentedControl` to `sm`; without `size`, `Icon` follows the font size, `Copy` and `SnippetCopy` keep their old look and place, and an icon `Button` pads its icon by 4 px |
| A quieter shade of a part | `tone`                                | Per component                                                                                       | `FilterChip appearance`, `FocusShortcutKey variant`                                                                                                                                                                                                                                                                                                        |
| HTML-like flags           | `disabled`, `required`, `readonly`    | boolean                                                                                             | `DropdownItem isDisabled`; `Switch` takes React Aria props                                                                                                                                                                                                                                                                                                 |
| Async flags               | `isPending`, `isLoading`              | boolean                                                                                             | —                                                                                                                                                                                                                                                                                                                                                          |
| Open state                | `open`, `defaultOpen`, `onOpenChange` |                                                                                                     | `Popover`, `Dropdown` and `Tooltip` use `isOpen`; `CollapsibleSection` uses `isExpanded`                                                                                                                                                                                                                                                                   |
| Value                     | `value`, `defaultValue`, `onChange`   |                                                                                                     | `Tabs` (`selectedTab`, `onTabChange`), `FormFieldSelect` (`selectedKey`), `ListBox` and `DropdownMenu` (`selectedItems`)                                                                                                                                                                                                                                   |
| Menu action               | `onSelect(key)`                       |                                                                                                     | —                                                                                                                                                                                                                                                                                                                                                          |
| Press                     | `onClick` (React Aria's `onPress`)    |                                                                                                     | —                                                                                                                                                                                                                                                                                                                                                          |
| Icon                      | `icon` (an `IconName`)                |                                                                                                     | `PanelTableQuickOpen iconName`                                                                                                                                                                                                                                                                                                                             |
| Accessible name           | `aria-label`, `aria-labelledby`       |                                                                                                     | `InlineTooltip ariaLabel`, `PanelTableQuickOpen ariaLabel`, `Header iconLabel`                                                                                                                                                                                                                                                                             |
| Ref                       | `ref` as a plain prop (React 19)      |                                                                                                     | Most existing components use `forwardRef`                                                                                                                                                                                                                                                                                                                  |
| Styling hook              | `className` on the root, layout only  |                                                                                                     | About 20 part-level props (`iconClassName`, `contentClassName`, `popoverClassName`…). Don't add new ones; add a variant                                                                                                                                                                                                                                    |

Types: export the props as `<Name>Props`, and type closed sets as string unions (`'sm' | 'md'`), not `string`.

### Styling inside a component

- **One `tv()` per component,** imported from `@restate/util-styles`. Parts are `slots`, options are `variants` with `defaultVariants`, combinations are `compoundVariants`. Never build class names with template literals; `restate/no-classname-template-literal` rejects them.
- **React Aria state** comes through render props: `className={composeRenderProps(className, (className, state) => styles({ ...state, variant, className }))}`. Style states with the React Aria variants (`pressed:`, `selected:`, `disabled:`, `invalid:`, `highlighted:`, `entering:`, `exiting:`) and focus with `extend: focusRing` from `@restate/ui-focus`.
- **Share looks by extending, not copying.** When two components must look alike, export the style function and `extend` it: `Link`'s button variants extend `buttonStyles` from `@restate/ui-button`.
- **Why the layout-only rule matters:** `tv()` merges the caller's `className` last, and tailwind-merge lets it win every conflict. An override is one prop away, so the component's API has to cover real needs.

### States

Interactive components handle rest, hover, pressed, focus-visible and disabled, plus selected, invalid, pending, empty and error where they apply. Disabled controls stay visible (`text-subtle`); a pending button shows a `Spinner` and stays disabled, which `SubmitButton` does for you.

### Gaps

No open gaps. When a job has no shared component yet, or call sites still build their own, list it here with what to use today.

## Accessibility

- **Use our components or React Aria, not raw elements.** Never put `onClick` on a `div` or `span`; use `Button` or `Link`.
- **Icon-only controls have an `aria-label`.** `Icon` is always `aria-hidden`, and tooltip text doesn't name a button. Lint (`restate/icon-button-label`) rejects a `Button` or `Link` with `variant="icon"` whose content is only icons and that has no `aria-label` or `aria-labelledby`. React Aria names the buttons in its `chevron`, `increment`, `decrement`, `remove`, `previous` and `next` slots; a `trigger` or `close` slot still needs a name.
- **Form controls have a label.** Put a checkbox's label in `FormFieldCheckbox`'s children, which also names the checkbox.
- **Tooltips add, they don't carry.** `HoverTooltip` opens on mouse hover only. Anything a keyboard user needs goes in the label, on the page, or in a `Tooltip` or `InlineTooltip`, which also open on focus.
- **Focus stays visible.** Use `focusRing`, and never remove an outline without a replacement.
- **Color is never the only signal.** Pair it with text or an icon, as `Badge` and the status icons do.
- **Motion respects `prefers-reduced-motion`** (see [Motion](#motion--micro-interaction)).
- **Dialogs** have a `DialogTitle`, close on Escape and close on a backdrop click (`DialogContent` is dismissable by default). Turn that off only while a request is pending, or on a step that shows a one-time secret.
- **Targets:** icon buttons are at least 24 × 24 px, or spaced so their targets don't overlap (WCAG 2.5.8).
- **Check with axe.** Storybook's Accessibility panel runs axe on every story.

### Open findings

axe on every story and on the main pages (November 2026) still reports these. They need design or structural changes, so they stay listed here until fixed. Hints that fit the design are left out, such as a search field named by a hidden label, or the page behind an open popover being hidden.

| Finding                                                   | Where                                                                                                                                                                                                                                                                       | Fix                                                   |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Text below 4.5:1 contrast                                 | `text-subtle` on light surfaces (2.3–2.6:1); success and warning text in callouts and notifications (3.1–3.9:1); `text-muted` on tinted surfaces (4.1–4.4:1); `text-danger` error text on the page background (4.3:1); `text-accent` on `bg-accent-subtle` in dark (4.35:1) | Darker role tokens, decided with design               |
| Tabs point `aria-controls` at panels that aren't rendered | Overview, invocation, service and state tabs                                                                                                                                                                                                                                | Render the content in `TabPanel`s                     |
| Scrollable code isn't focusable                           | Error and result code blocks                                                                                                                                                                                                                                                | Make the scroll container focusable                   |
| The confirmation checkbox is labelled from outside        | "Skip this confirmation in the future"                                                                                                                                                                                                                                      | Pass the text as `FormFieldCheckbox` children         |
| Menu section titles are `<header>` landmarks              | `DropdownSection`: a menu with two sections has two banners                                                                                                                                                                                                                 | Put the title and items in React Aria's `MenuSection` |
| A list box section adds an empty disabled option          | `ListBoxSection`                                                                                                                                                                                                                                                            | Drop the spacer option                                |
| Row headers without text                                  | `PanelTable` skeleton rows while loading, and the child rows of tree tables                                                                                                                                                                                                 | Give them a visually hidden name                      |
| A toggle's name leaves out its visible text               | "Collapse items" in JSON schemas                                                                                                                                                                                                                                            | Name it from the visible text                         |
| Two `<aside>` landmarks without names                     | The sidebar next to an open side panel                                                                                                                                                                                                                                      | Name each one                                         |
| The API playground's own markup                           | Stoplight Elements: unnamed buttons, an unlabelled input, a scroll area without keyboard access                                                                                                                                                                             | Fix in the Elements fork                              |

## Do's and Don'ts

- Do reuse the component that a shipped page uses for the same job. A component that sits in `libs/ui` with no page using it isn't proof that it fits.
- Do fix spacing, alignment and repeated headings before proposing a new layout.
- Do put a list or setting in the section that already has it, and link there.
- Don't add a stepper for two steps.
- Don't stack translucent tints to show nesting; use thin guide lines.
- Don't beat a component's styles with `!` or long `className` overrides; add a variant.
- Don't add `text-[…]`, `z-[…]` or `shadow-[…]` values that repeat a token or a recipe.
- Don't use `dark:` for colors.
- Don't build a screen around one library's handler names or table layout.

## Contributing

### Where code goes

- **Start in the feature lib.** Move a component to `libs/ui` when a second feature needs it, and make it generic then: plain props, no feature data.
- **`libs/ui` stays generic:** no data fetching, no imports from features or data-access, no Restate entities beyond their types.
- **One lib per component family,** `@restate/ui-<name>`, created with the Nx generator as `AGENTS.md` describes.

### Checklist for a new or changed component

1. The API follows the [conventions](#component-api-conventions), with props exported as `<Name>Props`.
2. Styles are one `tv()`; nothing is copied from another component.
3. Keyboard, focus and screen reader work, and icon-only parts have an `aria-label`.
4. It works in light and dark: check its stories and the pages you touched in both themes.
5. A spec covers behavior (keyboard, states) with Testing Library.
6. A story in `apps/storybook/src/<group>/<Name>.stories.tsx` shows its variants and states; overlays open in the story's `play` function.
7. This file is updated: the catalog row, and the gaps table if you closed a gap.
8. Breaking changes keep the old prop as an alias marked `/** @deprecated use … */` while another app still uses it: the Cloud console picks up these libs later, so search it for the old name first, and drop the alias once nothing there uses it. Callers in this repo move in the same PR or the next.
9. The PR shows before and after screenshots.

Two CI checks keep this file true:

- **The restyle count can't go up.** The Static Analyzis job counts the calls that restyle a shared component through a literal `className` string (`pnpm run design-system-report`) and compares the total with the merge base. A change that raises it fails and names the components; add a prop or a variant instead. A change that removes as many restyles as it adds passes. Computed values, such as a `tv()` call or a conditional, aren't counted, so reviewers check those. Locally: `pnpm run design-system-report --base origin/main`.
- **Every story renders.** The Unit tests job renders each story in jsdom, runs its `play` function and checks the result with axe (`pnpm nx test storybook`). jsdom has no layout: color contrast isn't checked, and a story whose `play` needs real sizes takes `tags: ['!test']`. An [open finding](#open-findings)'s axe rule is skipped only in the story files where it still fires (`OPEN_FINDINGS` in `apps/storybook/stories.spec.tsx`); when you close a finding, remove its entries there so it can't come back.
