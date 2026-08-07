import { Children, PropsWithChildren } from 'react';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';

type ChipEdge = 'straight' | 'angled';

export type ChipGroupVariant = 'default' | 'header';
export type ChipGroupDensity = 'default' | 'compact';
export type ChipSize = 'sm' | 'md' | 'lg';

const BORDER_FILTER =
  '[filter:drop-shadow(1px_0_0_var(--chip-border-color,var(--color-zinc-200)))_drop-shadow(-0.5px_0_0_var(--chip-border-color,var(--color-zinc-200)))_drop-shadow(0_1px_0_var(--chip-border-color,var(--color-zinc-200)))_drop-shadow(0_-0.5px_0_var(--chip-border-color,var(--color-zinc-200)))_drop-shadow(var(--chip-shadow,0_1px_1.5px_rgb(0_0_0/0.07)))]';

const CLIP_ROOT = '[clip-path:var(--chip-clip)]';
const CLIP_LINK = 'before:[clip-path:var(--chip-clip)]';

const CLIP_LEFT_SHARP =
  '[--chip-clip:polygon(var(--chip-slope)_0,100%_0,100%_100%,0_100%)]';
const CLIP_LEFT_ROUNDED =
  'supports-[clip-path:shape(from_0_0,close)]:[--chip-clip:shape(from_calc(var(--chip-slope)+3px)_0,line_to_calc(100%-var(--chip-radius))_0,curve_to_100%_var(--chip-radius)_with_100%_0,line_to_100%_calc(100%-var(--chip-radius)),curve_to_calc(100%-var(--chip-radius))_100%_with_100%_100%,line_to_3px_100%,curve_to_0.84px_calc(100%-2.88px)_with_0_100%,line_to_calc(var(--chip-slope)-0.84px)_2.88px,curve_to_calc(var(--chip-slope)+3px)_0_with_var(--chip-slope)_0,close)]!';

const CLIP_RIGHT_SHARP =
  '[--chip-clip:polygon(0_0,100%_0,calc(100%-var(--chip-slope))_100%,0_100%)]';
const CLIP_RIGHT_ROUNDED =
  'supports-[clip-path:shape(from_0_0,close)]:[--chip-clip:shape(from_var(--chip-radius)_0,line_to_calc(100%-3px)_0,curve_to_calc(100%-0.84px)_2.88px_with_100%_0,line_to_calc(100%-var(--chip-slope)+0.84px)_calc(100%-2.88px),curve_to_calc(100%-var(--chip-slope)-3px)_100%_with_calc(100%-var(--chip-slope))_100%,line_to_var(--chip-radius)_100%,curve_to_0_calc(100%-var(--chip-radius))_with_0_100%,line_to_0_var(--chip-radius),curve_to_var(--chip-radius)_0_with_0_0,close)]!';

const CLIP_BOTH_SHARP =
  '[--chip-clip:polygon(var(--chip-slope)_0,100%_0,calc(100%-var(--chip-slope))_100%,0_100%)]';
const CLIP_BOTH_ROUNDED =
  'supports-[clip-path:shape(from_0_0,close)]:[--chip-clip:shape(from_calc(var(--chip-slope)+3px)_0,line_to_calc(100%-3px)_0,curve_to_calc(100%-0.84px)_2.88px_with_100%_0,line_to_calc(100%-var(--chip-slope)+0.84px)_calc(100%-2.88px),curve_to_calc(100%-var(--chip-slope)-3px)_100%_with_calc(100%-var(--chip-slope))_100%,line_to_3px_100%,curve_to_0.84px_calc(100%-2.88px)_with_0_100%,line_to_calc(var(--chip-slope)-0.84px)_2.88px,curve_to_calc(var(--chip-slope)+3px)_0_with_var(--chip-slope)_0,close)]!';

