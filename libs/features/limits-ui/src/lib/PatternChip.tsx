import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { cx, tv } from '@restate/util/styles';
import { useRef } from 'react';
import { patternComponents } from './patternMatching';

// A compact, segmented chip for a limit-rule pattern (scope / l1 / l2), styled
// after Target.tsx: the scope sits on white and each following component is a
// shaded parallelogram so the joints between pills read as single clean
// diagonals. The chip keeps rounded outer corners — a dedicated end cap rounds
// the right and leaves 1px (`mr-px`) for the ring — and tucks under the last
// segment (`-ml-1`) so there is no gap. Wildcards (`*`) render italic and
// inherit the segment's text colour so they match it.
const SEAM = 'filter-[drop-shadow(-1px_0px_0px_var(--color-zinc-200))]';
// Parallelogram: both side edges slant the same way so adjacent segments tile
// into one diagonal seam.
const SLANT = '[clip-path:polygon(4px_0,100%_0,calc(100%-4px)_100%,0%_100%)]';

const styles = tv({
  slots: {
    root: 'relative inline-flex h-6 max-w-full min-w-0 items-stretch rounded-lg bg-white font-mono text-xs font-medium text-zinc-600 shadow-xs ring-1 ring-gray-200 transition-all ring-inset [&:has([data-pressed=true])]:shadow-none',
    iconBox: 'flex shrink-0 items-center pl-2',
    iconGlyph: 'h-3.5 w-3.5 text-zinc-400',
    scope: 'flex min-w-0 items-center truncate py-0.5 pr-2.5 pl-1.5',
    segWrap: `my-px -ml-1 flex min-w-0 shrink items-stretch ${SEAM}`,
    segInner: `flex h-full min-w-0 items-center justify-center truncate py-0.5 pr-2.5 pl-2.5 text-zinc-500 ${SLANT}`,
    cap: 'my-px mr-px -ml-1 flex shrink-0 items-center rounded-r-[calc(0.5rem-1px)]',
    link: "relative flex h-full items-center self-stretch pr-1 pl-1.5 text-zinc-500 no-underline outline-offset-0 before:absolute before:inset-0 before:z-2 before:rounded-lg before:content-[''] hover:before:bg-black/4 pressed:before:bg-black/6",
    linkIcon: 'h-3.5 w-3.5 shrink-0',
    wildcard: 'h-3 w-3 shrink-0',
  },
  variants: {
    disabled: {
      true: {
        root: 'text-zinc-400 ring-gray-200/70',
        iconGlyph: 'text-zinc-300',
        segInner: 'text-zinc-400',
      },
      false: {},
    },
    // `lg` rounds the chip (and its end cap) a touch more — used by the detail
    // header where the chip sits larger.
    radius: {
      md: {},
      lg: {
        root: 'rounded-[0.5625rem]',
        cap: 'rounded-r-[calc(0.5625rem-1px)]',
        // Header chip sits larger, so its gauge icon is 5% bigger (14 → 14.7px).
        iconGlyph: 'h-[0.91875rem] w-[0.91875rem]',
      },
    },
  },
  defaultVariants: {
    radius: 'md',
  },
});

// Fills deepen slightly per level so the hierarchy reads (scope on white, L1 a
// touch grey, L2 a touch more). The trailing cap matches the last fill.
function fillFor(index: number): string {
  return index <= 0 ? 'bg-zinc-50' : 'bg-zinc-100';
}

// The wildcard is drawn as an inline SVG (not a text glyph) so it centres
// perfectly via flexbox like the gauge/chevron icons — JetBrains Mono's `∗`
// glyph renders ~2px low even when its text box is centred. It inherits
// `currentColor`, so it matches whichever segment it sits in.
function PatternComponent({
  value,
  wildcardClassName,
}: {
  value: string;
  wildcardClassName: string;
}) {
  if (value === '*') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        className={wildcardClassName}
        aria-hidden="true"
      >
        <path d="M12 6v12M17.196 9 6.804 15M6.804 9l10.392 6" />
      </svg>
    );
  }
  return <>{value}</>;
}

