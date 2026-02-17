# Napkin

## Corrections

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

## User Preferences

- Never add comments unless explicitly requested.

## Patterns That Work

- For zoomed timeline scroll performance, reduce virtualization overscan and batch `onScroll` viewport updates with `requestAnimationFrame` plus no-op state guards.
- When there is no working-tree diff, use file-scoped commit history (`git log -- <file>`) to review the latest implementation changes.
- Removing action-entry portals (`ActionContainer`/`ActionPortal`/`RestartAction`) isolates timeline perf work by eliminating virtualized row portal churn.

## Patterns That Don't Work

- Using high overscan (`100`) on wide zoomed timeline rows causes unnecessary render work and jank.
- Subscribing a heavy component (`ScrollableTimeline`) to shared portal context updates can amplify rerenders during virtualized scroll.

## Domain Notes

- `libs/features/invocation-route/src/lib/JournalV2.tsx` and `libs/features/invocation-route/src/lib/ScrollableTimeline.tsx` drive the journal timeline virtualization and zoom/viewport behavior.
