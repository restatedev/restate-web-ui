import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ComponentPropsWithoutRef, PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { tv } from '@restate/util/styles';

type ContentPanelSlotName = 'toolbar' | 'header';

const ContentPanelContext = createContext<{
  getSlot: (slot: ContentPanelSlotName) => HTMLElement | null | undefined;
  setSlot: (slot: ContentPanelSlotName, element: HTMLElement | null) => void;
} | null>(null);

const styles = tv({
  slots: {
    root: 'relative isolate grid min-h-0 w-full flex-1 grid-cols-1 grid-rows-1 [--cp-content-top:calc(var(--cp-toolbar-top,0px)+var(--cp-sticky-area-height,0px)-var(--cp-toolbar-tuck,0px))] [--cp-section-pt:calc(var(--cp-sticky-area-height,0px)-var(--cp-toolbar-height,0px))] [&:not(:has([data-cp-slot=toolbar]:not(:empty)))]:[--cp-toolbar-tuck:0px]',
    bodyCell:
      'col-start-1 row-start-1 mt-[calc(var(--cp-toolbar-height,0px)-var(--cp-toolbar-tuck,0px))] flex min-h-0 flex-col border-x border-gray-200 bg-gray-50',
    stickyArea:
      'col-start-1 row-start-1 z-30 flex flex-col self-start sticky top-[calc(var(--cp-toolbar-top,0px)-var(--cp-toolbar-tuck,0px))]',
    toolbarSlot:
      'w-full bg-gray-100 [padding-top:var(--cp-toolbar-tuck,0px)] [&:empty]:hidden',
    cardFrame:
      'relative min-h-4 rounded-t-2xl border-x border-t border-gray-200',
    headerSlot:
      'mx-2 mt-2 rounded-xl border border-gray-200 bg-linear-to-b from-gray-200/70 to-gray-100/85 backdrop-blur-3xl backdrop-saturate-200 shadow-[inset_0_2px_0_0_--theme(--color-white/95%),0_2px_5px_-1px_--theme(--color-zinc-800/8%),0_4px_10px_-3px_--theme(--color-zinc-800/6%)] [&:empty]:hidden',
    body: 'relative flex min-h-0 flex-1 flex-col',
    sectionRoot: 'relative',
    sectionFade:
      'pointer-events-none sticky top-[calc(var(--cp-toolbar-top,0px)+var(--cp-toolbar-height,0px)-var(--cp-toolbar-tuck,0px))] z-10 -mb-8 h-8 bg-linear-to-b from-gray-50 to-transparent',
    sectionContent: 'pt-[var(--cp-section-pt,0px)]',
  },
  variants: {
    flush: {
      true: { sectionContent: 'pt-0' },
    },
  },
});

const toolbarContentStyles = tv({
  base: 'flex min-h-9 w-full items-center',
});

const headerContentStyles = tv({
  base: 'relative flex min-h-12 w-full items-center',
});

