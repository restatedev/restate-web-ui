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
| 2026-02-26 | self   | Added 2 parallel queries after user explicitly asked for a single query                                                                                           | Listen carefully to "single query" constraint. If truly impossible, explain why BEFORE writing code                                                   |
| 2026-02-26 | self   | Assumed Restate SQL engine had limited capabilities without checking                                                                                              | Restate uses DataFusion — supports PERCENTILE_CONT, APPROX_PERCENTILE_CONT, window functions, CTEs, CASE, etc.                                        |
| 2026-02-27 | self   | `pnpm nx lint invocation-route` got stuck waiting on project graph construction from another process                                                              | When Nx graph locks, validate the touched file with `pnpm exec eslint <file>` plus targeted `tsc -p` to keep iteration moving                         |
| 2026-02-27 | self   | Tried solving live interval jank by decoupling interval transitions in `Units.tsx`; user reverted and wanted a simpler model                                      | Smooth timeline by advancing effective `dataUpdatedAt` between polls in `JournalV2` (e.g., 300ms tick), so coordinate/interval changes become gradual |
| 2026-02-27 | user   | Smoothing `dataUpdatedAt` fixed ticks but made progress bars run ahead                                                                                            | Keep `dataUpdatedAt` raw for progress/now markers; smooth only timeline headroom (`actualEnd`) between polls                                          |
| 2026-02-27 | user   | Asked to revert extra `dataUpdatedAt` null-fallback edit                                                                                                          | Keep only behavior changes needed for the requested fix; avoid ancillary semantic edits in touched lines                                              |
| 2026-02-27 | self   | `Now` marker flickered after headroom smoothing because it was conditionally rendered only when `dataUpdatedAt < end`                                             | In live-follow keep `Now` mounted (`dataUpdatedAt < end                                                                                               |     | mode==='live-follow'`) and clamp marker position to `[start,end]` |
| 2026-02-27 | user   | Wanted smoothing retained in `JournalV2` but limited to early trace stages                                                                                        | Gate smoothing by raw duration (`<10s`), then fall back to poll-only timeline updates                                                                 |
| 2026-02-27 | user   | Wanted tail-follow cutoff and smoothing cutoff aligned to avoid drastic interval-count change at transition                                                       | Use the same shared cutoff value in both places (`LIVE_SMOOTH_DURATION_CUTOFF_MS = TAIL_FOLLOW_THRESHOLD`)                                            |
| 2026-02-27 | user   | Reported missing start guideline from the date label to timeline bottom                                                                                           | Keep date label overlay line and also draw a persistent full-height dashed guide in `Units` to avoid losing continuity                                |
| 2026-02-27 | self   | Used exact `end - dataUpdatedAt >= 1` visibility gate for `Now`, which oscillates around poll boundaries when headroom is smoothed                                | Avoid single-threshold toggles for live markers; use hysteresis/sticky visibility or keep marker mounted and clamp position                           |
| 2026-02-19 | self   | Removed flex-auto from data-entry div thinking it would let dashed line fill space, but it made content SMALLER because data-entry then had no grow and collapsed | The real issue was flex-wrap + w-full on Expression creating a circular width dependency. Always trace the full flex chain before making changes      |
| 2026-02-19 | self   | Made 5 changes at once without verifying intermediate results                                                                                                     | Make minimal changes and verify each one                                                                                                              |
| 2026-02-26 | self   | Tried `pnpm nx create admin-api` — wrong project name                                                                                                             | Type generation is on `admin-api-spec`: `pnpm nx create admin-api-spec`                                                                               |
| 2026-02-26 | user   | Created 3 parallel SQL queries when the data could come from 1 GROUP BY                                                                                           | Combine dimensions into a single GROUP BY and aggregate both axes in JS — avoids multiple round-trips                                                 |
| 2026-02-26 | user   | Split completed invocations into failed/cancelled/killed using completion_failure                                                                                 | For summary/aggregate views, group all non-success completions as "failed" — simpler and avoids needing completion_failure in the query               |
| 2026-02-19 | self   | Removed flex-auto from data-entry div thinking it would let dashed line fill space, but it made content SMALLER because data-entry then had no grow and collapsed | The real issue was flex-wrap + w-full on Expression creating a circular width dependency. Always trace the full flex chain before making changes      |
| 2026-02-19 | self   | Made 5 changes at once without verifying intermediate results                                                                                                     | Make minimal changes and verify each one                                                                                                              |
| 2026-02-26 | self   | Tried `pnpm nx create admin-api` — wrong project name                                                                                                             | Type generation is on `admin-api-spec`: `pnpm nx create admin-api-spec`                                                                               |
| 2026-02-26 | user   | Created 3 parallel SQL queries when the data could come from 1 GROUP BY                                                                                           | Combine dimensions into a single GROUP BY and aggregate both axes in JS — avoids multiple round-trips                                                 |
| 2026-02-26 | user   | Split completed invocations into failed/cancelled/killed using completion_failure                                                                                 | For summary/aggregate views, group all non-success completions as "failed" — simpler and avoids needing completion_failure in the query               |

| 2026-03-16 | user | Silently changed approach from `pnpm licenses list` to `pnpm ls` + manual package.json reading without explaining the tradeoff or asking for approval | When a planned approach hits a wall and you need to change direction, explicitly explain what failed and why, present the alternative, and ask for approval before proceeding |
| 2026-03-23 | self | CSS `filter` (goo SVG filter) on canvas causes visual overflow that escapes parent `overflow: hidden` + `border-radius` | Use `clip-path: inset(Npx round N%)` instead — it creates a hard clip that CSS filter effects cannot escape |
| 2026-03-23 | self | Continuous mouse push force in animation update loop caused directional bias from tiny coordinate errors | Only apply mouse interaction forces when mouse is actively moving (`velocity > threshold`), never when stationary |
| 2026-03-23 | self | SVG goo filter (blur + alpha threshold) destroys all internal color gradients — blur averages nearby colors to one flat tone | Use two canvases: shape canvas (goo filtered, solid fill for merging) + color canvas (no filter, preserves gradients) |
| 2026-03-23 | self | Dark ferrofluid colors (lightness 12-22%) were invisible through a 70% white SVG overlay — only 30% of color shows through | Design canvas colors for the COMPOSITE result: use lightness 45-55% and saturation 55-70% to be visible through overlays |
| 2026-03-23 | self | React Aria Button `onClick` receives PressEvent (not MouseEvent). PressEvent has `.x`/`.y` which are `clientX`/`clientY` from the native event | Don't assume `.clientX`/`.clientY` on PressEvent — use `.x`/`.y` |

