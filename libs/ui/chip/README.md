# Chip

Use `Chip` for one outlined target and `ChipGroup` for a sequence of separate
targets whose edges visually connect.

## Compact target pattern

`ChipGroup density="compact"` owns the shared non-header target geometry: 24px
height, a gentler 5px angled edge, and a 2px overlap between adjacent chips.
Target components should default to compact density outside headers and retain
an explicit density override for exceptional surfaces.

## Header identity pattern

`ChipGroup variant="header"` keeps the compact target's soft 5px angled edge,
uses a roomier 1px overlap, then scales the surrounding treatment: 28px height,
10px outer radius, 2px inner border inset, larger type, shadow clearance, white
border, and luminosity blending with the status header behind it. Pages should
only choose the content, depth color, and edge shape of each chip.

```tsx
<ChipGroup variant="header">
  <Chip left="straight" right="angled">
    <ChipSegment className="bg-white">Service</ChipSegment>
  </Chip>
  <Chip left="angled" right="angled">
    <ChipSegment className="bg-zinc-50">Key</ChipSegment>
  </Chip>
  <Chip left="angled" right="straight">
    <ChipSegment className="bg-zinc-100">Scope</ChipSegment>
  </Chip>
</ChipGroup>
```

For two chips, give the second chip a straight right edge. For additional
identity depth, keep middle chips angled on both sides and make neutral surfaces
progressively darker (`white`, `zinc-50`, `zinc-100`). The header group's
luminosity blend shifts those neutral shades toward the current status color.

When a composite chip group sits inside `TruncateWithTooltip`, enable
`overflowVisible` so its shape-following shadow is not clipped. Keep truncation
on the individual segment content.

## Running unit tests

Run `pnpm nx test chip` to execute the unit tests via Vitest.
