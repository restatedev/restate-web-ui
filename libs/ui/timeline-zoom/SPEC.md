# Trace Timeline Behavior Spec (Agnostic, Detailed)

## 1. Purpose

Define user-visible behavior for a time-based trace timeline that supports:
- live streaming updates,
- manual inspection,
- zoom and pan,
- interval grid and labels.

This spec is intentionally agnostic to rendering technology and internal architecture.

## 2. Core Terms

- Trace domain: `[traceStart, traceEndKnown]`, where `traceEndKnown` may grow while streaming.
- Viewport: the currently visible subrange of the trace domain.
- Latest edge: newest known timestamp (`traceEndKnown`).
- Live edge: viewport right edge aligned with latest edge.
- Interval grid: contiguous partitions of time used for labels and alternating background bands.
- Active interval: interval that contains current time (`now` or latest known point used for presentation).

## 3. Modes

- Static mode:
  - data is complete,
  - trace domain no longer grows.
- Follow-latest mode:
  - streaming enabled,
  - viewport remains attached to live edge.
- Inspect mode:
  - user has moved away from live edge, or manually controls viewport.

## 4. Global Invariants

- No teleporting:
  - content must not jump right then left (or left then right) for one logical update.
- No unpainted holes:
  - inside the visible interval layer, there must be no empty gap between adjacent intervals unless explicitly designated as out-of-domain/future area.
- Monotonic live motion:
  - in follow-latest mode, perceived timeline motion is continuous and one-directional.
- Deterministic replay:
  - same input stream + same user actions => same viewport/interval sequence.

## 5. Interval Grid Behavior

### 5.1 Coverage

- Interval slots cover the visible interval layer continuously.
- The active (partial) interval is always visible if any portion intersects viewport.
- Future/out-of-domain visualization must be explicit and distinct from missing interval rendering.

### 5.2 Partial Interval

- The active interval appears as a regular interval slot with partial progress.
- Partial progress grows smoothly over time.
- A partial interval must never appear as empty space between completed intervals and `Now`.

### 5.3 Labels

- Completed intervals show their boundary label.
- Active interval label appears only after that interval is complete.
- Label updates must not cause interval geometry jumps.

### 5.4 Alternating Bands

- Alternation parity is consistent across adjacent intervals.
- Parity changes only due to interval index progression, not due to rendering artifacts.

## 6. Interval Density Adaptation

### 6.1 Stability Priority

- Density adaptation must prioritize visual stability over optimal tick “niceness.”
- During live streaming, adaptation should avoid abrupt full-grid re-bucketing whenever possible.

### 6.2 Incremental Change Requirement

- Effective visible interval count should evolve incrementally.
- A single adaptation step should not radically replace most labels/boundaries in one frame.
- Prefer transitions that change perceived density by approximately one step at a time.

### 6.3 Adaptation Triggers

- Adaptation may occur when viewport duration, container width, or mode materially changes.
- In follow-latest mode, adaptation should be less aggressive than in static inspect workflows.

## 7. Live Motion Behavior

### 7.1 Follow-Latest

- Viewport remains attached to latest edge.
- Time appears to flow continuously.
- Poll/data-update boundaries must not create a momentary snap.

### 7.2 Inspect While Streaming

- If user is away from live edge, viewport remains stable where placed.
- Incoming data must not force viewport displacement.
- Returning to live edge restores follow-latest behavior.

## 8. Zoom and Pan Behavior

- Zoom in reduces visible duration by 2x per activation.
- Zoom out control is reset-to-full-trace only.
- Reset-to-full while streaming keeps full-range behavior as domain grows.
- Pan/drag/scroll changes viewport without introducing jitter.

## 9. Selector Behavior

- Selector enforces minimum usable width visually and interactively.
- Selector operations do not teleport to opposite edge.
- Selector remains usable for short and very long traces.

## 10. Long-Running Trace Behavior

- For very long traces, interaction remains stable and legible.
- Reset-to-full still means full visible trace.
- Live updates do not degrade selector usability or cause periodic oscillation.

## 11. Acceptance Scenarios

### A. Partial Interval Visibility

- Given follow-latest mode and a partial active interval,
- when consecutive frames are rendered,
- then there is no empty gap between the last completed interval and `Now`.

### B. Same-Density Continuity

- Given interval density unchanged across consecutive updates,
- when new data arrives,
- then interval boundaries drift smoothly without sudden snaps.

### C. Density-Change Smoothness

- Given density must change,
- when transition occurs,
- then visual change is incremental and not a full abrupt re-layout.

### D. Inspect Stability

- Given inspect mode away from live edge,
- when new data arrives,
- then viewport position and interval placement remain stable.

### E. Reset + Live

- Given streaming on and user resets zoom,
- when trace grows,
- then viewport remains full-trace without implicit tail-follow switch.

## 12. Non-goals

- No prescribed component structure, state machine, reducer shape, or hook APIs.
- No mandated formulas, thresholds, or CSS/animation primitives.
