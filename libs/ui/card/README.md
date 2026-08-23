# card

Summary/info cards for page-level dashboards (e.g. the Virtual Object instance
page), plus the grid that arranges them.

## Components

- `Card` — white surface with hairline border. `intent` (`success` | `danger` |
  `warning` | `pending` | `info` | `default` | `none`) adds a tinted border, a
  top-left status glow, and an elevated shadow; `none` is the quiet variant.
  `span` (`default` | `wide` | `full`) sets the grid footprint.
- `CardHeader` — icon chip + uppercase title + inline children + trailing
  `action` slot. Inherits the card's intent via context.
- `CardRow` — `variant="hero"` for the card's single headline row,
  `default` for demoted supporting rows; optional `label`.
- `CardLinkRow` — a whole-row link with hover wash and a far-right chevron.
  Set `allowsInteractiveChildren` when the row also contains a button or link;
  the sibling link then stretches its pseudo-element over the relative row,
  while interactive children sit above it. Rows without a destination use
  `CardRow` with the same content anatomy and no chevron.
- `CardGrid` — `columns={1|2|3|4}` (default 3): single column below `md`,
  then capped tracks.

## Layout model

Cards are fixed-size units on a left-anchored shelf:

- **Tracks are capped** (`minmax(0, 42rem)`), not fluid. Below the cap,
  tracks share the width, so a full row stretches exactly to the page rail
  on common wide monitors; past the cap (~2100px viewport at 3 columns)
  cards stop growing at 672px each and surplus width collects as whitespace
  on the right. Sparse rows on huge screens never balloon.
- **`span` is content-driven, not importance-driven.** A card declares `wide`
  or `full` only when its content demands it (tables, charts, long values
  that would wrap or truncate). Sparse status cards stay single-track;
  emphasis comes from `intent` (color, glow, elevation), not area.
- **Left-aligned, always.** Pages have a hard left rail (header, tabs,
  tables); cards join it. Don't center the grid or split cards left/right.
- **Partial last rows are fine.** With capped tracks an orphan card is
  column-aligned and card-sized, reading as a grid with an empty slot. If a
  page wants squarer rows: pick `columns` to divide the card count, use a
  genuinely dense `wide` card to shape rows, or stack multiple `CardGrid`s
  as explicit semantic rows.

## Running unit tests

Run `nx test card` to execute the unit tests via [Vitest](https://vitest.dev/).
