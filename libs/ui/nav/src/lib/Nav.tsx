import {
  AriaAttributes,
  Children,
  ComponentProps,
  ReactElement,
  useEffect,
  useRef,
} from 'react';
import { GridList as AriaGridList } from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { NavContext } from './NavContext';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import {
  NavButtonItem,
  NavItem,
  NavSearchItem,
  useGetHrefFromSearch,
} from './NavItem';
import { Button } from '@restate/ui/button';
import { useLocation } from 'react-router';
import { Icon, IconName } from '@restate/ui/icons';

interface NavProps {
  className?: string;
  containerClassName?: string;
  indicatorClassName?: string;
  ariaCurrentValue?: AriaAttributes['aria-current'];
  children: ReactElement<
    ComponentProps<typeof NavItem | typeof NavSearchItem>
  >[];
  layout?: 'vertical' | 'horizontal';
  responsive?: boolean;
}

const styles = tv({
  base: 'flex items-center gap-0',
  slots: {
    indicator:
      'absolute rounded-xl border border-black/10 bg-white shadow-xs transition-all duration-300 ease-in-out [&:not(:has(~*_[data-active=true]))]:hidden',
    container:
      'relative rounded-xl border-[0.5px] border-transparent [&:has(:focus)]:border-[0.5px] [&:has(:focus)]:border-zinc-800/5 [&:has(:focus)]:bg-black/3 [&:has(:focus)]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] [&:has(:hover)]:border-[0.5px] [&:has(:hover)]:border-zinc-800/5 [&:has(:hover)]:bg-black/3 [&:has(:hover)]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]',
    dropdown: '',
  },
  variants: {
    layout: {
      vertical: { base: 'flex-col [&>*]:w-full', indicator: 'left-0 w-full' },
      horizontal: {
        base: '',
        indicator: 'top-0 h-full',
      },
    },
    responsive: {
      true: { container: 'hidden lg:block', dropdown: 'lg:hidden' },
      false: { container: 'block', dropdown: 'hidden' },
    },
  },
  defaultVariants: {
    responsive: true,
  },
});