export function PatternChip({
  pattern,
  href,
  disabled,
  active,
  className,
  ariaLabel,
  icon,
  isRule,
  radius,
}: {
  pattern: string;
  href?: string;
  disabled?: boolean;
  // When set (a prefix like "golf/g1"), only that governed prefix is in the
  // bounded chip; the rest (the specific instance) trails outside as faint plain
  // text after a slim diagonal tick (matching the chip's seam angle) — so the
  // limit boundary is obvious without a "/" or a loud accent.
  active?: string;
  className?: string;
  ariaLabel?: string;
  icon?: IconName;
  isRule?: boolean;
  radius?: 'md' | 'lg';
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const components = patternComponents(pattern);

  // Split at the active prefix: the bounded chip holds the governed prefix; the
  // tail is the specific instance, shown faint past the chip's angled edge.
  // Without `active` (or while disabled) it all stays in one rounded chip.
  const activeCount =
    active && !disabled ? patternComponents(active).length : components.length;
  const splitAt = Math.min(activeCount, components.length);
  const chipComponents = components.slice(0, splitAt);
  const tail = components.slice(splitAt);

  const [scope, ...rest] = chipComponents;
  const slots = styles({ disabled, radius });
  const resolvedIcon =
    icon ?? (isRule ? IconName.SlidersHorizontal : IconName.Gauge);

  const inner = (
    <>
      <span className={slots.iconBox()}>
        <Icon name={resolvedIcon} className={slots.iconGlyph()} />
      </span>
      <span className={slots.scope()}>
        <TruncateWithTooltip
          copyText={pattern}
          triggerRef={href ? linkRef : undefined}
        >
          <PatternComponent
            value={scope ?? pattern}
            wildcardClassName={slots.wildcard()}
          />
        </TruncateWithTooltip>
      </span>
      {rest.map((component, index) => (
        <span key={index} className={slots.segWrap()}>
          <span className={slots.segInner({ className: fillFor(index) })}>
            <PatternComponent
              value={component}
              wildcardClassName={slots.wildcard()}
            />
          </span>
        </span>
      ))}
    </>
  );

  // No active prefix → the regular rounded, ring-bordered chip.
  if (tail.length === 0) {
    const capFill = rest.length ? fillFor(rest.length - 1) : 'bg-white';
    const showCap = Boolean(href) || rest.length > 0;
    return (
      <div className={slots.root({ className })}>
        {inner}
        {showCap && (
          <div className={slots.cap({ className: capFill })}>
            {href ? (
              <Link
                ref={linkRef}
                href={href}
                aria-label={ariaLabel ?? pattern}
                variant="secondary"
                className={slots.link()}
              >
                <Icon
                  name={IconName.ChevronRight}
                  className={slots.linkIcon()}
                />
              </Link>
            ) : (
              <span className="w-2" aria-hidden="true" />
            )}
          </div>
        )}
      </div>
    );
  }

  // Active → a "tag" chip whose RIGHT EDGE is a real diagonal. A CSS ring/border
  // can't bend along a diagonal, so the shape comes from `clip-path` (rounded
  // left survives via border-radius ∩ clip-path) and the 1px border is a nested
  // gray layer clipped to the same shape, 1px larger than the white fill. The
  // instance trails faint just past the angle.
  return (
    <span
      className={cx('inline-flex max-w-full min-w-0 items-center', className)}
    >
      {/* drop-shadow (not box-shadow) on a non-clipped wrapper so the shadow
          follows the clipped diagonal instead of being cut off by clip-path. */}
      {/* One clipped chip. The 1px border (four hard 1px drop-shadows in
          gray-200) and the soft shadow live on a NON-clipped wrapper, so they
          trace the clipped shape uniformly — rounded corners, straight edges and
          the diagonal all get the same 1px — which a layered inset border can't
          do along a slant. */}
      <span className="inline-flex max-w-full min-w-0 shrink-0 [filter:drop-shadow(1px_0_0_#e4e4e7)_drop-shadow(-1px_0_0_#e4e4e7)_drop-shadow(0_1px_0_#e4e4e7)_drop-shadow(0_-1px_0_#e4e4e7)_drop-shadow(0_1px_1.5px_rgb(0_0_0/0.07))]">
        <span className="inline-flex h-6 max-w-full min-w-0 items-stretch rounded-l-lg rounded-r-[3px] bg-white font-mono text-xs font-medium text-zinc-600 [clip-path:polygon(0_0,100%_0,calc(100%-7px)_100%,0_100%)]">
          {inner}
        </span>
      </span>
      <span className="-ml-0.5 min-w-0 shrink truncate pl-1.5 font-mono text-xs whitespace-nowrap text-zinc-400">
        {tail.map((component, index) => (
          <span key={index}>
            {index > 0 && <span className="mx-[0.375rem]">/</span>}
            {component}
          </span>
        ))}
      </span>
    </span>
  );
}
