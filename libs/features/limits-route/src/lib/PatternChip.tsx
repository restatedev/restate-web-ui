import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
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
    root: 'relative inline-flex h-6 max-w-full min-w-0 items-stretch rounded-lg bg-white font-mono text-xs font-medium text-zinc-600 shadow-xs ring-1 ring-gray-200 ring-inset transition-all [&:has([data-pressed=true])]:shadow-none',
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
  className,
  ariaLabel,
  icon = IconName.Gauge,
}: {
  pattern: string;
  href?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  icon?: IconName;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const components = patternComponents(pattern);
  const [scope, ...rest] = components;
  const slots = styles({ disabled });
  const capFill = rest.length ? fillFor(rest.length - 1) : 'bg-white';
  const showCap = Boolean(href) || rest.length > 0;

  return (
    <div className={slots.root({ className })}>
      <span className={slots.iconBox()}>
        <Icon name={icon} className={slots.iconGlyph()} />
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
              <Icon name={IconName.ChevronRight} className={slots.linkIcon()} />
            </Link>
          ) : (
            <span className="w-2" aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  );
}
