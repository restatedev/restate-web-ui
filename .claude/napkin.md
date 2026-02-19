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
