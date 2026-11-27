import { Chip, ChipSegment } from '@restate/ui-chip';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { tv } from '@restate/util-styles';
import { useBreadcrumbPages, useBreadcrumbs } from './BreadcrumbsProvider';
import type { BreadcrumbComponentProps } from './types';

export type BreadcrumbsVariant = 'chips' | 'flat';

const styles = tv({
  slots: {
    nav: 'flex max-w-full min-w-0 flex-wrap items-center gap-y-1',
    chip: 'max-w-44 bg-subtle text-xs font-normal text-tertiary',
    current:
      'flex max-w-full min-w-0 items-center gap-0.5 pl-1 text-xs font-normal text-muted [&_[data-crumb-label]]:overflow-visible [&_[data-crumb-label]]:break-all [&_[data-crumb-label]]:whitespace-normal',
    icon: 'h-3 w-3 shrink-0 text-subtle',
    label: 'min-w-0 truncate',
    flatItem:
      'relative isolate flex min-w-0 items-center gap-x-0.5 px-1.5 pt-px pb-[6px] before:absolute before:inset-0 before:-z-10 before:bg-tint-subtle has-[[data-hovered]]:before:bg-tint has-[[data-pressed]]:before:bg-tint-strong',
    flatLink:
      'flex min-w-0 items-center gap-1 rounded px-0.5 font-normal text-tertiary no-underline hover:text-primary',
    flatCurrent: 'flex min-w-0 items-center',
    flatCurrentChip:
      '[--chip-height:1.6875rem] [--chip-radius:0.375rem] [--chip-slope:6px]',
    flatCurrentChipRoot: 'bg-muted text-2xs font-normal text-muted',
    flatCurrentChipSegment: 'pr-1.5 pl-2.5',
  },
  variants: {
    variant: {
      chips: {
        nav: 'ml-2 gap-x-0 [--chip-shadow:0_1px_2px_--theme(--box-shadow-color-default/5%)]',
      },
      flat: {
        nav: 'flex-nowrap gap-x-0 text-2xs leading-none [&_.truncate]:overflow-x-clip [&_.truncate]:overflow-y-visible [&>*:not(:first-child)]:-ml-px',
      },
    },
    seg: {
      first: {
        flatItem:
          'pr-2.5 before:rounded-l-md before:[clip-path:polygon(0_0,100%_0,calc(100%-6px)_100%,0_100%)]',
      },
      mid: {
        flatItem:
          'px-2.5 before:[clip-path:polygon(6px_0,100%_0,calc(100%-6px)_100%,0_100%)]',
      },
      last: {
        flatItem: 'p-0 before:hidden',
      },
    },
    isList: {
      true: {
        chip: 'pl-1',
      },
      false: {},
    },
  },
  defaultVariants: {
    variant: 'chips',
    seg: 'mid',
    isList: false,
  },
});

const chipStyles = tv({
  base: 'px-2',
  variants: {
    isList: {
      true: 'pl-1',
      false: '',
    },
  },
});

export function CrumbContent({ crumb }: BreadcrumbComponentProps) {
  const { icon, label } = styles();
  return (
    <>
      <Icon
        name={crumb.kind === 'list' ? IconName.ArrowLeft : crumb.icon}
        className={icon()}
      />
      <span data-crumb-label className={label()}>
        {crumb.label}
      </span>
    </>
  );
}

export function Breadcrumbs({
  variant = 'chips',
  className,
  preserveQueryParams,
}: {
  variant?: BreadcrumbsVariant;
  className?: string;
  // Tenant view preserves its list filters on the back link; other callers keep the default.
  preserveQueryParams?: string[];
}) {
  const crumbs = useBreadcrumbs();
  const pages = useBreadcrumbPages();
  if (crumbs.length < 2) {
    return null;
  }
  const {
    nav,
    chip,
    current,
    flatItem,
    flatLink,
    flatCurrent,
    flatCurrentChip,
    flatCurrentChipRoot,
    flatCurrentChipSegment,
  } = styles({ variant });
  const isFlat = variant === 'flat';

  return (
    <nav aria-label="Breadcrumb" className={nav({ className })}>
      {crumbs.map((crumb, index) => {
        const page = pages.find(
          (pageDefinition) => pageDefinition.pattern === crumb.pattern,
        );
        const Content = page?.Content ?? CrumbContent;

        if (isFlat) {
          const interactiveElement = crumb.isCurrent ? (
            <span aria-current="page" className={flatCurrent()}>
              <Chip
                left="angled"
                right="straight"
                size="sm"
                containerClassName={flatCurrentChip()}
                className={flatCurrentChipRoot()}
              >
                <ChipSegment className={flatCurrentChipSegment()}>
                  <Content crumb={crumb} />
                </ChipSegment>
              </Chip>
            </span>
          ) : (
            <Link
              href={crumb.href}
              preserveQueryParams={preserveQueryParams}
              variant="icon"
              aria-label={crumb.label}
              className={flatLink()}
            >
              <Content crumb={crumb} />
            </Link>
          );
          return (
            <span
              key={crumb.pathname}
              className={flatItem({
                seg: index === 0 ? 'first' : crumb.isCurrent ? 'last' : 'mid',
              })}
            >
              {interactiveElement}
            </span>
          );
        }

        return crumb.isCurrent ? (
          <span key={crumb.pathname} aria-current="page" className={current()}>
            <Content crumb={crumb} />
          </span>
        ) : (
          <Chip
            key={crumb.pathname}
            left={index === 0 ? 'straight' : 'angled'}
            right="angled"
            size="sm"
            href={crumb.href}
            aria-label={crumb.label}
            className={chip({ isList: crumb.kind === 'list' })}
          >
            <ChipSegment
              className={chipStyles({ isList: crumb.kind === 'list' })}
            >
              <Content crumb={crumb} />
            </ChipSegment>
          </Chip>
        );
      })}
    </nav>
  );
}
