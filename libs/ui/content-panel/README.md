# content-panel

Reusable page-level panel shell with a sticky toolbar, raised rounded header, and a continuous body surface.

## Layout

```
ContentPanel               (flex column, fills viewport via flex-auto)
├── sticky chrome           (sticky to top, single sticky parent for both slots)
│   ├── toolbar slot        (page-bg, content portaled in via ContentPanelToolbar)
│   └── header slot         (raised gradient + rounded-t + side/top borders)
└── ContentPanelBody        (rounded-b + side/bottom borders + bg-gray-50)
```

`ContentPanelToolbar` and `ContentPanelHeader` portal their content into panel-owned slots. Their position in the caller tree does not matter. When rendered without a `ContentPanel` ancestor they fall back to inline rendering.

The body's bg/border form one continuous surface from below the raised header to the bottom edge of the panel. The header's gradient + inset shadow create the visual "raised tab" effect at the seam, while the side borders flow continuously from header into body.

## CSS variables

- `--cp-toolbar-top` (set by the layout): viewport offset where the sticky chrome should rest. `0px` for sidebar layout, `5rem` for app-bar layout (clears the sticky `AppBar` header). Pages can override on the panel root if needed.
- `--cp-sticky-area-height` (set by the panel via ResizeObserver): combined height of the sticky chrome (toolbar + header). Updated automatically on chrome resize.
- `--cp-content-top` (derived): `calc(var(--cp-toolbar-top) + var(--cp-sticky-area-height))`. Pages whose body has its own sticky overlays (e.g. JournalV2's interval grid) read this to position themselves below the chrome.