| 2026-03-23 | self | Used `forwardRef` in a React 19 project | React 19 supports `ref` as a regular prop — no `forwardRef` needed |
| 2026-03-23 | self | Wrapped a synchronous engine property assignment in `useEffect` for no reason | If a value can be set synchronously during render (e.g., `engine.status = status`), just do it — don't wrap in `useEffect` |
| 2026-03-23 | self | Used inline `style={{ }}` for CSS properties that can be Tailwind classes | Use `tv()` + Tailwind arbitrary values (e.g., `[clip-path:inset(4px_round_28%)]`) instead of inline styles. Use `className="absolute"` instead of `style={{ position: 'absolute' }}` |
| 2026-03-23 | self | Tried multiple broken focus ring approaches (CSS focus-within, ring utilities, composeRenderProps) for SearchField filter input | Follow the exact `FormFieldInput` pattern: `SearchField` with `outline-none`, `div.relative.min-h-8.5` container, `AriaInput` in normal flow (not absolute) with `focus:outline-2 focus:outline-blue-600`, icon as absolute sibling. Don't invent new focus patterns — copy working ones from the codebase |
| 2026-03-23 | self | SearchField render props don't include `isFocusVisible` — so `focusRing` tv variant never triggers on SearchField | Check actual render props types before using `focusRing` — it requires `isFocusVisible` which only some React Aria components provide |
| 2026-03-27 | self | Used negative margins on cells container which clipped the focus outline due to list's `overflow-auto` | Negative margins cause layout overflow which gets clipped. Instead of making the top row wider, add positive margin to the expanded content (handlers) to make it narrower |
| 2026-03-27 | user | Kept proposing complex approaches (moving focusRing, negative margins, scale alternatives) when user wanted simple positive margin on handlers | Listen to user's suggestion first — "why not add margin to expanded content" was the right answer from the start |
| 2026-03-27 | self | `serviceIssuesMap` was missing from `columns` useMemo dependency array — Health column always showed stale empty data | Always check useMemo dependency arrays when adding new data sources to column render functions |
| 2026-03-27 | self | Spent many rounds guessing why Health showed "OK" instead of adding console.log | When debugging data flow issues, add console.log early instead of theorizing — the user had to tell me to do this |
| 2026-03-27 | self | Used `rgba(251,191,36,0.1)` in Tailwind arbitrary values | Use `--theme(--color-amber-400/10%)` syntax for colors in Tailwind v4 arbitrary values — no need for `color-mix`, `rgba`, or `srgb` |
| 2026-03-27 | self | Used string interpolation for dynamic className with severity variants | NEVER use template literals for dynamic Tailwind classes. Always use `tv()` with variants |
| 2026-03-27 | self | Kept changing GridList.tsx when user wanted changes only in overview page | Don't modify shared components when the change belongs in the consuming page. Listen to scope hints |
| 2026-03-27 | user | Wrapped cells container in a `<Link>` which created invalid HTML with nested interactive elements | Never wrap cells/grid content in a `<Link>`. Use pseudo-element (`before:absolute before:inset-0`) on the service name link to fill the container instead |
| 2026-03-27 | self | Interactive elements inside pseudo-link-filled container were not clickable | Elements inside a pseudo-link container need `relative z-10` to sit above the pseudo-element |
| 2026-03-29 | self | Animating `background-position` on repeating-linear-gradient caused subpixel jumps between iterations | Use `transform: translateX` instead — GPU-accelerated and avoids background tiling rounding. For 135deg stripes at 24px repeat, 23px translateX gives the smoothest loop |
| 2026-03-31 | self | Scrollbars appearing in popovers/tooltips — threw 4 speculative fixes (removing `overflow-auto`, changing to `overflow-hidden`, adding `!important` hacks) before diagnosing | **DIAGNOSE FIRST**: Ask user to inspect in DevTools, identify which element scrolls, check computed styles, find the actual overflow source. Root cause was `-m-px` and `-mx-4` negative margins pushing content beyond `overflow-auto` containers. Fix was trivial once diagnosed |
| 2026-03-31 | self | CSS custom properties in `@keyframes` (e.g., `var(--emit-to)`) don't work — spent 3 rounds on inline styles, React DOM, and style tags | For per-element animation targets, use Web Animations API (`el.animate()`) which supports dynamic values natively, or generate unique `@keyframes` per element |
| 2026-03-31 | self | Tailwind v4 tree-shakes `@keyframes` inside `@layer base` that aren't referenced by Tailwind utilities | Keyframes referenced only via inline `style={{ animation: '...' }}` or JS need to be outside Tailwind's processing — use Web Animations API or a `<style>` tag |

## User Preferences

- Uses Tailwind CSS with `tv()` from `@restate/util/styles` for component variants
- Never use string interpolation for dynamic Tailwind classes — always use `tv()` with variants
- Never add comments unless explicitly requested
- Nothing should wrap in entry rows — if not enough space, elements should shrink
- When changing technical direction mid-task, be explicit about what failed, why, and get approval for the new approach before writing code
- Use `--theme(--color-*/opacity%)` for colors in Tailwind arbitrary values, not `rgba()` or `color-mix()`
- When debugging data issues, add console.log early rather than theorizing for many rounds
- When debugging UI/CSS bugs, DIAGNOSE FIRST — ask user to inspect DevTools, identify the element, check computed styles — then fix. Never throw speculative fixes at the wall
- Wait for user instruction before making changes — don't guess and iterate when told to wait
- Don't modify shared UI library components when the fix belongs in the consuming page

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

- For `ViewportSelector` minimum visible width, include both side paddings in duration math: `(MIN_VIEWPORT_WIDTH_PX + 2 * PADDING) / rect.width`; also clamp externally-provided viewport range before rendering.

- When enforcing minimum viewport width in `ViewportSelector`, do not fallback to `end - minDuration` after edge clipping; instead center then clamp start into `[start, end - minDuration]` to avoid teleporting selector to the right edge near left boundary.

- Center-anchored visual min-width clamping in `ViewportSelector` can oscillate with live updates; anchor clamped range to raw start and disable transitions while clamped to avoid periodic left-right jumps.

- Live button behavior: if polling is on and viewport is off the right edge, show negative lag label (`-XdYhZm`) + animated indicator; click should call `returnToLive` instead of toggling polling.
- Zoom controls should be explicit `ZoomOut`/`ZoomIn` buttons with 2x scaling each click; for live-follow tail window, zoom-out should switch to full-trace viewport.

- Full-trace zoom while polling live should keep expanding with `coordinateEnd` as data grows; a one-time `setViewport(actualStart, liveEdge)` is not enough for long-running traces without a dedicated full-trace-follow flag.

- For timeline controls, user expects left zoom control to be reset-to-full-trace only (not 2x zoom-out); keep zoom-in as the only stepwise control.

- Interval fade transitions in `Units` should be disabled for any live polling state (`canReturnToLive`), not only `live-follow`, otherwise full-trace-live mode appears to flash whenever tick interval steps.

- In live inspect mode, treat near-live-edge viewport as live-follow for interval behavior (layout animation + conservative interval switching). Away from edge, freeze interval step across polls unless viewport duration/width changed.

- Rolled back inspect-live away-from-edge interval freezing in `useTimelineEngine` (too hacky/no UX win); kept only inspect-at-live-edge behavior alignment with live-follow.

- Created generic headless timeline zoom library at `libs/ui/timeline-zoom` with behavior spec (`SPEC.md`) and moved engine logic there; kept `useTimelineEngine` as a compatibility adapter so `JournalV2` integration stays stable during migration.

