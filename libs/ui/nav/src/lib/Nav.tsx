import { AriaAttributes, PropsWithChildren, useEffect, useRef } from 'react';
import { tv } from 'tailwind-variants';
import { NavContext } from './NavContext';

interface NavProps {
  className?: string;
  ariaCurrentValue?: AriaAttributes['aria-current'];
}

const styles = tv({
  base: 'flex items-center gap-0',
});

export function Nav({
  children,
  className,
  ariaCurrentValue,
}: PropsWithChildren<NavProps>) {
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
    const updateStyleWithDetails = () =>
      updateStyle(
        containerElement?.querySelector(
          'a[data-active=true],button[data-active=true]'
        ) ?? null
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
          'a[data-active=true],button[data-active=true]'
        )
      );
    }
    return () => {
      observer.disconnect();
      detailsElement?.removeEventListener('toggle', updateStyleWithDetails);
    };
  }, []);

  return (
    <NavContext.Provider value={{ value: ariaCurrentValue }}>
      <div
        className="relative  [&:has(a:hover)]:bg-black/[.03] [&:has(a:focus)]:bg-black/[.03] [&:has(a:hover)]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] [&:has(a:focus)]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] border-[0.5px] border-transparent [&:has(a:focus)]:border-zinc-800/5 [&:has(a:hover)]:border-zinc-800/5 [&:has(a:hover)]:border-[0.5px] [&:has(a:focus)]:border-[0.5px] rounded-xl"
        ref={containerElementRef}
      >
        <div
          className="h-full bg-white absolute top-0 transition-all ease-in-out duration-300 border border-black/10 shadow-sm rounded-xl"
          ref={activeIndicatorElement}
        />
        <ul className={styles({ className })}>{children}</ul>
      </div>
    </NavContext.Provider>
  );
}