export function ContentPanel({
  children,
  className,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<'div'>>) {
  const { root, bodyCell, stickyArea, toolbarSlot, cardFrame, headerSlot } =
    styles();
  const rootRef = useRef<HTMLDivElement>(null);
  const stickyAreaRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<
    Record<ContentPanelSlotName, HTMLElement | null | undefined>
  >({ toolbar: undefined, header: undefined });

  const getSlot = useCallback(
    (slot: ContentPanelSlotName) => slots[slot],
    [slots],
  );

  const setSlot = useCallback(
    (slot: ContentPanelSlotName, element: HTMLElement | null) => {
      setSlots((current) => {
        if (current[slot] === element) {
          return current;
        }
        return { ...current, [slot]: element };
      });
    },
    [],
  );

  useEffect(() => {
    const stickyAreaElement = stickyAreaRef.current;
    const rootElement = rootRef.current;
    const toolbarElement = slots.toolbar;
    if (!rootElement) {
      return;
    }
    const update = () => {
      const stickyHeight = stickyAreaElement?.offsetHeight ?? 0;
      const toolbarHeight = toolbarElement?.offsetHeight ?? 0;
      rootElement.style.setProperty(
        '--cp-sticky-area-height',
        `${stickyHeight}px`,
      );
      rootElement.style.setProperty(
        '--cp-toolbar-height',
        `${toolbarHeight}px`,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    if (stickyAreaElement) observer.observe(stickyAreaElement);
    if (toolbarElement) observer.observe(toolbarElement);
    return () => observer.disconnect();
  }, [slots.toolbar]);

  return (
    <ContentPanelContext.Provider value={{ getSlot, setSlot }}>
      <div
        {...props}
        ref={rootRef}
        className={root({ className })}
        data-content-panel-fill-viewport=""
      >
        <div className={bodyCell()}>{children}</div>
        <div ref={stickyAreaRef} className={stickyArea()}>
          <ContentPanelSlotElement slot="toolbar" className={toolbarSlot()} />
          <div className={cardFrame()}>
            <ContentPanelCornerMasks />
            <ContentPanelSlotElement slot="header" className={headerSlot()} />
          </div>
        </div>
      </div>
    </ContentPanelContext.Provider>
  );
}

// Fills the carved-out triangles at cardFrame's top corners with toolbar bg
// (gray-100) so it visually meets the rounded-t-2xl curve cleanly. Without
// these, the body's gray-50 leaks through the corners and shows as a sliver.
//
// Sizing rules — get any of these wrong and you'll see a 1px artifact:
// 1. SVG width/height/viewBox === cardFrame's border-radius value (currently
//    `rounded-t-2xl` = 16px, so 16×16). The arc must use the SAME radius
//    centered at the SVG's bottom-right (e.g. `M16 0 A16 16 0 0 0 0 16`)
//    so it traces cardFrame's actual outer curve exactly.
// 2. The wrapper is positioned with `-top-px -left-px -right-px` to offset
//    cardFrame's 1px border — without this, the wrapper sits inside the
//    border (at the padding edge) and the masks miss the outer 1px sliver.
// 3. Wrapper is `absolute` and cardFrame is `relative`. cardFrame intentionally
//    does NOT have `overflow-clip` so this wrapper extends past the border.
//
// If you change `rounded-t-2xl` or the border width, update the SVG dimensions
// and the wrapper offsets to match. Verify visually at scale (zoomed in) — the
// arc easily looks correct at normal zoom but covers the border by 1px.
function ContentPanelCornerMasks() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -top-px -right-px -left-px flex h-4"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 fill-gray-100"
      >
        <path d="M16 0A16 16 0 0 0 0 16V0H16Z" />
      </svg>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="ml-auto shrink-0 -scale-x-100 fill-gray-100"
      >
        <path d="M16 0A16 16 0 0 0 0 16V0H16Z" />
      </svg>
    </div>
  );
}

function ContentPanelSlotElement({
  slot,
  className,
}: {
  slot: ContentPanelSlotName;
  className: string;
}) {
  const ctx = use(ContentPanelContext);
  const setContextSlot = ctx?.setSlot;
  const setSlotElement = useCallback(
    (element: HTMLDivElement | null) => {
      setContextSlot?.(slot, element);
    },
    [setContextSlot, slot],
  );
  return <div ref={setSlotElement} data-cp-slot={slot} className={className} />;
}

export function ContentPanelToolbar({
  children,
  className,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<'div'>>) {
  const ctx = use(ContentPanelContext);
  const element = ctx?.getSlot('toolbar');

  const content = (
    <div {...props} className={toolbarContentStyles({ className })}>
      {children}
    </div>
  );

  if (!ctx) {
    return content;
  }
  if (!element) {
    return null;
  }
  return createPortal(content, element);
}

export function ContentPanelHeader({
  children,
  className,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<'div'>>) {
  const ctx = use(ContentPanelContext);
  const element = ctx?.getSlot('header');

  const content = (
    <div {...props} className={headerContentStyles({ className })}>
      {children}
    </div>
  );

  if (!ctx) {
    return content;
  }
  if (!element) {
    return null;
  }
  return createPortal(content, element);
}

export function ContentPanelBody({
  children,
  className,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<'div'>>) {
  const { body } = styles();
  return (
    <div {...props} className={body({ className })}>
      {children}
    </div>
  );
}

interface ContentPanelSectionProps extends ComponentPropsWithoutRef<'div'> {
  fadeClassName?: string;
  flush?: boolean;
}

export function ContentPanelSection({
  children,
  className,
  fadeClassName,
  flush,
  ...props
}: PropsWithChildren<ContentPanelSectionProps>) {
  const { sectionRoot, sectionFade, sectionContent } = styles({ flush });
  return (
    <div {...props} className={sectionRoot({ className })}>
      <div aria-hidden className={sectionFade({ className: fadeClassName })} />
      <div className={sectionContent()}>{children}</div>
    </div>
  );
}