- Phase 2 integration: removed feature-level `useTimelineEngine` adapter file and mapped `TimelineEngineContext` directly from `@restate/ui/timeline-zoom`; feature now depends on generic headless engine with minimal local mapping only.

- Refactored `useTimelineZoom` structure: grouped mutable engine fields into one `EngineMemory` ref and split derivation into pure helpers (`resolveMode`, `resolveDomains`, `latestSnapThreshold`) to reduce scattered refs and inline branching.

- Rewrote `useTimelineZoom` with an explicit reducer (`viewportControllerReducer`) and action model (`set-window`, `pan-window`, `reset-automatic`), plus descriptive output names/JSDoc (`selectorDomainStartMs`, `renderDomainStartMs`, `visibleWindowStartMs`) to improve readability and reasoning.
- 2026-03-05 | self | Refactored `useTimelineZoom` to reducer-centric engine state (removed ref-driven runtime context) by adding `sync-inputs` reducer action + pure `deriveTimelineFrame`; keep persistent memory in reducer state and commit only changed fields to limit extra rerenders.
- 2026-03-05 | self | Reducer rewrite introduced stale-input closure risk by passing `timelineInputs` in `set/pan` action payloads; during live polling this can cause temporary right/left viewport snaps. Use reducer-stored latest inputs (synced via layout effect) for user actions instead of closure payloads.
- 2026-03-05 | self | Engine-level freeze fixes alone may still leave visible jitter in UI integration. Add a render-frame stabilizer in `ScrollableTimeline` for live-inspect-away-from-edge: keep rendered frame fixed across poll updates unless viewport itself changed (user interaction).
- 2026-03-05 | self | After fixing jump with UI frame stabilizer, removed unnecessary engine freeze-state plumbing (`frozenObservedRangeDurationMs`) and reverted selector animation gating change; keep only changes that materially support stability.
- 2026-03-05 | self | Split `useTimelineZoom` into `timelineZoom.types.ts` + `timelineZoom.engine.ts` + thin `useTimelineZoom.ts` orchestration hook to improve maintainability without behavior changes.
- 2026-03-05 | self | Moved `TimelineEngineContext` from invocation feature into `libs/ui/timeline-zoom` and rewired feature imports to consume provider/context from `@restate/ui/timeline-zoom`.
- 2026-03-05 | self | In `useTimelineZoom`, `timelineInputs` memo object was unnecessary; using primitive deps in sync effect and inline payload keeps behavior and simplifies code.
- 2026-03-05 | self | If `useTimelineZoom` is internal-only, keep it out of package public API (`index.ts`) and export only engine-facing provider/context + threshold constant.
- 2026-03-05 | self | `timelineZoom.engine.ts` had grown too large to be readable. Keep it as a documented facade and move logic into focused modules (`mode`, `ticks`, `viewportController`, `state`, `constants`) while preserving the public API.
- 2026-03-05 | user | Requested naming cleanup (`timelineZoom.*` file prefixes removed) and explicit docs for functions. Keep module names short inside scoped folder and document helper/exported functions with concise JSDoc.
- 2026-03-05 | self | `ScrollableTimeline` had mixed UI layout with timeline behavior (inspect-live frame stabilization, wheel pan conversion, zoom window math). Move those behaviors into headless hooks in `libs/ui/timeline-zoom` and keep feature component as composition-only.
- 2026-03-05 | user | Preferred one public hook over multiple exported helper hooks. Keep lower-level hooks internal to the lib and export a single composed hook for feature integration.
- 2026-03-05 | user | Called out unnecessary `useMemo` around small returned object in composed viewport hook. Prefer plain return unless memoization has a clear consumer-facing identity/perf benefit.
- 2026-03-05 | user | Requested removing redundant local aliases for render-frame fields in `ScrollableTimeline`. Prefer direct property access when aliases add no clarity and only bloat the component.
- 2026-03-05 | user | Requested interval transitions in `Units` to feel right-to-left. Use right-anchored positioning (`right + width`) instead of left-anchored (`left + width`) for tick segments and trailing fill.
- 2026-03-05 | user | Preferred left-based tick geometry in `Units`; switched back from right-anchored layout and applied right-origin classes while keeping left positioning.
- 2026-03-05 | self | Interval overlap artifact in `Units` was caused by animating `left` while segment topology changed and keys were too coarse (`tickMs`). Stabilize by animating `width` only and keying segments by both bounds (`prevTickMs-tickMs`).
- 2026-03-05 | self | Width-only transitions removed jitter but made intervals feel static. Keep improved segment keys (`prevTickMs-tickMs`) and re-enable `left` transition for smooth drift of stable segments.
- 2026-03-05 | self | To avoid interval-overlap artifacts while keeping smooth movement, gate tick `left` animation by topology stability (same unit + same first/last/count). Disable animation only on topology-change frames.
- 2026-03-05 | self | Remaining "interval over sibling" artifact can come from label text escaping narrow segments. Keep motion but clip labels with `overflow-hidden whitespace-nowrap` in interval segment styles.
- 2026-03-05 | user | Requested new intervals animate from zero width and reveal labels only after enter animation. Implemented per-segment mount animation (`scaleX` from left) with delayed label visibility in `Units`.
- 2026-03-05 | self | `scaleX` enter with delayed labels looked wrong in practice. Better fallback for new intervals: fade-in at final geometry while keeping labels visible.
- 2026-03-05 | self | Per-segment enter animations added more visual jumping. Reverted to plain segment rendering; kept only topology-aware layout animation gate and boundary-based keys.
- 2026-03-05 | user | Desired interval model: all segments exist, each segment width fills based on `now` progress, and labels appear only once a segment is complete. Implement in `Units` by deriving per-segment filled width from `nowOffsetMs` and conditional label rendering.
- 2026-03-05 | self | Orange dashed bar artifact in screenshot came from `EntryProgress` container transition (not `Units`). Restrict transitions to width so bars don't animate `left` across grid columns.
- 2026-03-05 | user | Asked to undo recent `EntryProgress` transition experiment and temporarily use vivid interval debug colors in `Units` (red/yellow fills, blue border) to make artifacts easier to inspect.
- 2026-03-05 | self | With fill-by-now interval model, animating `left` still causes sibling overlap when boundaries shift. Keep only `width` transitions for interval/background segments.
- 2026-03-05 | self | For smooth-but-stable interval motion, animate `left/width` only when topology is stable; disable those transitions on topology-change frames to avoid cross-over artifacts.

- 2026-03-05 | self | Interval fill looked like it grew from the right when position and fill were coupled in one element. Split into stable segment geometry (left/width) plus inner fill (width only) to keep growth visually left-to-right while preserving smooth drift.

- 2026-03-05 | self | To avoid interval overlap/jump from per-segment absolute positioning, switched `Units` intervals to flex slots with fixed slot width and width-only animated fills; this removes `left` motion from individual interval blocks.

- 2026-03-05 | self | Flex-slot model still looked non-animated because only fill width transitioned; added width transitions to slot and spacer elements too, with linear 1s duration to match poll cadence.

- 2026-03-05 | self | User expected upcoming intervals to stay visible (alternating color) even before `now` reaches them. Split interval rendering into always-visible slot background + animated progress overlay width to avoid empty gaps.

