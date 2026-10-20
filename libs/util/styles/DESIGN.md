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

Layers stack from back to front:

| Token                 | Use for                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `bg-canvas`           | The page, plus frames that hold surfaces: popover, dropdown and dialog frames, `Section`, toolbar strips, fades into the page |
| `bg-surface`          | Content on the canvas: panels, menu sections, dialog bodies, secondary buttons, the selected tab pill                         |
| `bg-subtle`           | Quiet areas: card bodies, content-panel bodies, the active sidebar item                                                       |
| `bg-muted`            | Inset controls on a surface: inputs, selects, code fields, chips, disabled controls                                           |
| `bg-emphasis`         | Pressed state on a surface, switch track, skeleton loaders (`animate-pulse bg-emphasis/70`)                                   |
| `bg-strong`           | Stronger neutral fill: pressed switch track, thin dividers drawn with `bg-*`                                                  |
| `bg-neutral(-strong)` | Solid neutral marks: resize handles, tiny solid labels with `text-inverse`                                                    |
| `bg-backdrop`         | Modal and drawer scrims                                                                                                       |

`bg-canvas` and `bg-muted` are both gray-100 in the light theme but differ in dark mode, so pick by role: is it a frame (canvas) or an inset control (muted)?

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

## Inverse surfaces

Tooltips, the floating query toolbar and issue pills are dark panels on the light UI.

- **Panel:** `bg-inverse` (or `bg-inverse/90` with `backdrop-blur-xl` when floating), `border-inverse`, top highlight `shadow-[inset_0_1px_0_0_var(--background-color-inverse-strong)]`.
- **Text:** `text-inverse` for titles, `text-inverse-secondary` for body, `text-inverse-muted` for labels, `text-inverse-subtle` for separators.
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
| Menu / popover         | Frame `bg-canvas`, sections `rounded-xl border bg-surface`, selected item `bg-accent text-inverse`                                                                                                            |
| Buttons                | `<Button variant="primary" \| "secondary" \| "destructive" \| "icon">`                                                                                                                                        |
| Text link              | `<Link>`, which renders `text-accent decoration-accent/60 hover:decoration-accent`                                                                                                                            |
| Focus                  | Extend `focusRing` from `@restate/ui-focus` (`outline-focus`); fields use `focus:outline-2 focus:outline-focus`                                                                                               |
| Skeleton               | `animate-pulse rounded-full bg-emphasis/70`                                                                                                                                                                   |
| Floating inverse panel | `rounded-xl border border-inverse bg-inverse/90 text-inverse-secondary shadow-[inset_0_1px_0_0_var(--background-color-inverse-strong)] backdrop-blur-xl`                                                      |

## Highlight, shade and shadows

Colored fills (buttons, bars, legend dots, stripes) often get a white sheen or a dark shading. Use the dedicated tokens with an opacity instead of `white`/`black`:

| Token                                           | Use for                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `bg-highlight` / `--background-color-highlight` | White sheen on colored fills: stripes, gloss gradients (`bg-highlight/40`)                 |
| `bg-shade` / `--background-color-shade`         | Dark shading on colored fills: stripes, the key chip inside a primary button               |
| `--box-shadow-color-highlight`                  | Inset top highlights: `shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-highlight/20%)]` |
| `--box-shadow-color-default`                    | Every other shadow color: `shadow-default/5`, `--theme(--box-shadow-color-default/3%)`     |

Mask gradients (`mask-[…]`) keep black and white, because there they mean opacity, not color.

## Categorical palette

`bg-category-1` … `bg-category-7`, each with a lighter `-emphasis` tone, color things that have no status meaning and only need to look different from each other (for example the flow-control block types in the VQueue cards). Use status families only when the color carries meaning.

## Colors in JavaScript

Every color must come from a token, including the ones handed to charts, canvases and editors.

- **DOM and inline styles:** use the variable directly, `style={{ backgroundColor: 'var(--background-color-info-subtle)' }}`, `color-mix(in oklab, var(--background-color-highlight) 35%, transparent)`. SVG gradient stops take `style={{ stopColor: 'var(--…)' }}`; the `stopColor`/`fill` attributes can't read variables.
- **Charts:** pass `var(--…)` strings anywhere in `@restate/ui-charts` props. `Chart` resolves every color in its options and re-renders when the theme changes. Custom `renderItem` code calls `resolveColor()`.
- **Canvas, Monaco, SVG data URIs:** use `@restate/util-theme`. `resolveColor(color, 'rgb' | 'hex')` returns a concrete value, `useResolvedColors({ … }, 'hex')` re-resolves on theme change (Monaco themes re-run `defineTheme` from it), `resolveHue()` feeds procedural colors such as the server ferrofluid, and `useThemeVersion()` re-runs anything else.
- **Stoplight Elements:** `@restate/ui-api/elements-theme.css` maps Elements' own `--color-*` variables to our tokens, so the playground follows the theme too.

The lint rule also rejects hex, `rgb()`, `hsl()` and `oklch()` literals. The only exemption is `apps/web-ui/app/root.tsx`, for the brand color the OS uses on pinned tabs and tiles.
