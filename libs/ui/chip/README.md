# Chip

Use `Chip` for one outlined target and `ChipGroup` for a sequence of separate
targets whose edges visually connect.

## Header identity pattern

`ChipGroup variant="header"` owns the shared header geometry: 28px height,
12px outer radius, 2px inner border inset, shadow clearance, white border, and
luminosity blending with the status header behind it. Pages should only choose
the content, depth color, and edge shape of each chip.

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
