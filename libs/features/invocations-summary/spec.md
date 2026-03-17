# Invocations Summary — Component Spec (v3)

## Overview

A dashboard widget with two integrated visualizations side-by-side:

1. **Bar chart** (first column, sticky): horizontal bars showing total invocation count per status across all services
2. **Heat map** (remaining columns, horizontally scrollable): a matrix where columns are services and rows are statuses, with cell color intensity encoding each service's health in that status

```
┌───────────┬──────────────────────╥──────────┬──────────┬──────────┬─────┐
│  Sampled   │ Total        100%   ║ cart-svc  │ chk-svc  │ inv-svc  │ ... │→
│  (50k)     │                     ║  37.5%    │  25%     │  12.5%   │     │
│───────────┼──────────────────────╫──────────┼──────────┼──────────┼─────│
│ Ready     │ [████       ]  2.8%  ║  3.33%   │  2.5%    │  2%      │     │
│ Scheduled │ [██         ]  1.2%  ║  2%      │  1.5%    │  1%      │     │
│ Pending   │ [███        ]  2%    ║  3.33%   │  2.5%    │  2.5%    │     │
│ Running   │ [████████   ]  8%    ║  10%     │  10%     │  10%     │     │
│ Backing-  │ [█          ]  0.4%  ║  0.13%   │  0.1%    │  0.1%    │     │
│ Paused    │ [██         ]  1%    ║  0.13%   │  0.1%    │  0.1%    │     │
│ Suspended │ [█████      ]  5%    ║  0.13%   │  0.1%    │  0.1%    │     │
│ Succeeded │ [██████████ ] 78.2%  ║  80%     │  82%     │  82%     │     │
│ Failed    │ [█          ]  1.4%  ║  1%      │  1%      │  0.75%   │     │
└───────────┴──────────────────────╨──────────┴──────────┴──────────┴─────┘
  ↑ sticky (status labels + bar chart)       ↑ horizontally scrollable
```

## Display Modes

The component has two display modes driven by `data.isEstimate`:

