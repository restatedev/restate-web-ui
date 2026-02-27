# Napkin

## Corrections

| Date       | Source | What Went Wrong                                                                                                                                                   | What To Do Instead                                                                                                                                    |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----------------------------------------------------------------- |
| 2026-02-19 | self   | Removed flex-auto from data-entry div thinking it would let dashed line fill space, but it made content SMALLER because data-entry then had no grow and collapsed | The real issue was flex-wrap + w-full on Expression creating a circular width dependency. Always trace the full flex chain before making changes      |
| 2026-02-19 | self   | Made 5 changes at once without verifying intermediate results                                                                                                     | Make minimal changes and verify each one                                                                                                              |
| 2026-02-27 | self   | First attempted hiding "Now" indicator entirely in live-follow mode to fix flicker from smooth interpolation                                                      | Don't suppress features by mode — fix the data mismatch. Advance `dataUpdatedAt` by the same interpolation offset instead                             |
| 2026-02-27 | self   | Then tried adding `rawActualEnd` to engine interface — overengineered                                                                                             | User's simpler suggestion (bump dataUpdatedAt) was better. Listen to the user's direction before adding new abstractions                              |
| 2026-02-27 | user   | Used `useEffect` + `setInterval` + `useReducer(forceRender)` to smooth timeline between API polls                                                                 | Use CSS transitions (`duration-1000 ease-linear`) on tick elements instead — browser handles interpolation, no JS timer needed                        |
| 2026-02-27 | self   | Used `useEffect` + `el.animate()` (Web Animations API) for dying tick fade-out when a simple CSS animation suffices                                               | Prefer CSS `animate-[keyframe_duration_easing_fill]` over JS `el.animate()` — no `useEffect`/ref needed, browser handles it declaratively             |
| 2026-02-27 | self   | `pnpm nx lint invocation-route` got stuck waiting on project graph construction from another process                                                              | When Nx graph locks, validate the touched file with `pnpm exec eslint <file>` plus targeted `tsc -p` to keep iteration moving                         |
| 2026-02-27 | self   | Tried solving live interval jank by decoupling interval transitions in `Units.tsx`; user reverted and wanted a simpler model                                      | Smooth timeline by advancing effective `dataUpdatedAt` between polls in `JournalV2` (e.g., 300ms tick), so coordinate/interval changes become gradual |
| 2026-02-27 | user   | Smoothing `dataUpdatedAt` fixed ticks but made progress bars run ahead                                                                                            | Keep `dataUpdatedAt` raw for progress/now markers; smooth only timeline headroom (`actualEnd`) between polls                                          |
| 2026-02-27 | user   | Asked to revert extra `dataUpdatedAt` null-fallback edit                                                                                                          | Keep only behavior changes needed for the requested fix; avoid ancillary semantic edits in touched lines                                              |
| 2026-02-27 | self   | `Now` marker flickered after headroom smoothing because it was conditionally rendered only when `dataUpdatedAt < end`                                             | In live-follow keep `Now` mounted (`dataUpdatedAt < end                                                                                               |     | mode==='live-follow'`) and clamp marker position to `[start,end]` |
| 2026-02-27 | user   | Wanted smoothing retained in `JournalV2` but limited to early trace stages                                                                                        | Gate smoothing by raw duration (`<10s`), then fall back to poll-only timeline updates                                                                 |
| 2026-02-27 | user   | Wanted tail-follow cutoff and smoothing cutoff aligned to avoid drastic interval-count change at transition                                                       | Use the same shared cutoff value in both places (`LIVE_SMOOTH_DURATION_CUTOFF_MS = TAIL_FOLLOW_THRESHOLD`)                                            |
| 2026-02-27 | user   | Reported missing start guideline from the date label to timeline bottom                                                                                           | Keep date label overlay line and also draw a persistent full-height dashed guide in `Units` to avoid losing continuity                                |
| 2026-02-27 | self   | Used exact `end - dataUpdatedAt >= 1` visibility gate for `Now`, which oscillates around poll boundaries when headroom is smoothed                                | Avoid single-threshold toggles for live markers; use hysteresis/sticky visibility or keep marker mounted and clamp position                           |

## User Preferences

- Uses Tailwind CSS with `tv()` from `@restate/util/styles` for component variants
- Never use string interpolation for dynamic Tailwind classes
- Never add comments unless explicitly requested
- Nothing should wrap in entry rows — if not enough space, elements should shrink

## Patterns That Work

