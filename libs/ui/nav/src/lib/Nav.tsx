import {
  AriaAttributes,
  Children,
  ComponentProps,
  ReactElement,
  useEffect,
  useRef,
} from 'react';
import { tv } from '@restate/util/styles';
import { NavContext } from './NavContext';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { NavItem, NavSearchItem, useGetHrefFromSearch } from './NavItem';
import { Button } from '@restate/ui/button';
import { useLocation } from 'react-router';
import { Icon, IconName } from '@restate/ui/icons';

interface NavProps {
  className?: string;
  ariaCurrentValue?: AriaAttributes['aria-current'];
  children: ReactElement<
    ComponentProps<typeof NavItem | typeof NavSearchItem>
  >[];
  layout?: 'vertical' | 'horizontal';
}

const styles = tv({
  base: 'flex items-center gap-0',
  slots: {
    indicator:
      'absolute rounded-xl border border-black/10 bg-white shadow-xs transition-all duration-300 ease-in-out [&:not(:has(+ul>li>*[data-active=true]))]:hidden',
  },
  variants: {
    layout: {
      vertical: { base: 'flex-col [&>*]:w-full', indicator: 'left-0 w-full' },
      horizontal: {
        base: '',
        indicator: 'top-0 h-full',
      },
    },
  },
});

export function Nav({
  children,
  className,
  ariaCurrentValue,
  layout = 'horizontal',
}: NavProps) {
  const containerElementRef = useRef<HTMLDivElement | null>(null);
  const activeIndicatorElement = useRef<HTMLDivElement | null>(null);
  const { base, indicator } = styles({ layout });

  useEffect(() => {
    const updateStyle = (activeElement: Node | null) => {
      if (
        activeElement instanceof HTMLElement &&
        activeElement.dataset.active === 'true' &&
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
      for (const mutation of mutationList) {
        if (mutation.type === 'attributes') {
          updateStyle(mutation.target);
        }
      }
    };

    const observer = new MutationObserver(callback);
    const containerElement = containerElementRef.current;
    const detailsElement = containerElement?.closest('details');
    // TODO
    const updateStyleWithDetails = () =>
      updateStyle(
        containerElement?.querySelector(
          'a[data-active=true],button[data-active=true]',
        ) ?? null,
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
      updateStyle(
        containerElement.querySelector(
          'a[data-active=true],button[data-active=true]',
        ),
      );
    }

    window.addEventListener('resize', updateStyleWithDetails);
    return () => {
      observer.disconnect();
      detailsElement?.removeEventListener('toggle', updateStyleWithDetails);
      window.removeEventListener('resize', updateStyleWithDetails);
    };
  }, [layout]);

  const location = useLocation();
  const getHref = useGetHrefFromSearch();

  return (
    <NavContext.Provider value={{ value: ariaCurrentValue }}>
      <div
        className="relative hidden rounded-xl border-[0.5px] border-transparent lg:block [&:has(a:focus)]:border-[0.5px] [&:has(a:focus)]:border-zinc-800/5 [&:has(a:focus)]:bg-black/3 [&:has(a:focus)]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] [&:has(a:hover)]:border-[0.5px] [&:has(a:hover)]:border-zinc-800/5 [&:has(a:hover)]:bg-black/3 [&:has(a:hover)]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]"
        ref={containerElementRef}
      >
        <div className={indicator()} ref={activeIndicatorElement} />
        <ul className={base({ className })}>{children}</ul>
      </div>
      <div className="lg:hidden">
        <Dropdown>
          <DropdownTrigger>
            <Button
              variant="secondary"
              className="flex items-center gap-2 py-1.5 pr-1.5 pl-3"
            >
              {Children.map(children, (child) => (
                <span
                  className={
                    'href' in child.props
                      ? location.pathname.startsWith(child.props.href)
                        ? ''
                        : 'hidden'
                      : location.search.includes(child.props.search)
                        ? ''
                        : 'hidden'
                  }
                >
                  {child.props.children}
                </span>
              ))}
              <Icon
                name={IconName.ChevronsUpDown}
                className="h-4 w-4 text-gray-500"
              />
            </Button>
          </DropdownTrigger>
          <DropdownPopover>
            <DropdownMenu
              selectable
              selectedItems={Children.toArray(children)
                .map(
                  (child) =>
                    (child as ReactElement<ComponentProps<typeof NavItem>>)
                      .props.href,
                )
                .filter((href) => location.pathname.startsWith(href))}
            >
              {Children.map(children, (child) => (
                <DropdownItem
                  href={
                    'href' in child.props
                      ? child.props.href
                      : getHref(child.props.search).href
                  }
                  value={
                    'href' in child.props
                      ? child.props.href
                      : child.props.search
                  }
                >
                  {child.props.children}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </DropdownPopover>
        </Dropdown>
      </div>
    </NavContext.Provider>
  );
}