export function Nav({
  children,
  className,
  containerClassName,
  indicatorClassName,
  ariaCurrentValue,
  layout = 'horizontal',
  responsive = true,
}: NavProps) {
  const containerElementRef = useRef<HTMLDivElement | null>(null);
  const activeIndicatorElement = useRef<HTMLDivElement | null>(null);
  const { base, indicator, container, dropdown } = styles({
    layout,
    responsive,
  });
  const location = useLocation();

  useEffect(() => {
    const updateStyle = (activeElement: Node | null) => {
      if (
        activeElement instanceof HTMLElement &&
        activeElement.dataset['active'] === 'true' &&
        activeIndicatorElement.current
      ) {
        if (layout === 'vertical') {
          activeIndicatorElement.current.style.height = `${activeElement.clientHeight}px`;
          activeIndicatorElement.current.style.top = `${activeElement.offsetTop}px`;
        } else {
          activeIndicatorElement.current.style.width = `${activeElement.clientWidth}px`;
          activeIndicatorElement.current.style.left = `${activeElement.offsetLeft}px`;
        }
      }
    };
    const callback: MutationCallback = (mutationList) => {
      if (mutationList.length > 0 && containerElement) {
        updateStyle(containerElement.querySelector('[data-active=true]'));
      }
    };

    const observer = new MutationObserver(callback);
    const containerElement = containerElementRef.current;
    const detailsElement = containerElement?.closest('details');
    // TODO
    const updateStyleWithDetails = () =>
      updateStyle(
        containerElement?.querySelector('[data-active=true]') ?? null,
      );
    if (containerElement) {
      observer.observe(containerElement, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['data-active'],
      });
      detailsElement?.addEventListener('toggle', updateStyleWithDetails, {
        once: true,
      });
      updateStyle(containerElement.querySelector('[data-active=true]'));
    }

    window.addEventListener('resize', updateStyleWithDetails);
    return () => {
      observer.disconnect();
      detailsElement?.removeEventListener('toggle', updateStyleWithDetails);
      window.removeEventListener('resize', updateStyleWithDetails);
    };
  }, [layout, location.search]);
  const getHref = useGetHrefFromSearch();
  const isNavActive = (
    nav: ReactElement<
      | ComponentProps<typeof NavItem>
      | ComponentProps<typeof NavButtonItem>
      | ComponentProps<typeof NavSearchItem>
    >,
  ) => {
    if ('href' in nav.props) {
      return location.pathname.startsWith(nav.props.href);
    }
    if ('param' in nav.props) {
      return getHref(nav.props.param, nav.props.value).isActive;
    }
    return 'isActive' in nav.props ? nav.props.isActive : false;
  };

  return (
    <NavContext.Provider value={{ value: ariaCurrentValue }}>
      <div
        className={container({ className: containerClassName })}
        ref={containerElementRef}
      >
        <div
          className={indicator({ className: indicatorClassName })}
          ref={activeIndicatorElement}
        />
        <AriaGridList
          aria-label="Navigation"
          className={base({ className })}
          layout="grid"
          selectionMode="none"
        >
          {children}
        </AriaGridList>
      </div>
      <div className={dropdown()}>
        <Dropdown>
          <DropdownTrigger>
            <Button
              variant="secondary"
              className="flex items-center gap-2 py-1.5 pr-1.5 pl-3"
            >
              {Children.map(children, (child) => {
                const nav = child as ReactElement<
                  | ComponentProps<typeof NavItem>
                  | ComponentProps<typeof NavButtonItem>
                  | ComponentProps<typeof NavSearchItem>
                >;
                return (
                  <span className={isNavActive(nav) ? '' : 'hidden'}>
                    {child.props.children}
                  </span>
                );
              })}
              <Icon
                name={IconName.ChevronsUpDown}
                className="h-4 w-4 text-gray-500"
              />
            </Button>
          </DropdownTrigger>
          <DropdownPopover>
            <DropdownMenu
              selectable
              onSelect={(value) => {
                Children.forEach(children, (child) => {
                  const nav = child as ReactElement<
                    | ComponentProps<typeof NavItem>
                    | ComponentProps<typeof NavButtonItem>
                    | ComponentProps<typeof NavSearchItem>
                  >;
                  if (
                    nav.props &&
                    'isActive' in nav.props &&
                    'onClick' in nav.props &&
                    nav.props.children === value
                  ) {
                    nav.props.onClick?.();
                  }
                });
              }}
              selectedItems={Children.toArray(children)
                .map((child) => {
                  const nav = child as ReactElement<
                    | ComponentProps<typeof NavItem>
                    | ComponentProps<typeof NavButtonItem>
                    | ComponentProps<typeof NavSearchItem>
                  >;
                  if ('href' in nav.props) {
                    return {
                      isActive: location.pathname.startsWith(nav.props.href),
                      value: nav.props.href,
                    };
                  } else if ('param' in nav.props) {
                    return {
                      isActive: isNavActive(nav),
                      value: nav.props.children?.toString() ?? '',
                    };
                  } else if ('isActive' in nav.props) {
                    return {
                      isActive: nav.props.isActive,
                      value: nav.props.children?.toString() ?? '',
                    };
                  }
                  return { isActive: false, value: '' };
                })
                .filter((opt) => opt.isActive)
                .map((opt) => opt.value)}
            >
              {Children.map(children, (child) => {
                if (child.type === NavButtonItem) {
                  return (
                    <DropdownItem value={String(child.props.children)}>
                      {child.props.children}
                    </DropdownItem>
                  );
                }
                return (
                  <DropdownItem
                    href={
                      'href' in child.props
                        ? child.props.href
                        : getHref(child.props.param, child.props.value).href
                    }
                    value={
                      'href' in child.props
                        ? child.props.href
                        : (child.props.children?.toString() ?? '')
                    }
                  >
                    {child.props.children}
                  </DropdownItem>
                );
              })}
            </DropdownMenu>
          </DropdownPopover>
        </Dropdown>
      </div>
    </NavContext.Provider>
  );
}