const styles = tv({
  slots: {
    outer:
      'group/chip relative inline-flex max-w-full min-w-0 [--chip-inset:1px] [--chip-radius:0.5rem]',
    root: [
      'inline-flex h-(--chip-height) max-w-full min-w-0 items-stretch bg-white text-xs font-medium text-zinc-600 transition-all',
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
        root: 'rounded-l-(--chip-radius) [&>[data-chip-segment]:first-child]:ml-(--chip-inset) [&>[data-chip-segment]:first-child>[data-chip-segment-inner]]:rounded-l-[calc(var(--chip-radius)-var(--chip-inset))]',
        link: 'rounded-l-(--chip-radius) before:rounded-l-(--chip-radius)',
      },
      angled: {
        root: 'rounded-l-[3px] [&>[data-chip-segment]:first-child>[data-chip-segment-inner]]:rounded-bl-[3px]',
        link: 'rounded-l-[3px] before:rounded-l-[3px]',
      },
    },
    right: {
      straight: {
        root: 'rounded-r-(--chip-radius) [&>[data-chip-segment]:last-child]:mr-(--chip-inset) [&>[data-chip-segment]:last-child>[data-chip-segment-inner]]:rounded-r-[calc(var(--chip-radius)-var(--chip-inset))]',
        link: 'rounded-r-(--chip-radius) before:rounded-r-(--chip-radius)',
      },
      angled: {
        root: 'rounded-r-[3px] [&>[data-chip-segment]:last-child>[data-chip-segment-inner]]:rounded-tr-[3px]',
        link: 'rounded-r-[3px] before:rounded-r-[3px]',
      },
    },
    size: {
      sm: {
        outer: '[--chip-height:1.25rem] [--chip-slope:5px]',
      },
      md: {
        outer: '[--chip-height:1.5rem] [--chip-slope:6px]',
      },
      lg: {
        outer: '[--chip-height:1.625rem] [--chip-slope:6.5px]',
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
    size: 'md',
  },
});

const segmentStyles = tv({
  slots: {
    wrap: 'my-(--chip-inset) flex max-w-full min-w-0 items-stretch',
    inner: 'flex min-w-0 flex-auto items-center gap-1 truncate px-2.5',
  },
});

const groupStyles = tv({
  base: 'inline-flex max-w-full min-w-0 gap-x-0 rounded-lg',
  variants: {
    variant: {
      default: '',
      header: [
        'mix-blend-luminosity [--chip-border-color:white]',
        '[&_[data-chip]]:[--chip-height:1.75rem] [&_[data-chip]]:[--chip-inset:2px] [&_[data-chip]]:[--chip-radius:0.625rem] [&_[data-chip]]:[--chip-slope:5px]',
        '[&_[data-chip-root]]:text-sm',
        '[&>[data-chip]:not(:first-child)]:-ml-px [&>a:not(:first-child)]:-ml-px',
      ],
    },
    density: {
      default: '',
      compact: [
        '[&_[data-chip]]:[--chip-height:1.5rem] [&_[data-chip]]:[--chip-slope:5px]',
        '[&>[data-chip]:not(:first-child)]:-ml-0.5 [&>a:not(:first-child)]:-ml-0.5',
      ],
    },
    isLink: {
      true: 'no-underline transition-[filter] hover:brightness-[0.98] pressed:brightness-[0.96]',
    },
  },
  defaultVariants: {
    variant: 'default',
    density: 'default',
  },
});

export interface ChipGroupProps extends PropsWithChildren {
  className?: string;
  variant?: ChipGroupVariant;
  density?: ChipGroupDensity;
  href?: string;
  'aria-label'?: string;
}

export function ChipGroup({
  children,
  className,
  variant,
  density,
  href,
  'aria-label': ariaLabel,
}: ChipGroupProps) {
  const groupClassName = groupStyles({
    variant,
    density,
    isLink: Boolean(href),
    className,
  });

  return href ? (
    <Link
      href={href}
      aria-label={ariaLabel}
      variant="secondary"
      className={groupClassName}
      data-chip-group
    >
      {children}
    </Link>
  ) : (
    <span className={groupClassName} data-chip-group>
      {children}
    </span>
  );
}

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
  containerClassName,
  left,
  right,
  size,
  href,
  'aria-label': ariaLabel,
}: PropsWithChildren<{
  className?: string;
  containerClassName?: string;
  left?: ChipEdge;
  right?: ChipEdge;
  size?: ChipSize;
  href?: string;
  'aria-label'?: string;
}>) {
  const { outer, root, link } = styles({ left, right, size });
  return (
    <div className={outer({ className: containerClassName })} data-chip>
      <div className={root({ className })} data-chip-root>
        {children}
      </div>
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
