# Napkin

## Corrections

<<<<<<< HEAD
| Date       | Source | What Went Wrong                                                                                                                                                   | What To Do Instead                                                                                                                               |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-02-19 | self   | Removed flex-auto from data-entry div thinking it would let dashed line fill space, but it made content SMALLER because data-entry then had no grow and collapsed | The real issue was flex-wrap + w-full on Expression creating a circular width dependency. Always trace the full flex chain before making changes |
| 2026-02-19 | self   | Made 5 changes at once without verifying intermediate results                                                                                                     | Make minimal changes and verify each one                                                                                                         |

## User Preferences

- Uses Tailwind CSS with `tv()` from `@restate/util/styles` for component variants
- Never use string interpolation for dynamic Tailwind classes
- Never add comments unless explicitly requested
- Nothing should wrap in entry rows — if not enough space, elements should shrink

## Patterns That Work

- (approaches that succeeded)

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
| Date       | Source | What Went Wrong                                                                                                | What To Do Instead                                                                   |
| ---------- | ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 2026-02-17 | self   | Ran `pnpm nx typecheck web-ui` with Nx daemon and it stalled on project graph computation in this environment  | Use `NX_DAEMON=false` for validation commands when Nx graphing hangs                 |
| 2026-02-17 | self   | Refactoring units into a portal wrapper dropped effective height/positioning, making interval labels disappear | Keep portal units wrapper `relative h-full` and render `Units` as `absolute inset-0` |
=======
| Date       | Source | What Went Wrong                                                                                                                     | What To Do Instead                                                                                       |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 2026-02-17 | self   | Ran `pnpm nx typecheck web-ui` with Nx daemon and it stalled on project graph computation in this environment                       | Use `NX_DAEMON=false` for validation commands when Nx graphing hangs                                     |
| 2026-02-17 | self   | Refactoring units into a portal wrapper dropped effective height/positioning, making interval labels disappear                      | Keep portal units wrapper `relative h-full` and render `Units` as `absolute inset-0`                     |
| 2026-02-18 | self   | Used `h-[calc(100vh-9rem)]` on UnitsPortalTarget in grid — forced grid row to viewport height creating empty space with few entries | Use `max-h-[calc(100vh-9rem)]` instead so it caps but doesn't force height                               |
| 2026-02-18 | self   | Created virtual element for tooltip positioning (only `getBoundingClientRect`) — React Aria needs a real DOM node                   | User's approach: `followCursor` with a tiny anchor span moved via `onMouseMove` — much cleaner           |
| 2026-02-18 | self   | Patched `getBoundingClientRect` on DOM element — hacky, broke tooltip hover behavior                                                | Avoid monkey-patching DOM methods; prefer small positioned anchor elements instead                       |
| 2026-02-18 | self   | Portaled tooltip into constrained sticky container — tooltip got clipped/mispositioned                                              | `UNSTABLE_portalContainer` doesn't help if the container itself is constrained                           |
| 2026-02-18 | self   | Assigned stateRef.current = new object every render + did DOM mutation during render for zoom sync                                  | Keep useEffect for DOM sync (runs after paint); object allocation is fine but avoid DOM writes in render |
<<<<<<< HEAD
>>>>>>> 35d68a8 (update napkin)
=======
| 2026-02-18 | self   | `pnpm nx show project ...` stalled with plugin-worker/graph lock in sandbox                                                          | Fall back to scoped `pnpm tsc -p <lib>/tsconfig.lib.json --noEmit` for quick validation                  |
| 2026-02-18 | self   | Moved timeline start date/time into `HeaderUnits`, but it still rendered under the top sticky "Invoked by" section                 | Render that label outside `listRef`'s `isolate` stacking context in `JournalV2`                           |
| 2026-02-18 | self   | Introduced `PanelGroup onLayout` callback to align timeline date overlay; user considered it hacky                                  | Prefer CSS/stacking-order fixes over resize-callback alignment when possible                               |
| 2026-02-18 | self   | Raised `listRef` container to `z-30` to surface date label; sticky timeline background then covered traces above                    | Keep container z-index unchanged; use a small sticky overlay (date label only) outside `isolate`          |
| 2026-02-18 | user   | Requested `onLayout` path to be restored after accidental removal in `JournalV2.tsx`                                                 | Keep `StartDateTimeUnit` sticky overlay + `PanelGroup onLayout` width sync in `JournalV2.tsx`             |
| 2026-02-18 | self   | Date tooltip on start-date overlay didn’t open because overlay wrapper had `pointer-events-none`                                     | Keep outer sticky wrapper `pointer-events-none`, but set overlay child wrapper to `pointer-events-auto`    |
>>>>>>> 407ca3f (update start label)

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