- 2026-03-05 | self | Segment keys based on raw float boundaries can drift (`x.199999`) and cause remount churn. Use integer tick indices as identity (`unit-index`) and derive ticks from index range.

- 2026-03-05 | self | Empty gap after the last full interval came from rendering the tail remainder as a plain spacer. Render tail remainder as a real slot (background + fill) so partial current interval is always visible.

- 2026-03-05 | self | Excessive motion during interval step changes came from animating slot/spacer layout widths. Keep layout widths static and animate only progress fill width.

- 2026-03-06 | self | Same-interval visible snaps can come from too-small viewport tick buffer (first/last index window shifts inside the viewport). Use a wider offscreen interval buffer so churn happens offscreen.

- 2026-03-06 | self | Removing layout transitions globally fixed unit-switch churn but introduced same-interval snap at boundary shifts. Better: animate slot/spacer width only when interval unit is unchanged; disable on unit-change frame.

- 2026-03-06 | self | Same-interval jitter can also come from parent timeline transform using 300ms ease-out against 1s poll cadence. In live-follow, use 1000ms linear for transform/width and keep Units motion duration aligned.

- 2026-03-06 | self | Biggest live jump came from interval downshift (e.g., 10s -> 5s) causing full re-bucket. In live context, keep rendered interval monotonic (ignore downshifts) to avoid abrupt relayout.

- 2026-03-06 | self | User requested all timeline motion durations be 300ms, not 1000ms. Keep transform/Now/interval durations aligned at 300ms to avoid mismatch artifacts.

- 2026-03-06 | self | To avoid empty partial-interval gaps, ensure tick window includes at least the interval containing `now` (not only viewport-buffer ticks). For smoother interval-step changes, add intermediate NICE interval values (3,4,6,8,...).

- 2026-03-06 | self | Suspected infinite loop/hang during latest timeline-zoom tweak; rolled back `mode.ts`/`ticks.ts` delta-based coordinate-window/interval-step changes immediately and kept behavior at previous stable state for safety.

- 2026-03-06 | self | When iterative visual tuning diverges, user prefers stepping back: revert code experiments first, then lock a detailed behavior spec before re-implementing.

- 2026-04-15 | self | In `Deployment`, `TruncateWithTooltip` copies its `copyText` prop, not necessarily the visible label, so `showEndpoint={false}` can still support an endpoint copy action without changing the displayed text.

- 2026-04-15 | self | Treated `nx run-many -t test` as a test-runner hang first. In this sandbox the real blocker is earlier: Nx isolated plugin workers cannot `listen()` on Unix sockets and time out with `Failed to start plugin worker`; with `NX_ISOLATE_PLUGINS=false` graph creation works, and a separate broad-run issue remains because many projects have `test` targets but no spec files. When Nx appears hung here, check socket `EPERM` and disable isolated plugins before debugging individual tests.
- 2026-04-15 | self | Adding `passWithNoTests: true` alone fixed non-interactive Vitest runs but not TTY runs: `nx test <project>` still opened Vitest `DEV` mode and sat on "No test files found". In this workspace, explicitly set `watch: false` inside each `vite.config.ts` `test` block as well; Nx's executor-level default was not enough to prevent interactive watch mode.
- 2026-04-15 | self | When validating a new feature lib with `tsc -p`, shared dependency errors can obscure whether the new code is actually broken. First isolate touched files with targeted ESLint or direct inspection, then fix any small shared blocker only if it is clearly safe and needed for verification.
- 2026-04-15 | user | For metadata contracts used mainly as readable app-facing shapes, prefer one inline typed interface over a stack of alias types when the aliases do not add real leverage. Keep the strong typing, but optimize for scanability.
- 2026-04-14 | self | Verified `@bufbuild/protobuf` v2 can build registries directly from `FileDescriptorSet` or `FileDescriptorProto` via `createFileRegistry`; use that for dynamic protobuf payload codecs instead of inventing custom descriptor parsing.
- 2026-04-14 | self | `@bufbuild/protobuf` is about 1.9M on disk in this repo. For optional protobuf tooling, lazy-load the runtime with `import()` so the feature stays on-demand instead of eagerly inflating the app bundle.
- 2026-04-14 | user | Even if a new feature lib starts as TS-only, if it may later host React components, scaffold it with the repo's React-capable feature-lib tsconfig/vite layout up front.
- 2026-04-14 | user | Preferred simplifying protobuf loading by making the feature module itself the lazy boundary instead of adding an internal `loadProtobufRuntime()` layer. If consumers can lazy-import the feature, keep the implementation direct.
- 2026-04-15 | self | I initially covered the protobuf `.proto` formatter mostly with happy-path shape tests. For UI-facing helpers that must not crash the app, also add explicit failure-path tests for corrupted schemas, missing types, load failures, and unexpected internal errors.
- 2026-04-15 | user | In metadata resolvers, prefer direct templated key access over tiny wrapper helpers when the helper adds no behavior. Shape the interface so `metadata?.[\`schema.${path}.content_type\`]` and similar lookups typecheck directly.
- 2026-04-15 | user | In schema-metadata naming, prefer generic `schema` terms over protobuf-specific or process-heavy names like `resolve*` / `*Preview`. Keep protobuf-specific names only in code that actually renders protobuf content.
- 2026-04-15 | user | When UI rendering depends on several schema/content-type branches, prefer one unified view-model builder over splitting label/title logic across metadata and component files.
- 2026-04-15 | user | For handler input/output, the schema-layer helper should take the full inputs (`schema`, `contentType`, `label`, `metadata`) and return the full rendering model, instead of only returning a protobuf subset and leaving the component to branch further.
- 2026-04-15 | user | When a render-model helper has several branch cases, prefer an explicit `variant` selector plus per-variant builders over a stack of opaque `if` returns. Put the case explanations in JSDoc near the selector.
- 2026-04-15 | user | For discriminated UI models, prefer one flat discriminator field and top-level payload properties over duplicated `variant` + `kind` fields or nested `content` wrappers.

- 2026-04-14 | self | Moving codec context to `Entry.tsx` looked straightforward, but popover command previews in `CompletionNotification`/`TransientError`/`LifeCycle` bypass the normal row boundary. When centralizing context, always search for alternate render paths that mount the same child components outside the main tree.
- 2026-04-14 | self | Added `useServiceDetails` for codec context without disabling mount refetch. For journal rows and cached metadata lookups, explicitly set `refetchOnMount: false` unless fresh-on-navigation behavior is actually needed.
- 2026-04-14 | self | The journal input row is a special render path outside `Entry.tsx`. If codec context is centralized per entry row, keep `Input.tsx` self-contained instead of forcing `JournalV2.tsx` to manage a one-off provider.
- 2026-04-14 | self | `useDecode`/`useEncode` belong with codec context, not in `admin-api-hooks`. When a hook’s only job is applying `decoder`/`encoder` with codec options, keep it in the codec lib and leave data-access hooks focused on API data.
- 2026-04-14 | user | Did not want `useDecodeState` moved with the codec hooks. Keep state-specific decode aggregation in `admin-api-hooks`; only move the plain codec wrappers (`useDecode`/`useEncode`) into the codec lib.
- 2026-04-14 | user | Then asked to move `useDecode` and `useEncode` back too. Keep all three decode/encode query hooks together in `admin-api-hooks`; the codec lib should stay focused on context/types.
- 2026-04-11 | self | A shared `WaveAnimation` wrapper component made overview cards awkward because the feature only needed a DOM marker on the real card element. Prefer a small prop helper from the wave lib (`waveAnimationProps`) over wrapper components or base-card coupling when the concern is attribute-only.
- 2026-04-11 | self | For icon-only segmented controls tied to search params, reusing the existing `Nav` active-indicator with local descendant styling and `sr-only` labels is simpler than inventing a separate toggle component or widening the shared nav API.
- 2026-04-11 | self | When a feature already uses a shared search-param nav primitive, don’t replace it with custom links just to tune visuals. Keep `Nav`/`NavSearchItem` and tighten the indicator/container/item styling locally.

