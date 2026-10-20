# Design system

Every color in Restate UI comes from a role token in [`src/theme.css`](src/theme.css), which apps import as `@restate/util-styles/theme.css`. A theme only changes token values, so anything built from tokens works in every theme without `dark:` variants.

Don't use Tailwind's palette (`bg-gray-100`, `text-blue-600`, `border-black/10`, `var(--color-zinc-200)`). The `restate/no-palette-colors` lint rule rejects it.

The dev server renders every token and the shared components at `/ui/design-system`.

## Before you style anything

1. **Use a component.** `@restate/ui-*` already covers buttons (`Button`, `Link` variants), badges, cards, chips, form fields, dropdowns, popovers, dialogs, tooltips, tabs, sections, tables and notifications. Reuse them and pass `className` for layout only.
2. **Copy a recipe.** If you need something new, start from the [recipes](#recipes) below.
3. **Pick a tier, not an opacity.** To make a color lighter or darker, choose another tier (`text-muted` instead of `text-secondary/60`). Use opacity modifiers only when something must show through: frosted surfaces with `backdrop-blur`, glows that fade to transparent, overlapping layers.
4. **Don't invent colors.** If no token fits, add a token to `theme.css` named by role or tier, never by hue (`blue`) or component (`button`). It shows up on the design-system page automatically.

## Naming

Tokens are scoped to the utility that uses them, so `bg-surface`, `text-muted` and `border-default` exist but `text-surface` doesn't.

| Utilities                  | Variable namespace                         | Example             |
| -------------------------- | ------------------------------------------ | ------------------- |
| `bg`, `from`, `via`, `to`  | `--background-color-*`                     | `bg-surface`        |
| `text`, `placeholder:text` | `--text-color-*`                           | `text-muted`        |
| `border`, `divide`         | `--border-color-*`                         | `border-default`    |
| `ring` / `ring-offset`     | `--ring-color-*` / `--ring-offset-color-*` | `ring-focus`        |
| `outline`                  | `--outline-color-*`                        | `outline-focus`     |
| `fill` / `stroke`          | `--fill-*` / `--stroke-*`                  | `fill-warning`      |
| `decoration`               | `--text-decoration-color-*`                | `decoration-subtle` |
| `shadow` (color)           | `--box-shadow-color-*`                     | `shadow-default/5`  |

Apart from `ring-focus`, `outline-focus` and `shadow-default`, the fill, stroke, ring, outline and decoration tokens point at bg, text and border tokens, so those three groups carry nearly all theme values.

`theme.css` uses `@theme static`, so every token is emitted even when no class uses it. Inline styles and JavaScript can rely on `var(--text-color-muted)` existing.

In arbitrary values, use the variable: `shadow-[inset_0_1px_0_var(--background-color-surface)]`, `drop-shadow-[0_8px_16px_--theme(--box-shadow-color-default/6%)]`.

## Surfaces

### Which background?

Answer in order and stop at the first yes. The design-system page shows the same guide with light and dark swatches.

1. **Does it float above the page?** `bg-overlay`: popover, dropdown, select, combobox and dialog frames (`bg-overlay/90` when frosted). The sections inside them are `bg-surface`.
2. **Is it the page, or a rail beside it?** `bg-canvas` for the page and in-page frames (`Section`, toolbar strips, fades into the page); `bg-sunken` for the sidebar and docked side panel.
3. **Is it a panel or card on the page?** `bg-surface`; `bg-subtle` for quiet areas inside it (card bodies, content-panel bodies, the active sidebar item).
4. **Is it a control someone presses?** `bg-raised` for secondary buttons, button-styled links and chips; `bg-selected` for the selected thumb of a segmented control, tab strip or nav indicator.
5. **Is it an input or inset field?** `bg-muted`.
6. **Is it hover or pressed?** See [hover and pressed](#hover-and-pressed).
7. **Is it a status?** Use a [status family](#status-families), not a neutral layer.

### All neutral backgrounds

| Group       | Tokens (back to front)                                                   | Notes                                                                                     |
| ----------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Layers      | `sunken`, `canvas`, `subtle`, `overlay`, `surface`, `raised`, `selected` | Opaque areas. Pick by what the area is, not by how light it looks                         |
| Fills       | `muted`, `emphasis`, `strong`, `neutral`, `neutral-strong`               | Opaque fills inside a layer: fields, pressed states, skeletons, solid neutral marks       |
| Translucent | `tint-subtle`, `tint`, `tint-strong`, `backdrop`                         | Show what's underneath; hover, pressed and edges on any background; `backdrop` for scrims |
| Effects     | `highlight`, `shade`                                                     | White and black in both themes, only with an opacity on colored fills                     |
| Inverse     | `inverse`, `inverse-muted/-emphasis/-strong`, `inverse-tint*`            | Only on [inverse surfaces](#inverse-surfaces)                                             |

`bg-canvas`, `bg-overlay` and `bg-muted` are all gray-100 in the light theme, and `bg-surface`, `bg-raised` and `bg-selected` are all white, but in dark mode each is a different layer, so pick by role. A fade or mask that should blend into the toolbar or page behind it must use that layer's token (`from-canvas`), never a token that only happens to match in light.

### Contexts

Some components change what a token means for their content instead of adding public tokens. The values they read are private CSS variables in `theme.css` (`--raised-*`, `--raised-on-tint*`, `--raised-text*`, `--queued-swatch*`, `--sheen*`), listed under Internals on the design-system page. They have no utility class; never use them outside their owner.

- **`ChipSegment tone`:** `raised` (default look of a chip), `subtle` and `muted` for quieter segments such as a key or scope value. Pick a tone instead of a background.
- **`Header`:** points `bg-raised` and the chip tones at the on-tint values, so chips and buttons sit correctly on a status-tinted bar. Header chips also brighten their text tiers.
- **`swatch` utility:** on legend dots, points the queued fills at lighter swatch variants.
- **Sheens:** `Card`, `ContentPanel` tabs and tables start their gradients from `--sheen*`, which is the lighter stop in light and the flat fill in dark. Don't add new sheens; use a flat layer.

### Hover and pressed

| Where                                      | Rest            | Hover                    | Pressed                          |
| ------------------------------------------ | --------------- | ------------------------ | -------------------------------- |
| Item on `bg-surface` / `bg-subtle`         | —               | `hover:bg-muted`         | `pressed:bg-emphasis`            |
| Nav items, rows on mixed backgrounds       | —               | `hover:bg-tint-subtle`   | `pressed:bg-tint`                |
| Icon buttons                               | —               | `hover:bg-tint`          | `pressed:bg-tint-strong`         |
| Frosted inputs on a toolbar                | `bg-surface/70` | `hover:bg-surface`       | —                                |
| Items on an inverse surface                | —               | `hover:bg-inverse-tint`  | `pressed:bg-inverse-tint-strong` |
| Tinted rows (e.g. warning journal entries) | —               | `hover:bg-warning-muted` | `pressed:bg-warning-emphasis/50` |

`tint-*` tokens are translucent (black in light mode, white in dark), so they work on any background. Use them when you don't control what's underneath.

### Borders

| Token                     | Use for                                                                           |
| ------------------------- | --------------------------------------------------------------------------------- |
| `border-default`          | The default edge. A bare `border` already uses it, so you rarely need to write it |
| `border-muted`            | Very light separators, disabled fields                                            |
| `border-strong`           | Dashed placeholders, edges that must show on `bg-muted`                           |
| `border-neutral(-strong)` | Control outlines: radios, a focused group                                         |
| `border-tint(-subtle)`    | Translucent edges on raised controls: buttons, the tab indicator, floating panels |
| `border-surface`          | A cut-out ring matching the surface, e.g. a marker dot sitting on a bar           |
| `border-inverse`          | Edge of inverse panels                                                            |

Use `divide-default` or `divide-muted` between rows.

## Text

| Token            | Use for                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `text-primary`   | Headings, values, input text. Also the page's default text color |
| `text-secondary` | Field labels, emphasized body text                               |
| `text-tertiary`  | Regular body text in tables and cards, inactive tabs             |
| `text-muted`     | Descriptions, secondary metadata                                 |
| `text-subtle`    | Hints, icons, placeholders, disabled text                        |
| `text-faint`     | Decorative chevrons and separators, the lowest-emphasis marks    |

Placeholders: `placeholder:text-subtle`. Disabled: `disabled:text-subtle`.

Code uses `text-syntax-key`, `-string`, `-number`, `-keyword`, `-punctuation` and `-comment`. The editors and the playground's code samples are colored from them, so use them for any hand-rendered JSON or SQL too.

## Inverse surfaces

Tooltips, the floating query toolbar and issue pills are dark panels in both themes. Inverse tokens don't change in dark mode, and `inverse-*` belongs only on those panels: on a regular surface use `surface`, `tint` or `muted`, which flip with the theme.

- **Panel:** `bg-inverse` (or `bg-inverse/90` with `backdrop-blur-xl` when floating), `border-inverse`, top highlight `shadow-[inset_0_1px_0_0_var(--background-color-inverse-strong)]`.
- **Text:** `text-inverse` for titles, `text-inverse-secondary` for body, `text-inverse-tertiary` for quiet titles and labels, `text-inverse-muted` for small labels, `text-inverse-subtle` for separators. Never use the regular tiers (`text-faint`, `text-subtle`, `text-muted`) inside tooltips or other inverse panels, not even with `!`: they flip in dark mode and become unreadable there.
- **Inner chips:** `bg-inverse-muted`. **Interactive items:** `inverse-tint-subtle` < `inverse-tint` < `inverse-tint-strong`.
- **Colored text on inverse:** use the `-subtle` text tier (`text-danger-subtle`), because the base tier is too dark there.

## Status families

| Family    | Means                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `accent`  | Interactive and brand: primary buttons, links, selection, the active nav item, focus                                               |
| `info`    | Informational status and running work: info badges and banners, running invocations                                                |
| `success` | Succeeded, healthy                                                                                                                 |
| `warning` | Something went wrong but is recoverable, or needs care: retries, backing off, transient errors, confirmations before risky actions |
| `danger`  | Failed, errors, invalid input, destructive actions                                                                                 |
| `pending` | Waiting its turn: inbox and pending invocations, blocked queues, degraded health                                                   |

`accent` and `info` are both blue today. Keep them apart anyway: one is "you can click this", the other is "this is the state".

Every family has the same tiers (shown here as `F`):

| Tier                  | `bg-F-*`                                      | `text-F-*`                                  | `border-F-*`                                           |
| --------------------- | --------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| `-subtle`             | Tinted panels, badges, banners                | Light icons, colored text on inverse        | —                                                      |
| `-muted`              | Hover on a tinted panel, tinted chips         | —                                           | —                                                      |
| `-emphasis`           | Pressed on a tinted panel, toast background   | —                                           | —                                                      |
| `-strong`             | Thin progress lines and strokes               | Text on a tinted panel (`bg-F-subtle`)      | Invalid or focused fields; `/10`–`/20` for badge edges |
| `-vivid`              | Bars, dots, glows (`from-F-vivid/20`)         | —                                           | —                                                      |
| (base)                | Solid fill under `text-inverse`               | Colored text and icons on light backgrounds | Tinted panel edge                                      |
| `-hover` / `-pressed` | Solid button states (`accent`, `danger` only) | —                                           | —                                                      |

`text-on-F` colors the glyph inside a filled icon: `fill-warning text-on-warning`.

### Status data

Status charts fill queued work (the inbox stage, pending invocations) from `--background-color-queued-start` through `-mid` and `queued` to `-end`, and stripe it with `--background-color-hatch-pending`; queued neutral statuses (scheduled, ready, yielded) use `--background-color-hatch`. Pattern: `repeating-linear-gradient(-45deg, transparent 0 4px, <stripe> 4px 6px)`. Arc slices take the same stripe through the `hatchColor` prop on `<Slice>` in `@restate/ui-charts`, inbox and pending edges use `border-queued`, and legend dots add the `swatch` utility. These are data colors: read them through the status styles in `@restate/features-status-chart`, never use them for surfaces.

## Recipes

These are the most common combinations in the codebase. Prefer the component when one exists.

| Pattern                | Classes                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel on the page      | `rounded-2xl border bg-surface shadow-xs`                                                                                                                                                                     |
| Card                   | `<Card intent="…">` with `<CardHeader>`                                                                                                                                                                       |
| Section                | `<Section>` + `<SectionTitle>` + `<SectionContent>`: a canvas frame around raised surfaces                                                                                                                    |
| Text field             | `<FormFieldInput>`. Hand-rolled: `rounded-lg border border-default bg-muted text-primary placeholder:text-subtle invalid:border-danger-strong invalid:bg-danger-muted/70 focus:outline-2 focus:outline-focus` |
| Status badge           | `<Badge variant="…">`. Hand-rolled: `border border-F-strong/20 bg-F-subtle text-F-strong`                                                                                                                     |
| Banner / callout       | `rounded-xl border border-F bg-F-subtle text-F`, icon `fill-F text-on-F`                                                                                                                                      |
| Neutral chip           | `rounded bg-muted px-1 py-px text-2xs font-medium text-tertiary`                                                                                                                                              |
| Menu / popover         | Frame `bg-overlay`, sections `rounded-xl border bg-surface`, selected item `bg-accent text-inverse`                                                                                                           |
| Buttons                | `<Button variant="primary" \| "secondary" \| "destructive" \| "icon">`                                                                                                                                        |
| Text link              | `<Link>`, which renders `text-accent decoration-accent/60 hover:decoration-accent`                                                                                                                            |
| Focus                  | Extend `focusRing` from `@restate/ui-focus` (`outline-focus`); fields use `focus:outline-2 focus:outline-focus`                                                                                               |
| Skeleton               | `animate-pulse rounded-full bg-emphasis/70`                                                                                                                                                                   |
| Floating inverse panel | `rounded-xl border border-inverse bg-inverse/90 text-inverse-secondary shadow-[inset_0_1px_0_0_var(--background-color-inverse-strong)] backdrop-blur-xl`                                                      |

## Highlight, shade and shadows

Colored fills (buttons, bars, legend dots, stripes) often get a white sheen or a dark shading. Use the dedicated tokens with an opacity instead of `white`/`black`:

| Token                                           | Use for                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `bg-highlight` / `--background-color-highlight` | White sheen on colored fills: stripes, gloss gradients (`bg-highlight/40`)   |
| `bg-shade` / `--background-color-shade`         | Dark shading on colored fills: stripes, the key chip inside a primary button |

Highlight and shade stay white and black in dark mode, which is what a colored fill needs. For stripes or sheens over neutral backgrounds, use `tint` or `surface` with an opacity instead, so they flip with the theme.

| Shadow color                      | Use for                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `--box-shadow-color-highlight`    | Inset top sheen on colored fills (buttons, bars): `shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-highlight/20%)]` |
| `--box-shadow-color-edge`         | Inset top edge on neutral panels, headers and cards: `shadow-[inset_0_2px_0_0_--theme(--box-shadow-color-edge/95%)]`   |
| `--box-shadow-color-inverse-edge` | Inset top edge on inverse panels: `shadow-[inset_0_1px_0_0_var(--box-shadow-color-inverse-edge)]`                      |
| `--box-shadow-color-default`      | Every other shadow color: `shadow-default/5`, `--theme(--box-shadow-color-default/3%)`                                 |

Mask gradients (`mask-[…]`) keep black and white, because there they mean opacity, not color. The lint rule also rejects `white` and `black` inside `color-mix()` and gradients; mix toward `--background-color-surface` (lighter in light, darker in dark) or use highlight/shade.

## Categorical palette

`bg-category-1` … `bg-category-7`, each with a lighter `-emphasis` tone, color things that have no status meaning and only need to look different from each other (for example the flow-control block types in the VQueue cards). Use status families only when the color carries meaning.

## Colors in JavaScript

Every color must come from a token, including the ones handed to charts, editors and canvases, and every one of them stays CSS-driven, so a theme switch needs no JavaScript.

- **DOM and inline styles:** use the variable directly, `style={{ backgroundColor: 'var(--background-color-info-subtle)' }}`, `color-mix(in oklab, var(--background-color-highlight) 35%, transparent)`. SVG gradient stops take `style={{ stopColor: 'var(--…)' }}`.
- **Charts:** `@restate/ui-charts` only renders SVG, and ECharts writes colors into SVG attributes untouched, so pass `var(--…)` anywhere. ECharts can't brighten a `var()` on hover by itself; `hoverColor()` in the charts lib does it with relative color syntax.
- **Monaco:** create editors with `theme: monaco.MONACO_THEME` from `@restate/ui-editor/monaco` and put `editorColors()` from `@restate/ui-editor` on the wrapper (`editorColors({ surface: 'inverse' })` on inverse panels). The theme only gives every syntax role a stable class (`.mtk1`, `.mtk3`, …), and `editorColors()` colors those classes and Monaco's `--vscode-*` variables with tokens. Add new roles to `monacoTheme.ts` and `editorColors.ts` together.
- **Canvas:** read the token with `getComputedStyle(canvas).getPropertyValue('--background-color-accent-vivid')`. Canvas accepts the result, and `color-mix()` / relative colors such as `hsl(from <token> calc(h + 8) 55% 48% / 0.4)` built on it. Re-read it periodically so theme switches apply; the server ferrofluid does this.
- **Images:** a data-URI SVG can't see the page's variables, so draw only shapes and use it as a `mask-image` on an element painted with a token (see the `PanelTable` skeleton).
- **Stoplight Elements:** `@restate/ui-api/elements-theme.css` maps Elements' own `--color-*` variables and its code-sample syntax colors to our tokens.

The lint rule also rejects hex, `rgb()`, `hsl()` and `oklch()` literals. The only exemption is `apps/web-ui/app/root.tsx`, for the brand color the OS uses on pinned tabs and tiles.
