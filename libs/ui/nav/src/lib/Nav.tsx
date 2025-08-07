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
import { NavItem } from './NavItem';
import { Button } from '@restate/ui/button';
import { useLocation } from 'react-router';
import { Icon, IconName } from '@restate/ui/icons';

interface NavProps {
  className?: string;
  ariaCurrentValue?: AriaAttributes['aria-current'];
  children: ReactElement<ComponentProps<typeof NavItem>>[];
}

const styles = tv({
  base: 'flex items-center gap-0',
});

export function Nav({ children, className, ariaCurrentValue }: NavProps) {
  const containerElementRef = useRef<HTMLDivElement | null>(null);
  const activeIndicatorElement = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateStyle = (activeElement: Node | null) => {
      if (
        activeElement instanceof HTMLElement &&
        activeElement.dataset.active === 'true' &&
        activeIndicatorElement.current
      ) {
        activeIndicatorElement.current.style.width = `${activeElement.clientWidth}px`;
        activeIndicatorElement.current.style.left = `${activeElement.offsetLeft}px`;
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
  }, []);

  const location = useLocation();

  return (
    <NavContext.Provider value={{ value: ariaCurrentValue }}>
      <div
        className="relative hidden rounded-xl border-[0.5px] border-transparent lg:block [&:has(a:focus)]:border-[0.5px] [&:has(a:focus)]:border-zinc-800/5 [&:has(a:focus)]:bg-black/3 [&:has(a:focus)]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] [&:has(a:hover)]:border-[0.5px] [&:has(a:hover)]:border-zinc-800/5 [&:has(a:hover)]:bg-black/3 [&:has(a:hover)]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]"
        ref={containerElementRef}
      >
        <div
          className="absolute top-0 h-full rounded-xl border border-black/10 bg-white shadow-xs transition-all duration-300 ease-in-out [&:not(:has(+ul>li>a[data-active=true]))]:hidden"
          ref={activeIndicatorElement}
        />
        <ul className={styles({ className })}>{children}</ul>
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
                    location.pathname.startsWith(child.props.href)
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
                <DropdownItem href={child.props.href} value={child.props.href}>
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