- 2026-03-06 | self | For stable live interval rendering, model intervals as a contiguous flex-row slot stream with buffered offscreen slots, and include the active slot even when only partially complete.

- 2026-03-06 | self | To avoid radical re-bucketing on interval recalculation, clamp each interval adaptation step to at most 2x upshift or 0.5x downshift and converge over multiple updates.

- 2026-03-06 | self | Applying 2x clamp inside tick-count guardrail can trap startup interval at tiny values (e.g., 1ms -> 2ms). Seed unknown-width interval from duration tick budget first, then apply stepwise transitions.

- 2026-03-06 | self | For "infinite" interval flow, render fixed-width slots past current coordinate end and rely on container clipping rather than shrinking the tail slot to remainder duration.

- 2026-03-06 | self | Missing intervals after `Now` can be caused by overlay composition, not slot generation. Keep `Now` as a thin marker only and ensure slot boundaries render independently from labels.

- 2026-03-06 | self | Slot generation tied to `now` can still create perceived pop-in. Use a fixed visible-window slot budget plus symmetric buffer to keep future slots continuously present.

- 2026-03-06 | self | Local interval normalization in `Units` (`max 10 slots`) conflicted with engine interval selection and coarsened display density (e.g., showing 1s while engine chose 0.5s). Keep visual interval synchronized to engine output.

- 2026-03-06 | self | Rendering only major slots can make post-`Now` area look empty when `Now` sits inside a long active slot. Render a continuous minor-grid stream (half-step) and keep labels only on major boundaries.

- 2026-03-06 | user | Root cause called out correctly: interval rendering was coupled with post-`Now` visual treatment. Keep interval grid and `after-now` hatch as separate layers to avoid appearance that intervals disappear.

- 2026-03-06 | self | Width/min-width transitions on transformed timeline containers can cause visible interval "breathing" even when interval unit is unchanged. Animate transform only; keep width updates immediate.
- 2026-04-11 | self | In overview cards, an empty-state component (`ServiceStatusBar`) rendered its own two-row stack inside a shared primary/secondary column wrapper, which pushed the primary label out of vertical alignment. Empty states inside shared column shells should render only the primary line and let the outer wrapper own the secondary-row spacing.
- 2026-04-11 | self | Reusing `Deployment` for the overview deployment column kept logic centralized, but the component's outer flex centered the icon across the whole two-line body. When a shared renderer gets reused in a two-line card header, align the icon to the primary row through the consuming class hooks instead of duplicating the markup.
- 2026-04-11 | self | For overview first-column consistency, let the overview own the second-row rhythm and reserve `Deployment` for the complex endpoint/icon logic only. Reusing a shared renderer for both rows made service/deployment toggles drift because internal spacing competed with the card shell.
- 2026-04-11 | self | Reusable component variants should use semantic names when possible. `default`/`overview` made `Deployment` feel implementation-specific; `primary`/`secondary` reads better at call sites and survives future reuse better.
- 2026-04-11 | self | When extracting conditional `GridList` branches into separate components, push filtering, derived rows, and section rendering into the new files, but keep user state in the parent if unmounting would otherwise reset behavior across view toggles.
- 2026-04-11 | self | If a route still ends up threading the same filter/sort/query-derived props into extracted view components, a route-scoped context/provider is a good next step. It keeps one subscription to the shared data while letting the route focus on page chrome and the children focus on their own rendering.
- 2026-04-11 | self | Query param names can be short (`view`) while the code stays explicit with semantic module/type names (`overviewMode`). Keep the URL simple, and let internal naming carry the domain meaning.
- 2026-04-11 | self | If a tiny helper module only exists to hold a closely related type/sort utility (like deployment-service sorting next to deployment sorting), prefer merging it into the existing domain helper file instead of keeping a second micro-file.
- 2026-04-11 | self | If a feature invents a one-off wrapper like `OverviewAnimatedCard`, that usually belongs in the shared primitive library instead. Keep DOM-marker details (`data-*` selectors) inside the shared lib, and let features pass a simple semantic key like `overview-card`.
- 2026-04-14 | self | Moving a heavy TanStack Query transform from `select` into the shared `queryFn` path is a good way to pay the cost once, but you also have to change the hook's options type to the transformed data shape. Reusing raw `HookQueryOptions` leaks raw `staleTime`/query generics and breaks consumers even if the runtime behavior is correct.

- 2026-03-06 | self | In full-trace live view (`zoomLevel=1`), interval drift comes from slot width recomputation, not container transform. Keep slot/spacer `width` transitions enabled for live edge states, and don't gate edge animation solely on `canReturnToLive`.

- 2026-03-06 | self | Animating slot layout on boundary/topology change (`firstIndex`/slot count/unit) can produce a brief rightward drift before leftward correction. Animate slot widths only when slot topology signature is stable between frames.

- 2026-03-06 | self | With transform transition expressed in `%` of the zoomed element, immediate width (`zoomLevel`) changes can create a brief opposite-direction snap. Animate transform only when `zoomLevel` is unchanged from previous frame.

- 2026-03-06 | self | Monotonic clamping of visual shift in render path can cause transient blank/offscreen states; avoid clamping rendered transform via stale refs. Prefer transition gating on stable frame properties.

- 2026-03-06 | self | Animating interval slot widths while parent zoom width also changes creates temporary scale mismatch (double animation), causing visible jumps. Restrict slot-width animation to start-anchored viewport stage (`viewportStart ~= start`), and rely on parent transform animation in trailing-window mode.

- 2026-03-06 | self | Snapping slot stream anchor to `floor(visibleLeft / unit)` causes periodic rightward jumps at unit boundaries. Use a continuous anchor (`visibleLeft - buffer`) and allow only first/last slot to be partial so boundary rollover happens offscreen.

- 2026-03-06 | self | Biggest persistent live-follow jump source was `JournalV2` smoothing cutoff at 15s (`FOLLOW_LATEST_THRESHOLD`): after cutoff, timeline end advanced only on 1s polls. Keep `liveNow`-based end smoothing active for all live, incomplete timelines; handle far-future poll jumps as a separate edge case.

