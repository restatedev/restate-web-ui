import { Fragment } from 'react';
import { Button } from '@restate/ui/button';
import { Chip, ChipSegment } from '@restate/ui/chip';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import {
  Popover,
  PopoverContent,
  PopoverHoverTrigger,
} from '@restate/ui/popover';
import { tv } from '@restate/util/styles';
import { useBreadcrumbPages, useBreadcrumbs } from './BreadcrumbsProvider';
import type { BreadcrumbComponentProps, TrailCrumb } from './types';

const styles = tv({
  slots: {
    nav: 'ml-[4.25rem] flex max-w-full min-w-0 flex-wrap items-center gap-x-0 gap-y-1 [--chip-shadow:0_1px_2px_rgb(0_0_0/0.05)]',
    chip: 'max-w-44 bg-gray-50 text-2xs font-normal text-zinc-500',
    current:
      'flex max-w-full min-w-0 items-center gap-0.5 pl-1 text-2xs font-normal text-zinc-600 [&_[data-crumb-label]]:overflow-visible [&_[data-crumb-label]]:break-all [&_[data-crumb-label]]:whitespace-normal',
    icon: 'h-3 w-3 shrink-0 text-zinc-400',
    label: 'min-w-0 truncate',
    ellipsisButton: 'h-full rounded-none px-1 py-0 text-zinc-500',
    menuItem: 'flex max-w-60 min-w-0 items-center gap-1 text-2xs font-normal',
  },
  variants: {
    hiddenOnMobile: {
      true: {
        chip: 'max-md:hidden',
      },
      false: {},
    },
    isList: {
      true: {
        chip: 'pl-1',
      },
      false: {},
    },
  },
  defaultVariants: {
    hiddenOnMobile: false,
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

function CollapsedCrumbs({
  crumbs,
  className,
}: {
  crumbs: TrailCrumb[];
  className?: string;
}) {
  const { chip, ellipsisButton, menuItem, icon, label } = styles();
  return (
    <Dropdown>
      <DropdownTrigger>
        <Chip
          left="angled"
          right="angled"
          size="sm"
          className={chip({ className })}
        >
          <ChipSegment className="p-0">
            <Button
              variant="icon"
              aria-label={`Show ${crumbs.length} more pages`}
              className={ellipsisButton()}
            >
              <Icon name={IconName.Ellipsis} className="h-3.5 w-3.5" />
            </Button>
          </ChipSegment>
        </Chip>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownMenu>
          {crumbs.map((crumb) => (
            <DropdownItem key={crumb.pathname} href={crumb.href}>
              <span className={menuItem()}>
                <Icon name={crumb.icon} className={icon()} />
                <span className={label()}>{crumb.label}</span>
              </span>
            </DropdownItem>
          ))}
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}

export function Breadcrumbs({ className }: { className?: string }) {
  const crumbs = useBreadcrumbs();
  const pages = useBreadcrumbPages();
  if (crumbs.length < 2) {
    return null;
  }
  const { nav, chip, current } = styles();
  const total = crumbs.length;
  const isMobileCollapsed = total >= 4;
  const isDesktopCollapsed = total >= 5;
  const mobileHidden = isMobileCollapsed ? crumbs.slice(1, total - 1) : [];
  const desktopHidden = isDesktopCollapsed ? crumbs.slice(2, total - 2) : [];

  return (
    <nav aria-label="Breadcrumb" className={nav({ className })}>
      {crumbs.map((crumb, index) => {
        const isCollapsedOnDesktop =
          isDesktopCollapsed && index >= 2 && index <= total - 3;
        const isEdge = index === 0 || index === total - 1;

        const page = pages.find(
          (pageDefinition) => pageDefinition.pattern === crumb.pattern,
        );
        const Content = page?.Content ?? CrumbContent;
        const PopoverComponent = page?.Popover;
        const crumbElement = isCollapsedOnDesktop ? null : crumb.isCurrent ? (
          <span aria-current="page" className={current()}>
            <Content crumb={crumb} />
          </span>
        ) : (
          <Chip
            left={index === 0 ? 'straight' : 'angled'}
            right="angled"
            size="sm"
            href={crumb.href}
            aria-label={crumb.label}
            className={chip({
              hiddenOnMobile: !isEdge && isMobileCollapsed,
              isList: crumb.kind === 'list',
            })}
          >
            <ChipSegment
              className={chipStyles({ isList: crumb.kind === 'list' })}
            >
              <Content crumb={crumb} />
            </ChipSegment>
          </Chip>
        );

        return (
          <Fragment key={crumb.pathname}>
            {index === 1 && isMobileCollapsed && (
              <CollapsedCrumbs crumbs={mobileHidden} className="md:hidden" />
            )}
            {index === 2 && isDesktopCollapsed && (
              <CollapsedCrumbs
                crumbs={desktopHidden}
                className="max-md:hidden"
              />
            )}
            {crumbElement &&
              (PopoverComponent && !crumb.isCurrent && !isCollapsedOnDesktop ? (
                <Popover>
                  <PopoverHoverTrigger>{crumbElement}</PopoverHoverTrigger>
                  <PopoverContent placement="bottom" isNonModal>
                    <PopoverComponent crumb={crumb} />
                  </PopoverContent>
                </Popover>
              ) : (
                crumbElement
              ))}
          </Fragment>
        );
      })}
    </nav>
  );
}
