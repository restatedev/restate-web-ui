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
- `libs/ui` takes plain props and doesn't import `@restate/features-*` or `@restate/data-access-*`. Two old imports break this (`ui-issue-banner` → `features-system-health`, `ui-dialog` → `features-user-preference`); don't add more.
- Some theme pieces live in the app, not in util-styles: the `text-3xs`, `text-2xs` and `text-0.5xs` sizes, the keyframes, the `3xl` breakpoint and the `@tall:` variant are in `apps/web-ui/app/tailwind.css`, so any other app that uses these libs has to copy them. **Planned:** move them into `@restate/util-styles`, so both apps import one theme.
- Storybook shows every shared component with its variants and states, in both themes: `pnpm nx serve storybook`, stories in `apps/storybook/src`. The dev server shows the color tokens at `/ui/design-system`.

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

| Role            | Today                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------- |
| List page title | `ListPageHeader`: `text-sm font-semibold` in an accent pill, description `text-sm text-muted` |
| Dialog title    | `text-lg leading-6 font-medium text-primary` on the `slot="title"` heading                    |
| Field label     | `FormFieldLabel` (or a field's `label` prop): `text-sm font-medium text-secondary`            |
| Section title   | `SectionTitle`: `text-xs font-semibold uppercase text-subtle`                                 |
| Card title      | `CardHeader title`: `text-xs font-semibold`                                                   |
| Empty state     | `EmptyState`: title `text-base font-semibold`, description `text-sm text-muted`               |
| Caption         | `text-xs text-muted`                                                                          |
| Code and IDs    | `font-mono` at the size of its context                                                        |
| Numbers         | add `tabular-nums` in columns, counters and durations                                         |

- Don't add font sizes. `text-[…]` is for illustrations only: `text-[0.8125rem]` is `text-0.5xs`, and `text-[0.6875rem]` is `text-2xs`.
- **Planned:** named text roles in util-styles (title, label, caption) and a dialog title part, so the role classes stop being copied.

## Layout

The app shell comes from `@restate/ui-layout`:

- `LayoutProvider` sets up the shell, and `LayoutOutlet zone={LayoutZone.…}` renders into one of its zones: `AppBar`, `Nav`, `SideBar`, `Toolbar`, `Content` or `Complementary`. `SidebarNav` and `SidebarNavItem` build the sidebar. The layouts also render `NotificationRegion`.
- `ComplementaryWithSearchParam` docks a side panel that a search param opens.
- `ListPageHeader` heads list pages; `Header` is the sticky, status-tinted header of a details page; `Breadcrumbs` shows the trail.

Spacing uses Tailwind's 4 px scale; don't write arbitrary spacing values. A heading sits at least as far from its first section as the sections sit from each other.

Control heights today:

| Control                                    | Height | Classes                               |
| ------------------------------------------ | ------ | ------------------------------------- |
| Text field, select                         | 34 px  | `py-1.5 text-sm`                      |
| `Button` (primary, secondary, destructive) | 38 px  | `px-5 py-2 text-sm`                   |
| Tab in `@restate/ui-tabs`                  | 28 px  | `px-3 py-1 text-sm`                   |
| Toolbar icon button                        | 26 px  | `h-6.5 w-6.5 rounded-lg p-0`, by hand |

A button next to a field is 4 px taller, and small buttons are restyled by hand. **Planned:** one control size scale (`size="sm" | "md"`) for buttons, icon buttons and fields, so a row of controls lines up without overrides.

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
- The keyframes (`countdown`, `pulseButton`, `scanlineSweep`, `memoryScan` and others) live in the app's `tailwind.css`. Reuse one before adding a near-duplicate. **Planned:** move them into util-styles with a global `prefers-reduced-motion` rule.

## Voice & Content Strategy

- **Sentence case everywhere:** headings, buttons, menu items, labels ("Register deployment", "Create key").
- **Terms match the API, the CLI and the docs.** Rename a term everywhere at once or not at all. To tell two similar things apart, add a qualifier ("admin URL", "ingress URL"), not a new word.
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

| Job                                   | Use                                                                                                                                          | Lib                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Main, secondary or destructive action | `Button variant="primary" \| "secondary" \| "destructive"`                                                                                   | `button`                  |
| Submit a form                         | `SubmitButton`: shows a spinner and disables itself while the form's fetcher or mutation runs                                                | `button`                  |
| Icon-only action                      | `Button variant="icon" aria-label="…"`. Toolbar size today: `className="h-6.5 w-6.5 rounded-lg p-0"`. **Planned:** `size`                    | `button`                  |
| Action with alternatives              | `SplitButton menus={…}`                                                                                                                      | `split-button`            |
| Menu of actions                       | `Dropdown` › `DropdownTrigger` + `DropdownPopover` › `DropdownSection` › `DropdownMenu` › `DropdownItem` (`destructive` for dangerous items) | `dropdown`                |
| Risky action with confirmation        | `ConfirmationDialog`, or `withConfirmation` (below)                                                                                          | `dialog`                  |
| Copy a value                          | `Copy copyText`; `SnippetCopy` in snippets; `TruncateWithTooltip copyText` for long IDs                                                      | `copy`, `code`, `tooltip` |
| Keyboard shortcut                     | `useSubmitShortcut`, `useFocusShortcut`, with `SubmitShortcutKey` or `FocusShortcutKey` as the hint                                          | `keyboard`                |

**Navigation**

| Job                           | Use                                                                                                                                                            | Lib             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Link in text                  | `Link`. A `?…` href merges into the current search params (`preserveQueryParams`, on by default); pass an array of names to carry those params to another path | `link`          |
| Link that looks like a button | `Link variant="button" \| "secondary-button" \| "destructive-button" \| "icon"`                                                                                | `link`          |
| Sub-pages of a page           | `Nav` with `NavItem` (paths) or `NavSearchItem` (a search param value)                                                                                         | `nav`           |
| Tabs in a panel               | `ContentPanel tabs={…}`                                                                                                                                        | `content-panel` |
| Tabs with panels elsewhere    | `Tabs` › `TabList` › `Tab`, `TabPanels` › `TabPanel` (`queryParam` keeps the tab in the URL). No page uses it today, so check it fits first                    | `tabs`          |
| Switch a view or a value      | No shared segmented control yet; six local ones exist. **Planned:** `SegmentedControl` in `@restate/ui-tabs`. Build that one rather than a seventh copy        | —               |
| Sidebar                       | `SidebarNav`, `SidebarNavItem`                                                                                                                                 | `layout`        |
| Trail                         | `Breadcrumbs` inside `BreadcrumbsProvider`                                                                                                                     | `breadcrumbs`   |

**Forms**

| Job                              | Use                                                                                                                                                                                                                       | Lib              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Text, number, date, date range   | `FormFieldInput`, `FormFieldNumberInput`, `FormFieldDateTimeInput`, `FormFieldDateTimeRangeInput`                                                                                                                         | `form-field`     |
| Long text, JSON, code            | `FormFieldTextarea`; `FormFieldCode` (Monaco)                                                                                                                                                                             | `form-field`     |
| One value from a list            | `FormFieldSelect` with `Option`; `FormFieldCombobox` to type and filter; `FormFieldMultiCombobox` for several                                                                                                             | `form-field`     |
| On or off                        | `FormFieldCheckbox` in a form; `Switch` for a setting that applies at once                                                                                                                                                | `form-field`     |
| One of a few options             | `RadioGroup` with `Radio`; `RadioCards` with `RadioCard` when options need a description                                                                                                                                  | `radio-group`    |
| Label, description, error, group | Each field's `label` and `errorMessage` props; `FormFieldLabel`, `FormFieldError` and `FormFieldGroup` when you compose by hand                                                                                           | `form-field`     |
| Filter a list                    | `FilterBuilder`, `AddFilterTrigger`, `FilterChip`, `FilteredResultsCaption`; `readFilterClauses` and `writeFilterClauses` keep filters in the URL. Import from `filter-builder`, not from `query-builder`, which it wraps | `filter-builder` |

**Overlays**

| Job                     | Use                                                                                                                                                                           | Lib       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Dialog                  | `Dialog` (or `QueryDialog query="…"` when a search param opens it) › `DialogTrigger` + `DialogContent` › content, `DialogFooter`, `DialogClose`                               | `dialog`  |
| Confirm a risky action  | `ConfirmationDialog` or `ConfirmationQueryDialog` with `submitVariant="destructive"`; `alertType` and `alertContent` add the warning box                                      | `dialog`  |
| Confirmed mutation      | `withConfirmation({…})` returns a `Trigger` and a `Dialog`. When the user has turned confirmations off, the trigger runs the mutation after a countdown toast they can cancel | `dialog`  |
| Interactive popover     | `Popover` › `PopoverTrigger` + `PopoverContent`; `PopoverHoverTrigger` opens it on hover                                                                                      | `popover` |
| Short hint              | `Tooltip` › `TooltipTrigger` + `TooltipContent`: opens on hover and on keyboard focus                                                                                         | `tooltip` |
| Extra detail on hover   | `HoverTooltip content={…}`: mouse only, so never the only place for something a keyboard user needs                                                                           | `tooltip` |
| Explain a term or field | `InlineTooltip title description learnMoreHref`                                                                                                                               | `tooltip` |
| Side panel              | `ComplementaryWithSearchParam paramName="…"`                                                                                                                                  | `layout`  |

**Feedback and status**

| Job                   | Use                                                                                                                                                                                                                              | Lib                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Status label          | `Badge variant="success" \| "danger" \| "info" \| "warning" \| "default"`, `size="xs" \| "sm" \| "base"`                                                                                                                         | `badge`            |
| Toast after an action | `showSuccessNotification`, `showErrorNotification`, `showInfoNotification`, `showWarningNotification`, `showPendingNotification`, `showProgressNotification`, `showCountdownNotification`                                        | `notification`     |
| Request error         | `ErrorBanner error={…}` (or `errors={[…]}`); `InlineError` next to a control; `ErrorBoundary` and `CrashError` for a crashed route                                                                                               | `error`            |
| Nothing to show       | `EmptyState title description icon intent`, with actions as children                                                                                                                                                             | `empty-state`      |
| Loading               | `Spinner`; `Ellipsis`; `isLoading` on `PanelTable` shows skeleton rows. Skeleton bars today: `animate-pulse rounded-full bg-emphasis/70`. **Planned:** `Skeleton`                                                                | `loading`, `table` |
| Callout in content    | None yet. Today: `rounded-xl border border-F bg-F-subtle p-3 text-0.5xs text-F` with the icon `fill-F text-on-F` (F = `info`, `warning`…). **Planned:** `Callout intent` built from `ConfirmationDialog`'s private `AlertBanner` | —                  |
| Live status dot       | `Indicator status`. **Planned:** `StatusDot intent pulse` to replace it and four local copies                                                                                                                                    | `loading`          |
| Service issues        | `IssueBadge`, `IssuesBannerStack`, `IssueBannerPill`                                                                                                                                                                             | `issue-banner`     |

**Data display**

| Job                       | Use                                                                                                                                                                                                              | Lib                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Table                     | `PanelTable`: columns, sorting, selection, tree rows, virtualization, loading, empty and error states. Never a raw `<table>`                                                                                     | `table`              |
| Details as key-values     | `Card` › `CardHeader` + `CardRow`, `CardLinkRow`, `CardButtonRow`, `CardHeroValue`; lay cards out with `CardGrid`                                                                                                | `card`               |
| Settings group            | `Section` › `SectionTitle` + `SectionContent`                                                                                                                                                                    | `section`            |
| Page panel with a toolbar | `ContentPanel` › `ContentPanelToolbar`, `ContentPanelHeader`, `ContentPanelBody`, `ContentPanelSection`                                                                                                          | `content-panel`      |
| Chip, tag, target         | `ChipGroup` with `Chip` or `ChipSegment tone`                                                                                                                                                                    | `chip`               |
| Code                      | `Code` (a block); `Snippet language` with `SnippetCopy`; `SnippetTabs` for several languages                                                                                                                     | `code`               |
| Editor                    | `Editor` (Monaco, loaded on demand)                                                                                                                                                                              | `editor`             |
| Long text and IDs         | `TruncateWithTooltip` (cuts the end), `TruncateMiddle` (keeps both ends)                                                                                                                                         | `tooltip`            |
| Dates                     | `RelativeDate`, `DateTooltip`                                                                                                                                                                                    | `tooltip`            |
| Charts                    | `Chart` or `ResponsiveChart` with `TimeXAxis`, `ValueYAxis`, `Series`, `BarTimeSeries`, `Pie` and `Slice`                                                                                                        | `charts`             |
| Schemas                   | `JsonSchemaTree`, `MarkdownDescription`; `JsonSchemaViewer` and `API` (Stoplight Elements, loaded on demand)                                                                                                     | `json-schema`, `api` |
| Show more                 | No single component: `Details`, `CollapsibleSection` and React Aria `Disclosure` all exist. **Planned:** one `Disclosure`                                                                                        | `details`, `section` |
| Icons                     | `Icon name={IconName.X} size="sm"` (lucide). `size`: `xs` 12 px, `sm` 14 px (rows), `md` 16 px (buttons), `lg` 20 px (callouts); without it the icon follows the font size. Add new icons to the `IconName` enum | `icons`              |

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

| Concept                   | Prop                                  | Values                                                       | Exceptions today                                                                                                                                                           |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Look and emphasis         | `variant`                             | Per component: `primary`, `secondary`, `destructive`, `icon` | —                                                                                                                                                                          |
| Status meaning            | `intent`                              | `neutral`, `info`, `success`, `warning`, `danger`, `pending` | `Badge variant`, `Header variant`, `Indicator status` (uppercase), `ConfirmationDialog alertType`, `IssueBannerPill severity`; `Card` says `default` or `none` for neutral |
| Size                      | `size`                                | `xs`, `sm`, `md`, `lg`; `md` is the default                  | `Badge size="base"`, `TooltipContent size="default"`, `SplitButton mini`; `Button`, `Spinner` and `DialogContent` have no size                                             |
| A quieter shade of a part | `tone`                                | Per component                                                | `FilterChip appearance`, `FocusShortcutKey variant`                                                                                                                        |
| HTML-like flags           | `disabled`, `required`, `readonly`    | boolean                                                      | `DropdownItem isDisabled`; `Switch` takes React Aria props                                                                                                                 |
| Async flags               | `isPending`, `isLoading`              | boolean                                                      | —                                                                                                                                                                          |
| Open state                | `open`, `defaultOpen`, `onOpenChange` |                                                              | `Popover`, `Dropdown` and `Tooltip` use `isOpen`; `CollapsibleSection` uses `isExpanded`                                                                                   |
| Value                     | `value`, `defaultValue`, `onChange`   |                                                              | `Tabs` (`selectedTab`, `onTabChange`), `FormFieldSelect` (`selectedKey`), `ListBox` and `DropdownMenu` (`selectedItems`)                                                   |
| Menu action               | `onSelect(key)`                       |                                                              | —                                                                                                                                                                          |
| Press                     | `onClick` (React Aria's `onPress`)    |                                                              | —                                                                                                                                                                          |
| Icon                      | `icon` (an `IconName`)                |                                                              | `PanelTableQuickOpen iconName`                                                                                                                                             |
| Accessible name           | `aria-label`, `aria-labelledby`       |                                                              | `InlineTooltip ariaLabel`, `PanelTableQuickOpen ariaLabel`, `Header iconLabel`                                                                                             |
| Ref                       | `ref` as a plain prop (React 19)      |                                                              | Most existing components use `forwardRef`                                                                                                                                  |
| Styling hook              | `className` on the root, layout only  |                                                              | About 20 part-level props (`iconClassName`, `contentClassName`, `popoverClassName`…). Don't add new ones; add a variant                                                    |

Types: export the props as `<Name>Props`, and type closed sets as string unions (`'sm' | 'md'`), not `string`.

### Styling inside a component

- **One `tv()` per component,** imported from `@restate/util-styles`. Parts are `slots`, options are `variants` with `defaultVariants`, combinations are `compoundVariants`. Never build class names with template literals; `restate/no-classname-template-literal` rejects them.
- **React Aria state** comes through render props: `className={composeRenderProps(className, (className, state) => styles({ ...state, variant, className }))}`. Style states with the React Aria variants (`pressed:`, `selected:`, `disabled:`, `invalid:`, `highlighted:`, `entering:`, `exiting:`) and focus with `extend: focusRing` from `@restate/ui-focus`.
- **Share looks by extending, not copying.** When two components must look alike, export the style function and `extend` it. `Link`'s button variants are copies of `Button`'s today, and the copies have already drifted. **Planned:** `buttonStyles` exported from `@restate/ui-button`.
- **Why the layout-only rule matters:** `tv()` merges the caller's `className` last, and tailwind-merge lets it win every conflict. An override is one prop away, so the component's API has to cover real needs.

### States

Interactive components handle rest, hover, pressed, focus-visible and disabled, plus selected, invalid, pending, empty and error where they apply. Disabled controls stay visible (`text-subtle`); a pending button shows a `Spinner` and stays disabled, which `SubmitButton` does for you.

### Gaps

| Need                   | Today                                                     | Planned                                                                              |
| ---------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Small and icon buttons | Sizes and radius rewritten in `className` on most buttons | `Button size`, icon button sizes, a `ghost` variant for text buttons without a frame |
| Callout                | The recipe above, copied about a dozen times              | `Callout intent title icon`                                                          |
| Status dot             | `Indicator` and four copies                               | `StatusDot intent pulse`                                                             |
| Skeleton               | Hand-written `animate-pulse` bars                         | `Skeleton shape`                                                                     |
| Segmented control      | Six local implementations                                 | `SegmentedControl` in `@restate/ui-tabs`                                             |
| Show more              | Three components plus native `<details>`                  | One `Disclosure`                                                                     |
| Dialog title           | The title classes copied into each dialog                 | A dialog title part                                                                  |

## Accessibility

- **Use our components or React Aria, not raw elements.** Never put `onClick` on a `div` or `span`; use `Button` or `Link`.
- **Icon-only controls have an `aria-label`.** `Icon` is always `aria-hidden`, and tooltip text doesn't name a button.
- **Tooltips add, they don't carry.** `HoverTooltip` opens on mouse hover only. Anything a keyboard user needs goes in the label, on the page, or in a `Tooltip` or `InlineTooltip`, which also open on focus.
- **Focus stays visible.** Use `focusRing`, and never remove an outline without a replacement.
- **Color is never the only signal.** Pair it with text or an icon, as `Badge` and the status icons do.
- **Motion respects `prefers-reduced-motion`** (see [Motion](#motion--micro-interaction)).
- **Dialogs** have a heading with `slot="title"`, close on Escape and close on a backdrop click (`DialogContent` is dismissable by default). Turn that off only while a request is pending, or on a step that shows a one-time secret.
- **Targets:** icon buttons are at least 24 × 24 px, or spaced so their targets don't overlap (WCAG 2.5.8).

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
8. Breaking changes keep the old prop as an alias marked `/** @deprecated use … */`, and callers move in the same PR or the next. Other apps that use these libs pick the change up later, so keep the alias until they have moved.
9. The PR shows before and after screenshots.