- **Sampled** (`isEstimate: true`): Total shows "100%", status bars show percentages of grand total, service headers show percentages of grand total, cell values show **% of service** (e.g., "80%" means 80% of that service's invocations are in this status)
- **Full scan** (`isEstimate: false`): Total shows the actual count (e.g., "42.52K"), status bars show absolute counts, service headers show absolute counts, cell values show absolute counts

## Data Input

The component receives pre-fetched data — it does **not** call `useSummaryInvocations` internally.

```tsx
interface InvocationsSummaryData {
  totalCount: number; // count of included/filtered invocations (from API)
  isEstimate: boolean; // true when sampled, false for full scan
  byStatus: { name: string; count: number; isIncluded: boolean }[];
  byService: { name: string; count: number; isIncluded: boolean }[];
  byServiceAndStatus: {
    service: string;
    status: string;
    count: number;
    isIncluded: boolean;
  }[];
  duration?: { p50: number; p90: number; p99: number };
}
```

Note: `totalCount` reflects the filtered/included count. The **displayed Total** is computed from the sum of all `byStatus` counts (`grandTotal`), which stays constant regardless of active service/status filters. Only `isIncluded` flags change when filters are toggled.

### Props

```tsx
interface InvocationsSummaryProps {
  data?: InvocationsSummaryData;
  isPending?: boolean;
  isFetching?: boolean;
  isPlaceholderData?: boolean;
  error?: Error | null;
  onClick?: (params: { status?: string; service?: string }) => void;
  toolbar?: ReactNode;
}
```

- `onClick` — a single callback for all click interactions:
  - Click a **status row label** → `onClick({ status: 'running' })`
  - Click a **service column header** → `onClick({ service: 'cart-service' })`
  - Click a **heat map cell** → `onClick({ status: 'running', service: 'cart-service' })`
- `toolbar` — rendered in the sticky column header area (e.g., the Sampled/Full scan dropdown)

## Axes

- **Vertical axis (rows)**: 9 status groups in fixed semantic order
- **Horizontal axis (columns)**:
  - Column 1: "Total" — aggregate bar chart (sticky)
  - Columns 2+: individual services — heat map cells (scrollable)

## Bar Chart (Column 1 — Sticky)

- **Header**: "Total" + displayed total ("100%" when sampled, formatted count when full scan)
- Each row shows a **horizontal bar** + **count/percentage label**
- **Bar width**: proportional to that status's count relative to the max status count (so the largest status fills the full bar width)
- **Bar color**: status-specific (dark theme colors)
- **Count label**: percentage of grand total when sampled, compact formatted number (e.g., "3.4K") when full scan
- The entire column (status labels + bar chart) is positioned absolutely with backdrop blur — stays visible during horizontal scroll

## Heat Map (Columns 2+)

- **Header**: service name (truncated if long) + count/percentage below
- Each cell is a **filled rectangle** with status-specific color at varying opacity
- **Cell value**: % of service when sampled, absolute count when full scan

### Cell Color Intensity Algorithm

Cell opacity answers: **"How much of this service is in this status?"** with a subtle volume boost so dominant services pop out first.

#### Step 1 — Row ceiling

Each status row gets a max brightness cap based on its significance:

```
rowVolume = sqrt(rowTotal / maxRowTotal)
volumeCeiling = 0.08 + rowVolume × 0.47
```

Some statuses have **expected limits** — the rate above which that status is considered concerning. These are the "normal operating range" ceilings:

| Status      | Expected limit |
| ----------- | -------------- |
| ready       | 1%             |
| pending     | 5%             |
| paused      | 1%             |
| backing-off | 5%             |
| failed      | 2.5%           |

For these statuses, an attention boost kicks in as the system-wide rate approaches the expected limit:

```
attention = clamp(rowRate / expectedLimit, 0, 1)
badFloor = 0.18 + attention × 0.52
rowCeiling = max(volumeCeiling, badFloor)
```

For normal statuses (succeeded, running, scheduled, suspended) — no expected limit: `rowCeiling = volumeCeiling`

#### Step 2 — Service-local rate

```
serviceRate = cellCount / serviceTotal
```

#### Step 3 — Health signal

For statuses with an expected limit, use a soft exponential curve so rates beyond the limit keep increasing (no hard cap):

```
healthSignal = 1 − exp(−serviceRate / expectedLimit)
```

At the expected limit, healthSignal ≈ 0.63. At 3× the limit, ≈ 0.95. The signal approaches 1.0 asymptotically — higher rates always produce brighter cells.

For normal statuses (no expected limit), use a power curve on the raw rate:

```
healthSignal = serviceRate ^ 0.6
```

#### Step 4 — Volume boost

A subtle multiplier based on this cell's share of the status row, so dominant services pop out:

```
rowShare = cellCount / rowTotal
volumeBoost = 1 + rowShare ^ 0.4 × 0.5
```

Ranges from 1.0 (tiny service) to 1.5 (service owns 100% of the row). The `^0.4` exponent compresses the curve so small services stay nearly unchanged.

#### Step 5 — Final opacity

```
baseLevel = per-status floor (0.10–0.21)
cellStrength = baseLevel + (1 − baseLevel) × healthSignal
opacity = min(rowCeiling × cellStrength × volumeBoost × 0.64, 0.512)
```

The `baseLevel` keeps cells visible even at low rates. The `rowCeiling` ensures minor statuses don't overpower the display. The `× 0.64` global dampening and `0.512` cap keep the overall palette subtle.

### Service Column Order

- Top N services by total count (default N = 10)
- Sorted by count descending, then name ascending
- Optional **"Others"** aggregation column at the end when services exceed the visible count

### Show More

- When more than 10 services exist, an "Others" column header contains a dropdown
- The dropdown offers multiples of 10 (10, 20, 30, ...) up to 100 or the total service count
- The container width grows with additional columns; overflow is handled by horizontal scroll

## Status Rows (fixed semantic order)

| Row         | Includes statuses                     | Label                           |
| ----------- | ------------------------------------- | ------------------------------- |
| Ready       | `ready`                               | Ready                           |
| Scheduled   | `scheduled`                           | Scheduled                       |
| Pending     | `pending`                             | Pending                         |
| Running     | `running`                             | Running                         |
| Backing-off | `backing-off`                         | Backing-off                     |
| Suspended   | `suspended`                           | Suspended                       |
| Paused      | `paused`                              | Paused                          |
| Succeeded   | `succeeded`                           | Succeeded                       |
| **Failed**  | **`failed` + `cancelled` + `killed`** | **Failed / Cancelled / Killed** |

## Filtering Behavior

### Status Rows

- All 9 rows are **always shown** regardless of active status filters
- Rows where **all** constituent statuses have `isIncluded === false` render **dimmed** (`opacity-40`)
- Dimmed rows are still interactive
- **Numbers do not change** when filters are toggled — only `isIncluded` (dimming) changes

### Service Columns

- Top N by total count, plus optional "Others"
- Services where `isIncluded === false` render **dimmed** (`opacity-40`)
- **Numbers do not change** when filters are toggled

## Interaction

### Click — Status Row

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

| Field        | Example             | When shown     |
| ------------ | ------------------- | -------------- |
| % of service | 12% of cart-service | Always         |
| % of status  | 34% of all Running  | Always         |
| Count        | 1,204               | Full scan only |

Use `<HoverTooltip>` from `@restate/ui/tooltip`.

## Loading Behavior

### Placeholder data

When fetching, the component receives placeholder data from the query cache to keep service columns stable. The `placeholderData` callback in `useSummaryInvocations` merges services from:

1. **Previous query data** (if the observer didn't remount)
2. **All cached summary queries** for the same base URL (survives remounts)
3. **Deployment service names** (catches services with no invocations yet)

Services are sorted by max count seen across sources (descending). Synthetic descending counts ensure `buildRankedServices` preserves column order. The loading overlay hides synthetic values.

### Loading overlay

When `isFetching` or `isPlaceholderData` is true:

- The entire panel gets `animate-pulse`
- All numbers are hidden (opacity 0 or replaced by placeholder bars)
- Cell backgrounds show random low-opacity white fills
- Heat map fill colors are hidden (opacity 0)

## States

### Loading (`isPending && !isPlaceholderData`)

Skeleton placeholder with `animate-pulse`.

### Error

`<ErrorBanner>` from `@restate/ui/error`.

### Empty (`totalCount === 0` and not loading)

Centered empty state with "No invocations found".

### Normal

Full widget with bar chart + heat map.

## File Structure

```
libs/features/invocations-summary/src/
  index.ts
  lib/
    invocations-summary.tsx     (main component + sub-components)
    heatmap-data.ts             (data transformation + opacity algorithm)
    duration-percentiles.tsx    (p50/p90/p99 sidebar widget)
    types.ts                    (props & data interfaces)
    constants.ts                (status order, config constants)
    mock-scenarios.ts           (dev-only mock data for testing)
```
