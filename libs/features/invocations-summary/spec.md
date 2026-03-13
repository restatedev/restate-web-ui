# Invocations Summary — Component Spec (v2)

## Overview

A dashboard widget with two integrated visualizations side-by-side:

1. **Bar chart** (first column, sticky): horizontal bars showing total invocation count per status across all services
2. **Heat map** (remaining columns, horizontally scrollable): a matrix where columns are services and rows are statuses, with cell color intensity encoding each service's contribution to that status

```
┌───────────┬──────────────────────╥──────────┬──────────┬──────────┬─────┐
│           │ All services  71.4K  ║ cart-svc  │ chk-svc  │ inv-svc  │ ... │→
│───────────┼──────────────────────╫──────────┼──────────┼──────────┼─────│
│ Ready     │ [████       ]  1.2K  ║   ▓▓     │   ░░     │   ░      │     │
│ Scheduled │ [██         ]   530  ║   ▓      │   ░      │   ░      │     │
│ Pending   │ [███        ]   850  ║   ▓▓▓    │   ░░     │   ░      │     │
│ Running   │ [████████   ]  3.4K  ║   ████    │   ▓▓▓    │   ░░     │     │
│ Backing-  │ [█          ]   120  ║   ▓      │   ░░     │   ░      │     │
│ Paused    │ [██         ]   450  ║   ▓▓     │   ░      │   ░      │     │
│ Suspended │ [█████      ]  2.1K  ║   ▓▓▓    │   ░░     │   ░      │     │
│ Succeeded │ [██████████ ]  8.5K  ║   ████    │   ████    │   ▓▓▓    │     │
│ Failed    │ [█          ]   200  ║   ▓      │   ▓▓     │   ░      │     │
└───────────┴──────────────────────╨──────────┴──────────┴──────────┴─────┘
  ↑ sticky (status labels + bar chart)       ↑ horizontally scrollable
```

## Data Input

The component receives pre-fetched data — it does **not** call `useSummaryInvocations` internally.

```tsx
interface InvocationsSummaryData {
  totalCount: number;
  isEstimate: boolean;
  byStatus: { name: string; count: number; isIncluded: boolean }[];
  byService: { name: string; count: number; isIncluded: boolean }[];
  byServiceAndStatus: {
    service: string;
    status: string;
    count: number;
    isIncluded: boolean;
  }[];
}
```

### Props

```tsx
interface InvocationsSummaryProps {
  data?: InvocationsSummaryData;
  isPending?: boolean;
  error?: Error | null;
  onClick?: (params: { status?: string; service?: string }) => void;
}
```

- `onClick` — a single callback for all click interactions:
  - Click a **status row label** → `onClick({ status: 'running' })`
  - Click a **service column header** → `onClick({ service: 'cart-service' })`
  - Click a **heat map cell** → `onClick({ status: 'running', service: 'cart-service' })`
  - Click a **bar chart bar** → `onClick({ status: 'running' })`

## Axes

- **Vertical axis (rows)**: 9 status groups in fixed semantic order
- **Horizontal axis (columns)**:
  - Column 1: "All services" — aggregate bar chart (sticky)
  - Columns 2+: individual services — heat map cells (scrollable)

## Bar Chart (Column 1 — Sticky)

- **Header**: "All services" + total count in compact form (e.g., "71.4K"), prefixed with `~` when estimate
- Each row shows a **horizontal bar** + **count label**
- **Bar width**: proportional to that status's count relative to the max status count (so the largest status fills the full bar width)
- **Bar color**: status-specific (same color system as current bars)
- **Count label**: compact formatted number (e.g., "3.4K"), shown after the bar
- The entire column (status labels + bar chart) is `position: sticky; left: 0` — stays visible during horizontal scroll

## Heat Map (Columns 2+)

- **Header**: service name, horizontal text, `truncate` if too long
- Each cell is a **filled rectangle** with status-specific color at varying opacity
- **Normalized global heatmap**: applies a status-specific multiplier to raw counts, then compares against a single global maximum
  - **Multipliers**: standard traffic (×1) for ready, scheduled, running, succeeded; error-weight (×100) for pending, backing-off, paused, failed, suspended
  - **NormalizedValue** = `rawCount × statusMultiplier`
  - **GlobalMax** = max of all normalized values across the entire table
  - **Ratio** = `normalizedValue / globalMax`
  - **Opacity buckets**: 0% (zero count), 10% (ratio ≤ 0.2), 25% (≤ 0.4), 40% (≤ 0.6), 55% (≤ 0.8), 70% (> 0.8)
- When errors spike, GlobalMax increases from the error cells, automatically fading healthy states into low buckets
- Columns scroll horizontally when they overflow the container

### Service Column Order

- Top N services by total count (default N = 20)
- If any services have `isIncluded === true` (explicitly filtered), they are **pinned first**
- Optional **"Others"** aggregation column at the end when services exceed the visible count

### Show More

- When more than 20 services exist, a "Show more" control appears
- Clicking increases visible service count by 20
- The container stays the **same size** — additional columns are accessible via horizontal scroll

## Status Rows (fixed semantic order)