- When smooth-interpolating timestamps between API polls, advance related timestamps (e.g., `dataUpdatedAt`) by the same elapsed amount to avoid flicker — simplest form: use `Date.now()` in live-follow mode
- For `Now` marker visibility under headroom smoothing, use a stable bound check (`dataUpdatedAt <= end (+epsilon)`) instead of a near-zero threshold that toggles every poll
- For right-edge `Now` cut-off, keep marker mounted and switch badge side by viewport half (render badge to the left when `Now` is in right half)
- If row dashes paint over `Now`, raise the `UnitsPortalTarget` z-layer in `JournalV2` (portal stacking), not just `z-index` inside `Units.tsx`
- Don't hide UI elements (like "Now" indicator) wholesale in a mode — they may serve a real purpose in edge cases (e.g., future-scheduled traces). Fix the root cause of flicker instead.
- For dying ticks cleanup, use inline `setTimeout` with key-guarded `setDyingTicksInfo` instead of a separate `useEffect` — avoids a reactive cleanup pattern for a one-shot timer
- For live-follow tick interval changes, pre-schedule the switch ~300-700ms before the next expected poll (estimated from `dataUpdatedAt` cadence) and render old ticks as a short `animate-out fade-out` overlay so the poll-time coordinate jump does not coincide with interval churn

## Patterns That Don't Work

- Removing `grow`/`flex-auto` from data-entry div — makes content collapse instead of filling available space
- `w-full` inside a flex-wrap container creates circular width dependencies when ancestors are content-sized with `max-w-fit`
- `grow basis-20` on flex children forces them to expand beyond content width, stealing space from siblings

## Domain Notes

- Entry layout in invocation-route: Entry row (flex) contains [number div (fixed)] [data-entry (max-w-fit flex-auto)] [dashed line (flex-auto, min-w-20)]
- Call component renders a Fragment — its children become direct children of data-entry
- The + button in Call is absolutely positioned relative to the Entry row
- Expression.tsx wraps content; inner div and span contain all inline elements
- InputOutput has `contents` display — its children participate directly in parent flex
- Target component has complex internal flex layout with `flex-auto` on the root
- `base-20` on Expression line 70 is likely a typo for `basis-20` (gets ignored by Tailwind)
  | Date | Source | What Went Wrong | What To Do Instead |
  | ---------- | ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
  | 2026-02-17 | self | Ran `pnpm nx typecheck web-ui` with Nx daemon and it stalled on project graph computation in this environment | Use `NX_DAEMON=false` for validation commands when Nx graphing hangs |
  | 2026-02-17 | self | Refactoring units into a portal wrapper dropped effective height/positioning, making interval labels disappear | Keep portal units wrapper `relative h-full` and render `Units` as `absolute inset-0` |
  | 2026-02-18 | user | Requested full-trace interval labels and `Now` to render below header | Apply timeline header offset inside `Units` (interval row, `Now`, cancel shading) |
  | 2026-02-18 | self | Making the whole overlay child `pointer-events-auto` blocked viewport selector handles | Keep overlay container non-interactive; enable pointer events only on the date text container |

## User Preferences

- Never add comments unless explicitly requested.
- No `useEffect` for reactive patterns — prefer imperative approaches.
- No `useState` that causes unnecessary re-renders during scroll/drag — prefer refs and direct DOM manipulation.
- Follow existing patterns in the codebase (e.g., portal pattern in `Portals.tsx`).
- Do not use `import('react').CSSProperties` style inline imports — use proper imports at the top.
- Date/time labels above HeaderUnits: must be placed OUTSIDE the `isolate` stacking context (`listRef` div) to be visible, since the z-20 "INVOKED BY" section paints over everything inside it.
- Use `tv()` from `@restate/util/styles` for component variants. Never use string interpolation for dynamic Tailwind classes.

## Patterns That Work

- For zoomed timeline scroll performance, reduce virtualization overscan and batch `onScroll` viewport updates with `requestAnimationFrame` plus no-op state guards.
- `followCursor` tooltip pattern: tiny absolute 1x1 anchor span, position via `onMouseMove`/`onMouseEnter`, pass as `triggerRef` to React Aria Tooltip.
- Use `stateRef` pattern (ref with current values updated each render) for stable callbacks that need latest state in rAF/async.
- `syncUnitsScroll` via `getUnitsPortalRef` (ref to portal lookup) keeps the callback identity stable.
- When there is no working-tree diff, use file-scoped commit history (`git log -- <file>`) to review the latest implementation changes.
- Removing action-entry portals (`ActionContainer`/`ActionPortal`/`RestartAction`) isolates timeline perf work by eliminating virtualized row portal churn.
- For timeline labels above the top sticky section, render a small sticky overlay outside `isolate` and avoid raising the entire timeline container z-index.
- If the user expects live alignment while resizing panels, keep `onLayout` enabled for the date overlay.

## Patterns That Don't Work

- Using high overscan (`100`) on wide zoomed timeline rows causes unnecessary render work and jank.
- Subscribing a heavy component (`ScrollableTimeline`) to shared portal context updates can amplify rerenders during virtualized scroll.

## Domain Notes

- `libs/features/invocation-route/src/lib/JournalV2.tsx` and `libs/features/invocation-route/src/lib/ScrollableTimeline.tsx` drive the journal timeline virtualization and zoom/viewport behavior.
- Timeline start date/time label is rendered by `StartDateTimeUnit` in `JournalV2` as a targeted sticky overlay positioned from `timelineWidth` (no `onLayout` callback).
