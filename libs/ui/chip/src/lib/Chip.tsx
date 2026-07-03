import { Children, PropsWithChildren } from 'react';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';

type ChipEdge = 'straight' | 'angled';

const BORDER_FILTER =
  '[filter:drop-shadow(1px_0_0_var(--chip-border-color,var(--color-zinc-200)))_drop-shadow(-1px_0_0_var(--chip-border-color,var(--color-zinc-200)))_drop-shadow(0_1px_0_var(--chip-border-color,var(--color-zinc-200)))_drop-shadow(0_-1px_0_var(--chip-border-color,var(--color-zinc-200)))_drop-shadow(var(--chip-shadow,0_1px_1.5px_rgb(0_0_0/0.07)))]';

const CLIP_ROOT = '[clip-path:var(--chip-clip)]';
const CLIP_LINK = 'before:[clip-path:var(--chip-clip)]';

const CLIP_LEFT_SHARP = '[--chip-clip:polygon(7px_0,100%_0,100%_100%,0_100%)]';
const CLIP_LEFT_ROUNDED =
  'supports-[clip-path:shape(from_0_0,close)]:[--chip-clip:shape(from_10px_0,line_to_100%_0,line_to_100%_100%,line_to_3px_100%,curve_to_0.84px_calc(100%-2.88px)_with_0_100%,line_to_6.16px_2.88px,curve_to_10px_0_with_7px_0,close)]!';

const CLIP_RIGHT_SHARP =
  '[--chip-clip:polygon(0_0,100%_0,calc(100%-7px)_100%,0_100%)]';
const CLIP_RIGHT_ROUNDED =
  'supports-[clip-path:shape(from_0_0,close)]:[--chip-clip:shape(from_0_0,line_to_calc(100%-3px)_0,curve_to_calc(100%-0.84px)_2.88px_with_100%_0,line_to_calc(100%-6.16px)_calc(100%-2.88px),curve_to_calc(100%-10px)_100%_with_calc(100%-7px)_100%,line_to_0_100%,close)]!';

const CLIP_BOTH_SHARP =
  '[--chip-clip:polygon(7px_0,100%_0,calc(100%-7px)_100%,0_100%)]';
const CLIP_BOTH_ROUNDED =
  'supports-[clip-path:shape(from_0_0,close)]:[--chip-clip:shape(from_10px_0,line_to_calc(100%-3px)_0,curve_to_calc(100%-0.84px)_2.88px_with_100%_0,line_to_calc(100%-6.16px)_calc(100%-2.88px),curve_to_calc(100%-10px)_100%_with_calc(100%-7px)_100%,line_to_3px_100%,curve_to_0.84px_calc(100%-2.88px)_with_0_100%,line_to_6.16px_2.88px,curve_to_10px_0_with_7px_0,close)]!';