- 2026-03-06 | user | Requested original post-Now visual treatment back while keeping interval rendering separate. Restore a dedicated post-Now overlay layer (45° white hatch) and keep Now marker on explicit `left` linear transition.

- 2026-03-06 | self | If timeline `end` is smoothed but `Units` `dataUpdatedAt` remains raw poll time, `Now` still jumps. Feed `ScrollableTimeline`/`Units` with the same smoothed timestamp used for live `end` while keeping raw snapshot time for data semantics elsewhere.

- 2026-03-06 | self | Gating parent transform animation on `zoomLevel` stability in live-follow can force motion into slot-width updates only and produce subtle label jitter. Prefer always-on live-edge transform animation after smoothing input timestamps.
- 2026-03-06 | self | Always-on live-edge transform animation reintroduced right-left jump in partial live-follow. Reverted to zoom-stability-gated transform animation and handle label micro-jitter with other adjustments.
- 2026-03-06 | self | With continuous smoothed `end` in `JournalV2`, single-motion model is viable: keep parent transform animation on for live-edge states and disable slot width transitions during live-edge to avoid dual-motion micro-jitter.
- 2026-03-06 | self | Split behavior by viewport anchor improved stability: in start-anchored stage animate slot widths (smooth early growth), in tail-follow stage keep slot widths static and pin `Now` at right edge in live-edge mode.
- 2026-03-06 | user | Requested engine-owned live clock to avoid UI-layer timing drift. Move `now` progression into `TimelineEngineProvider` (100ms step), feed smoothed `rangeEndMs` to zoom engine, and drive `Units` now marker from `engine.nowMs` instead of query timestamp.
- 2026-03-06 | self | `requestAnimationFrame` + quantization made 250ms pacing feel inconsistent in practice. Use a strict `setInterval(250ms)` for live headroom ticks and linear transform timing to make movement cadence perceptually steady.
- 2026-03-06 | self | Smoothed poll-cadence estimation (`70/30`) can stall headroom before slower polls arrive. For live presentation pacing, use latest observed poll interval directly so 250ms steps continue until next data update.
- 2026-03-06 | self | 100ms engine clock caused too-frequent geometry churn in tail-follow. 300ms cadence aligns better with current 300ms linear transitions and reduces >15s jitter. Keep slot-width animation only in start-anchored stage; tail-follow should rely on parent transform motion.
- 2026-03-06 | self | Mixing immediate width changes with transform animation in `ScrollableTimeline` can cause right-then-left motion. Use a fixed-width container and a single transform (`scaleX(...) translateX(...)`, origin left) so zoom + offset animate atomically.
- 2026-03-06 | self | `scaleX(...)` on the timeline container stretched labels and broke visual readability. Keep timeline zoom as layout width (`width/min-width`) plus `translateX` only; avoid scaling text layers.
- 2026-03-06 | self | Even without `scaleX`, animating `width/min-width` together with `translateX` introduces subtle micro-jiggle. Keep width updates immediate and animate only `transform` on parent timeline layers.
- 2026-03-06 | self | In this timeline, switching parent layers to transform-only animation made perceived jitter worse for the user. Revert quickly to previous transition settings and tune jitter elsewhere.
- 2026-03-06 | self | To stabilize `Now` in tail/live-edge states, render it outside the transformed timeline layer (pinned to viewport right) and disable the in-layer marker for that state.
- 2026-03-06 | self | In `>15s` tail-follow, disabling slot-width transitions causes perceptual snapping as denominator/anchor updates. Keep width transitions on for stable slot topology in live-follow.
- 2026-03-06 | self | Do not derive `nowMs` from `rangeEnd=max(actualEnd, now)`; that breaks future-trace scenarios by placing `Now` at future edge. Keep `nowMs` as wall-clock time and pin-right only when viewport has no future headroom.
- 2026-03-06 | self | For far-future latest edges in live-follow, auto-widen the viewport by `futureHeadroom + pastContext` (with a past-context floor) so `Now` remains within view with historical context instead of sticking to the left edge.
- 2026-03-06 | self | In future-headroom live-follow, driving viewport math from per-tick wall-clock `now` causes intervals/grid drift while future edge appears fixed. Freeze the viewport reference `now` between data-edge updates, but keep marker `now` live for smooth motion.
- 2026-03-06 | self | `Now` marker smoothness in non-start-anchored windows requires animating its `left` position there too; gating animation only to start-anchored mode causes visible jumps.
- 2026-03-06 | self | When re-entering live mode, reset the frozen viewport-now anchor immediately to current wall-clock; otherwise future-headroom sizing can reuse stale non-live anchors.
- 2026-03-06 | self | Right-edge pinning for `Now` can become visually wrong if the threshold is too broad. Pin only in strict live-follow and only when `Now` is within a very small proximity to viewport end.
- 2026-03-06 | self | In live mode, `Now` should be extrapolated from the polled authoritative timestamp, not free-running wall clock. Use bounded extrapolation (~poll cadence) and drive `rangeEnd` from this bounded `Now` to avoid `Now`/grid outrunning stale data.
- 2026-03-06 | self | `actualEnd` can stay unchanged when future entries dominate, so it is not a reliable poll-update signal. Pass `authoritativeNowMs` separately (latest poll timestamp) into the engine and key live anchors/freeze logic off that value.
- 2026-03-06 | user | Preferred ownership split: data owns `Now`; engine only handles transitions/layout. When correctness and smoothness conflict, remove engine-side autonomous `Now` advancement.
- 2026-03-06 | self | Poll-to-poll jitter in long live windows improves when transition duration is longer than 300ms. Use adaptive duration (e.g. ~700ms for `>=15s` viewport) for transform + interval width + now-position transitions.
- 2026-03-06 | user | For 2x interval steps, abrupt re-bucketing is visually harsh. A smoother approach is pairwise merge animation in the current slot stream: leading slot expands to absorb neighbor while trailing slot shrinks to zero, then swap to new interval grid.
- 2026-03-06 | user | Preferred 2x merge choreography is right-slot-preserving: left slot drops label/border and shrinks to zero, right slot keeps label/border and grows to absorb left; both should switch to merged-slot color before commit.
- 2026-03-06 | self | During 2x interval merge, label drift can come from recomputing slot anchor/duration mid-merge. Freeze anchor bounds for the merge window and release snapshot one frame after commit to avoid `+Ns` position hops.
- 2026-03-06 | self | If `<15s` behavior is stable but `>15s` still hops during 2x transitions, keep one transition profile across durations (300ms) in both parent timeline transform and Units merge widths; mixed duration branches can reintroduce visible drift.
- 2026-03-06 | self | In tail/live-follow windows, freezing merge `duration` while parent zoom/domain keeps updating can create exaggerated 2x merge motion. Freeze only slot anchors during merge; keep duration/viewport scaling live.
- 2026-03-06 | self | Buffering anchors as `k * unit` makes a 2x interval step move the anchor itself, which shifts labels even during a merge. Use viewport-duration-based side buffer so anchor stays stable across unit changes.
- 2026-03-06 | self | If 2x merge still collides visually with poll updates, defer the merge start by ~half estimated poll cadence (bounded) so polling and interval topology changes do not occur in the same frame window.
- 2026-03-06 | user | Preferred 2x merge staging: apply merged styling first (hide alternate label/border + merged color), then animate width collapse/expand, and only remove collapsed slots slightly later.
- 2026-03-06 | self | Deferring 2x merge to mid-poll introduced wrong behavior in practice. Better fit is in-place staged merge (`prepare` style pass, then width morph, then delayed commit) without poll-cadence scheduling.
- 2026-03-06 | self | Two major live shocks can coincide: follow-window step jump and interval 2x upshift in same update. Fix by continuous follow-window growth and by freezing tick interval for one frame when follow-window size changes materially.
- 2026-03-06 | self | To start interval coarsening earlier in live-follow (less dramatic at threshold), use a stricter proactive low-spacing trigger for upshift than generic hysteresis.
- 2026-03-06 | self | New interval entry can feel jumpy if width animation is disabled when first visible slot index changes by one. Keep animation enabled for single-slot shifts at same unit/count to smooth left drift without reintroducing full relayout artifacts.
- 2026-03-06 | self | Reverted single-slot-shift slot-width animation gate (did not improve visually). Better compromise: keep strict slot-width animation gate, but animate leading spacer when unit is unchanged so entry drift is smooth without topology artifacts.
- 2026-03-06 | self | Spacer-only animation smoothing also degraded UX and was reverted. Keep this as a failed experiment; do not reintroduce without a separate anchor-translation model.
- 2026-03-06 | user | Requested cadence-driven motion model: advance timeline presentation every 250ms and animate for 250ms, moving intervals/now/traces together without changing their relative alignment.
- 2026-03-06 | self | Implemented bounded 250ms presentation stepping in `TimelineEngineProvider` between polls (cadence-capped), and aligned `ScrollableTimeline` + `Units` transition durations to 250ms.
- 2026-03-06 | user | Clarified 250ms pacing semantics: do not advance `Now`; keep `Now` authoritative and fixed relative to interval boundaries, while only adding synthetic headroom (`rangeEnd`) to drive smooth leftward motion.
- 2026-03-06 | self | With synthetic headroom ticks, if follow-window duration also changes between polls, intervals rescale and look jumpy. Lock follow-window duration between authoritative updates so inter-poll motion is translation-dominant.
- 2026-03-06 | self | Under throttled/slow polling, cadence-capped headroom progression freezes then jumps. For smoother perceived motion, keep headroom uncapped between polls and advance by at most one 250ms step per timer tick (no multi-step catch-up jumps).
- 2026-03-06 | user | 250ms-quantized presentation still felt discrete under throttled network. Remove quantization entirely and drive live headroom as continuous elapsed wall-clock time via `requestAnimationFrame`.
- 2026-03-06 | self | Poll-boundary jumps remained because headroom was reset to zero on authoritative updates. Preserve continuity by re-basing headroom from previous presented end and continue from that anchor.
- 2026-03-06 | self | Even with transform animation, combining `width/min-width` transitions in the same container can create visual jumps. In timeline containers, animate `transform` only and keep width/min-width immediate.
- 2026-03-06 | user | Previous two changes (headroom continuity rebase + transform-only transitions) made UX worse in this timeline. Revert quickly before further tuning.
- 2026-03-06 | self | To diagnose residual jumps without changing behavior, log `zoomLevel`/`offsetPercent` deltas per frame in `ScrollableTimeline` behind `timelineDebug=1` and correlate motion direction with viewport/domain deltas.
- 2026-03-06 | self | Poll logs showed two-phase updates (`nowDelta` first with no frame motion, then large geometry jump). Cause: `useTimelineZoom` derived output from reducer-latched inputs one render behind. Derive from current inputs each render, keep reducer sync for memory/state updates.
- 2026-03-06 | self | Another jump source in live-follow: poll update resets headroom so `rangeEnd` can move backward relative to previously presented frame, then catch up later. Clamp presented `rangeEnd` to monotonic non-decreasing to prevent freeze-then-catch-up motion.
- 2026-03-06 | self | Large poll-time jumps can come from composing new `baseRangeEnd` with stale headroom in the same render. Stabilize by subtracting `baseRangeEnd` delta from headroom before forming `candidateRangeEnd`.
- 2026-03-06 | user | Base-delta headroom compensation made UX worse; reverted immediately and kept prior monotonic-range-end logic.
- 2026-03-06 | self | Replaced headroom-reset model with a single monotonic `presentedRangeEnd` clock driven by animation frames: snap up to data floor when needed, otherwise advance by frame `deltaMs`. This removes poll-coupled reset math.
- 2026-03-06 | user | Monotonic `presentedRangeEnd` clock rewrite made UX much worse; reverted immediately to prior headroom-based logic.