| Row         | Includes statuses                     | Label       |
| ----------- | ------------------------------------- | ----------- |
| Ready       | `ready`                               | Ready       |
| Scheduled   | `scheduled`                           | Scheduled   |
| Pending     | `pending`                             | Pending     |
| Running     | `running`                             | Running     |
| Backing-off | `backing-off`                         | Backing-off |
| Paused      | `paused`                              | Paused      |
| Suspended   | `suspended`                           | Suspended   |
| Succeeded   | `succeeded`                           | Succeeded   |
| **Failed**  | **`failed` + `cancelled` + `killed`** | **Failed**  |

## Color System

### Bar Chart Bars

Status-specific colors matching `Status.tsx` badge variants:

| Status      | Bar classes                                     |
| ----------- | ----------------------------------------------- |
| Ready       | `border-dashed border-zinc-400 bg-zinc-50`      |
| Scheduled   | `border-dashed border-zinc-500/60 bg-zinc-50`   |
| Pending     | `border-dashed border-orange-400 bg-orange-50`  |
| Running     | `border-dashed border-blue-500/50 bg-blue-100`  |
| Backing-off | `border-dashed border-orange-400 bg-orange-100` |
| Paused      | `border-dashed border-orange-400 bg-orange-100` |
| Suspended   | `border-dashed border-zinc-500/60 bg-zinc-200`  |
| Succeeded   | `border-green-600/30 bg-green-100`              |
| Failed      | `border-red-600/20 bg-red-200`                  |

### Heat Map Cells

Each cell uses a status-specific background color with **varying opacity** based on volume-weighted, tier-capped intensity:

| Status      | Heat map color  |
| ----------- | --------------- |
| Ready       | `bg-zinc-200`   |
| Scheduled   | `bg-zinc-300`   |
| Pending     | `bg-orange-200` |
| Running     | `bg-blue-300`   |
| Backing-off | `bg-orange-300` |
| Paused      | `bg-orange-300` |
| Suspended   | `bg-zinc-400`   |
| Succeeded   | `bg-green-400`  |
| Failed      | `bg-red-400`    |

Opacity is set via inline style using the normalized global heatmap algorithm. See the Heat Map section above for the full formula.

## Filtering Behavior

### Status Rows

- All 9 rows are **always shown** regardless of active status filters
- Rows where **all** constituent statuses have `isIncluded === false` render **dimmed** (`opacity-40`)
- Dimmed rows are still interactive

### Service Columns

- Top 20 by total count, plus optional "Others"
- Pinned services (`isIncluded === true`) appear first

## Interaction

### Click — Status Row Label

```tsx
onClick({ status: 'running' });
```

### Click — Bar Chart Bar

```tsx
onClick({ status: 'running' });
```

### Click — Service Column Header

```tsx
onClick({ service: 'cart-service' });
```

### Click — Heat Map Cell

```tsx
onClick({ status: 'running', service: 'cart-service' });
```

### Hover — Heat Map Cell Tooltip

| Field        | Example             |
| ------------ | ------------------- |
| Status       | Running             |
| Service      | `cart-service`      |
| Count        | 1,204               |
| % of service | 12% of cart-service |
| % of status  | 34% of all Running  |

Use `<HoverTooltip>` from `@restate/ui/tooltip`.

## Sticky + Scroll Behavior

- **Sticky area** (left): status labels + "All services" bar chart column — `position: sticky; left: 0` with `bg-white` to occlude scrolled content
- **Scrollable area** (right): service heat map columns — `overflow-x: auto`
- A subtle shadow or border on the sticky column's right edge when content is scrolled to indicate more content

## States

### Loading (`isPending`)

Skeleton placeholder with `animate-pulse`.

### Error

`<ErrorBanner>` from `@restate/ui/error`.

### Empty (`totalCount === 0`)

Centered empty state with "No invocations found".

### Normal

Full widget with bar chart + heat map.

## Styling Notes

- Container: `rounded-lg border border-zinc-200 overflow-hidden`
- Sticky area background: `bg-white` (to occlude scrolled heat map columns)
- Status labels: `text-xs font-medium text-zinc-700`, fixed width (~100px)
- Bar chart column: fixed width (~200px)
- Heat map service columns: fixed width (~80px each)
- Row height: fixed `h-7` for all rows
- Row dividers: `border-b` default border color
- Column dividers in heat map: `border-l border-l-zinc-200`
- Heat map cells: `rounded-sm`, status-colored bg with varying opacity via inline style
- Service column headers: `text-xs font-medium text-zinc-700 truncate`, horizontal text
- "Others" column: `text-zinc-400 italic`, not clickable
- Alternating column backgrounds (`bg-zinc-200/25` on odd columns) for readability in the heat map
- All dynamic styling uses `tv()` from `@restate/util/styles` — never string interpolation for Tailwind classes

## File Structure

```
libs/features/invocations-summary/src/
  index.ts
  lib/
    invocations-summary.tsx     (main component + sub-components)
    types.ts                    (props & data interfaces)
    constants.ts                (status order, config constants)
    mock-scenarios.ts           (dev-only mock data for testing)
```