const styles = tv({
  slots: {
    outer:
      'group/chip relative inline-flex max-w-full min-w-0 [--chip-radius:0.5rem]',
    root: [
      'inline-flex h-6 max-w-full min-w-0 items-stretch bg-white text-xs font-medium text-zinc-600 transition-all',
      '[&>[data-chip-segment]:not(:first-child)]:-ml-1 [&>[data-chip-segment]:not(:first-child)]:filter-[drop-shadow(-1px_0px_0px_var(--chip-seam-color,var(--color-zinc-200)))]',
      '[&>[data-chip-segment]:not(:last-child)>[data-chip-segment-inner]]:[clip-path:polygon(0_0,100%_0,calc(100%-4px)_100%,0_100%)]',
      '[&>[data-chip-segment]:not(:first-child)>[data-chip-segment-inner]]:[clip-path:polygon(4px_0,100%_0,100%_100%,0_100%)]',
      '[&>[data-chip-segment]:not(:first-child):not(:last-child)>[data-chip-segment-inner]]:[clip-path:polygon(4px_0,100%_0,calc(100%-4px)_100%,0_100%)]',
    ],
    link: 'absolute inset-0 z-2 no-underline outline-offset-0 before:absolute before:inset-0 before:content-[""] hover:before:bg-black/4 pressed:before:bg-black/6',
  },
  variants: {
    left: {
      straight: {
        root: 'rounded-l-(--chip-radius) [&>[data-chip-segment]:first-child]:ml-px [&>[data-chip-segment]:first-child>[data-chip-segment-inner]]:rounded-l-[calc(var(--chip-radius)-1px)]',
        link: 'rounded-l-(--chip-radius) before:rounded-l-(--chip-radius)',
      },
      angled: {
        root: 'rounded-l-[3px] [&>[data-chip-segment]:first-child>[data-chip-segment-inner]]:rounded-bl-[3px]',
        link: 'rounded-l-[3px] before:rounded-l-[3px]',
      },
    },
    right: {
      straight: {
        root: 'rounded-r-(--chip-radius) [&>[data-chip-segment]:last-child]:mr-px [&>[data-chip-segment]:last-child>[data-chip-segment-inner]]:rounded-r-[calc(var(--chip-radius)-1px)]',
        link: 'rounded-r-(--chip-radius) before:rounded-r-(--chip-radius)',
      },
      angled: {
        root: 'rounded-r-[3px] [&>[data-chip-segment]:last-child>[data-chip-segment-inner]]:rounded-tr-[3px]',
        link: 'rounded-r-[3px] before:rounded-r-[3px]',
      },
    },
  },
  compoundVariants: [
    {
      left: 'straight',
      right: 'straight',
      class: {
        root: 'shadow-xs ring-1 ring-gray-200 ring-inset group-has-[[data-pressed=true]]/chip:shadow-none',
      },
    },
    {
      left: 'angled',
      right: 'straight',
      class: {
        outer: [BORDER_FILTER, CLIP_LEFT_SHARP, CLIP_LEFT_ROUNDED],
        root: CLIP_ROOT,
        link: CLIP_LINK,
      },
    },
    {
      left: 'straight',
      right: 'angled',
      class: {
        outer: [BORDER_FILTER, CLIP_RIGHT_SHARP, CLIP_RIGHT_ROUNDED],
        root: CLIP_ROOT,
        link: CLIP_LINK,
      },
    },
    {
      left: 'angled',
      right: 'angled',
      class: {
        outer: [BORDER_FILTER, CLIP_BOTH_SHARP, CLIP_BOTH_ROUNDED],
        root: CLIP_ROOT,
        link: CLIP_LINK,
      },
    },
  ],
  defaultVariants: {
    left: 'straight',
    right: 'straight',
  },
});

const segmentStyles = tv({
  slots: {
    wrap: 'my-px flex max-w-full min-w-0 items-stretch',
    inner: 'flex min-w-0 flex-auto items-center gap-1 truncate px-2.5',
  },
});

export function ChipSegment({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  const { wrap, inner } = segmentStyles();
  return (
    <div data-chip-segment className={wrap()}>
      <div data-chip-segment-inner className={inner({ className })}>
        {Children.map(children, (child) =>
          typeof child === 'string' || typeof child === 'number' ? (
            <span className="min-w-0 truncate">{child}</span>
          ) : (
            child
          ),
        )}
      </div>
    </div>
  );
}

export function Chip({
  children,
  className,
  left,
  right,
  href,
  'aria-label': ariaLabel,
}: PropsWithChildren<{
  className?: string;
  left?: ChipEdge;
  right?: ChipEdge;
  href?: string;
  'aria-label'?: string;
}>) {
  const { outer, root, link } = styles({ left, right });
  return (
    <div className={outer()}>
      <div className={root({ className })}>{children}</div>
      {href && (
        <Link
          href={href}
          aria-label={ariaLabel}
          variant="secondary"
          className={link()}
        />
      )}
    </div>
  );
}