- 2026-03-08 | self | Productionization pass was safer when done as extraction + cleanup without changing behavior contracts. Keep feature components rendering-focused and move timeline math/state orchestration into `libs/ui/timeline-zoom` helpers/hooks.

- 2026-03-10 | self | Interval guardrail step-by-step (single 2x per derive) can leave timeline in permanently overcrowded state when inputs are stable. Ensure engine interval selection reaches a guardrail-compliant target in one derive, and let presentation layer animate convergence steps.
- 2026-03-10 | self | Moving shading from `Units` into transformed timeline content changed vertical anchoring because `ScrollableTimeline` already applies top padding. If overlay must reach the visual top, compensate with a negative top offset equal to that padding.
- 2026-03-10 | self | Right-anchored zoom-in on every click feels like a forced jump in inspect mode. Anchor zoom to viewport center by default, and only keep right-anchor when `Now` is pinned to the edge.
- 2026-03-10 | self | Live lag label (`-1h40m`) can feel distracting because text width changes while scrolling. Stabilize with a fixed-width label slot (`w-[8ch]`) and tabular/mono numerals.
- 2026-03-10 | self | Inspect sticky-to-latest should not trigger on zoom actions; otherwise zoom can unexpectedly jump viewport to right edge. Trigger sticky only on pan-near-edge moves.
- 2026-04-10 | self | New client-side query APIs must live under `/query/*` and be added to `libs/data-access/query/src/lib/query.ts`; the admin API client only intercepts those paths into the local query router.
- 2026-04-10 | self | `NavSearchItem` with `search=""` is only active when the full URL has no query string. For toggles with a default view plus other params, use an explicit search param or `NavButtonItem` with custom active state.
- 2026-04-10 | self | `pnpm nx create admin-api-spec` can fail here with `NX Failed to start plugin worker`. Fallback is to run `./libs/data-access/admin-api-spec/src/merge.mjs` and then `pnpm exec openapi-typescript ./libs/data-access/admin-api-spec/src/lib/output.json -o ./libs/data-access/admin-api-spec/src/lib/index.d.ts` directly.
- 2026-04-10 | self | The overview service cards reserve extra top-row height with a secondary-line block. When deployment cards feel tighter, fix the deployment header rhythm inside the column renderer instead of changing the shared `OverviewCard` shell.
- 2026-04-10 | self | In overview cards, secondary metadata should reuse the app’s subtle transparent-badge treatment when there is an adjacent affordance like copy/info; plain gray text looks visually detached next to service card metadata.
- 2026-04-10 | self | In the overview grid, cells are vertically centered within the row. If the first line across columns looks misaligned, match the number and height of internal rows in each column rather than tweaking the outer card or grid item alignment.
- 2026-04-10 | self | In overview grid cells, if a header/link affordance feels like it fills the whole column, shrink the renderer with `max-w-fit` plus an `inline-grid`/fit-content inner wrapper. The outer grid column can stay wide for layout without making the hover region look full-width.
- 2026-04-10 | self | Matching overall height is not enough for overview cards; the first column has to use the same internal row structure as the service card. If deployment still shifts vertically, split endpoint and deployment id into separate stacked rows with the same spacing/margins as service name and service type.
- 2026-04-10 | self | Reusing the same badge component is not enough for visual alignment if its default padding is overridden. In overview first-column metadata rows, collapsed `px/py` on the deployment id badge made the top-row rhythm drift even though the component family matched the service-type badge.
- 2026-04-10 | self | For deployment status pills, prefer explicit label text (`Active`/`Drained`) over a global `lowercase` utility so copy changes don't depend on styling.
- 2026-04-10 | self | `NavSearchItem search=\"\"` only works as a true default when the whole query string is empty. For defaults like `1h` or `Services`, pass the specific managed param keys and preserve unrelated params while treating “that param is absent” as active.
- 2026-04-11 | self | For single-parameter toggles, `NavSearchItem` is clearer as `param` + optional `value` than as raw `search` plus managed keys. The default tab is simply `value` absent, which removes that param while preserving unrelated query params.
- 2026-04-11 | self | Don’t keep `useMemo` around trivial derived containers unless identity actually matters downstream. In overview, wrapping `new Set(drainedDeploymentIds)` added noise without changing behavior because the set was only used for immediate `.has()` checks.
- 2026-04-11 | self | If a query result is always consumed in one derived shape, prefer doing the transformation in the hook `select` rather than rebuilding it in each caller. `useListDrainedDeployments` returning a `Set` directly is cleaner than memoizing or recreating that `Set` in `useOverviewData`.
- 2026-04-11 | self | When overview starts duplicating entity rendering (icon, title, id, copy affordance), move that into the shared feature component and expose small opt-in props plus internal class hooks. Re-skinning the shared `Deployment` component was cleaner than keeping a second deployment renderer in `columns.tsx`.
- 2026-04-11 | self | If multiple overview columns share the same “primary row + optional secondary row” rhythm, centralize that wrapper instead of hand-building the same `hidden md:flex flex-col` structure in each column.
- 2026-04-11 | user | The overview mode toggle didn’t need custom segmented-control logic. A simple `Nav`/`NavSearchItem` implementation with a few local descendant selectors for radius and active icon color was clearer and easier to tune than layering extra control abstractions.
- 2026-04-11 | self | When an overview link is conceptually “in-flight invocations”, encode that status filter in the shared invocation-link helper instead of leaving the caller to imply it only through link text.
- 2026-04-13 | self | When a feature-local split button wraps an already-disabled primary action, make the shared `SplitButton` accept `disabled` too; otherwise the dropdown half can accidentally bypass the same guard.
- 2026-04-13 | self | If a shared dropdown item already supports disabled rendering through the underlying menu primitive, expose `isDisabled` on the public `DropdownItem` props too so features can disable actions without fighting the type layer.
- 2026-04-13 | self | For long-running query-param dialogs, `QueryDialog` combined with `DialogContent isDismissable={false}` during the mutation is a good way to keep progress visible and prevent accidental mid-run closes.
- 2026-04-13 | user | If a query-param dialog needs to clear local UI state on close, reset it from the explicit close path (`QueryDialog onClose` and any programmatic close helper) instead of mirroring `isOpen` with a `useEffect`.
- 2026-04-13 | user | For batch deletion flows with per-item progress, a bounded worker pool (for example concurrency 100) is a better fit than a strictly sequential loop: it keeps throughput high while still letting the progress cache update per item as each request settles.
- 2026-04-14 | user | In routed forms, prefer `Form` from `react-router` instead of a plain `<form>` so submission behavior stays aligned with the app’s routing/data APIs.
- 2026-04-14 | user | `DialogFooter` renders through a portal, so footer actions are not inside the same DOM subtree as dialog body forms. If submit controls live there, either give the form an `id` and target it from the footer button, or render the form inside the footer.
- 2026-04-14 | self | When the overview hero legends shift during loading, the real source can be the center metric row changing width rather than the legend items themselves. A fixed width on that metric row was a cleaner stabilizer than legend-specific loading placeholders or grid scaffolding.
- 2026-04-14 | self | For batch delete flows, keeping progress in the inner delete mutation’s `onSettled` is fine and keeps the hook simpler, as long as per-item failures are injected through the actual mutation path. Artificial failures thrown before `mutateAsync` will bypass that accounting and give misleading UI results.
- 2026-04-14 | self | When codec hooks add a context object to a TanStack query key, keep the key typed as a fixed tuple (`CodecQueryKey`) instead of a widened array. Otherwise `queryKey[0]` stops narrowing to the string value and `useQueries(..., combine)` can lose its derived result type.
- 2026-04-14 | self | When codec context depends on journal entry details, derive it through one shared helper (`getCodecOptions`) instead of rebuilding ad hoc objects in each entry component. That keeps `targetService`/`targetHandler`/`targetKey`/`targetCommand` and name-field fallbacks consistent.
- 2026-04-14 | user | Codec `handlerMetadata` should stay minimal. Use only the fields the codec needs (`metadata`, `input_description`, `input_json_schema`, `output_description`, `output_json_schema`) instead of passing the full generated handler type through context.
- 2026-04-14 | user | Codec option naming should be domain-first, not route-like: prefer `service`, `key`, `handler`, and `command`, with `command` shaped as `{ type, name }` instead of separate `target*` and `*Name` fields.
- 2026-04-14 | user | For codec context in journal entry components, prefer local readability over abstraction. Inline small `codecOptions` objects near each payload render instead of hiding derivation behind a shared `getCodecOptions(...)` helper.
- 2026-04-14 | self | A `CodecProvider` wrapped too broadly can leak codec context into plain helper popovers like state keys or call names. Scope the provider around the actual payload `Value`/`Input` nodes so only encoded data inherits codec behavior.
- 2026-04-14 | user | Keep the codec lib simple: `CodecProvider` should only store codec options in context. Do not fetch handler details inside the codec lib; callers should provide any handler metadata they want used.
- 2026-04-14 | user | Keep codec option merging simple too. Prefer plain parent/local spread semantics with straightforward nested `handler`/`command` merges over service-change/type-change reset logic.
- 2026-04-14 | user | Don’t merge codec context in the provider at all. `CodecProvider` should set exactly the provided options; if anything needs composition, that should happen in the consumer before passing `options`.
- 2026-04-14 | user | For journal rendering, fetch handler metadata in `JournalV2` and pass it through codec context there. Keep the codec lib itself dumb; centralize `useServiceDetails` at the route-level entry tree instead of in every entry component.
