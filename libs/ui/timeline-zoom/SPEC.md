# Trace Timeline Zoom Behavior Spec (Agnostic)

## Goal

The timeline supports smooth exploration of very short to very long traces while optionally following incoming data in real time.

## Core Concepts

- Trace range: full known time span.
- Viewport: currently visible time span.
- Latest edge: newest known timestamp.
- Streaming: new data may continue to arrive.

## User Modes

- Static: trace is complete and no new data is expected.
- Follow-latest: streaming is on and viewport stays attached to latest edge.
- Inspect: user controls viewport manually while streaming may be on or off.

## Streaming Control Behavior

- Streaming off: show Live with play affordance; click enables streaming.
- Streaming on and viewport at latest edge: show Live with active indicator; click disables streaming.
- Streaming on and viewport behind latest edge: show negative lag and active indicator; click jumps viewport to latest edge while keeping streaming on.

## Zoom Controls Behavior

- Zoom in reduces viewport duration by 2x each click.
- Zoom out is reset-only and sets viewport to full trace range.
- Reset-to-full while streaming keeps viewport full-range as new data extends the trace.
- Reset-to-full never silently reverts to tail-follow.

## Pan and Scroll Behavior

- Horizontal scroll or drag pans viewport in time.
- Panning away from latest edge moves to Inspect behavior.
- Returning to latest edge while streaming re-enables latest-edge behavior without extra action.

## Viewport Selector Behavior

- Selector always keeps a usable minimum visible width.
- Resizing from either side adjusts viewport bounds.
- Dragging selector body pans viewport without changing duration.
- Selector never teleports during updates or clamping.

## Interval and Tick Behavior

- Intervals prioritize visual stability over frequent relayout.
- At latest edge with streaming, intervals may animate smoothly as time advances.
- Away from latest edge, new polls must not cause right-then-left jumps.
- Interval density changes should be infrequent and non-distracting.

## Long Duration Behavior

- Very long traces preserve selector usability and legibility.
- Reset-to-full on long traces still behaves as true full-range.
- Streaming updates do not degrade interaction quality on long ranges.

## Determinism

Given the same user actions and same incoming data sequence, viewport behavior is predictable and repeatable.

## Non-goals

- This spec does not define visual styling, component layout, naming, or internal state structure.
- This spec does not prescribe specific formulas, thresholds, or animation timings.

## Acceptance Scenarios

- Streaming on at latest edge: timeline follows latest smoothly.
- Streaming on and pan left: viewport remains where placed and shows no update jitter.
- Streaming on and reset zoom: viewport becomes full-range and stays full-range as data grows.
- After reset and zoom in: viewport shrinks by 2x per click from current window.
- Very long trace: selector remains operable and not collapsed.
