import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ComponentPropsWithoutRef,
  PropsWithChildren,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Tab as AriaTab,
  TabList as AriaTabList,
  Tabs as AriaTabs,
  composeRenderProps,
} from 'react-aria-components';
import { useLocation, useSearchParams } from 'react-router';
import { focusRing } from '@restate/ui/focus';
import { tv } from '@restate/util/styles';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';

type ContentPanelSlotName = 'toolbar' | 'header';

export interface ContentPanelTab {
  id: string;
  label: ReactNode;
  disabled?: boolean;
  href?: string;
}

export interface ContentPanelTabs {
  items: ContentPanelTab[];
  defaultId?: string;
  queryParam?: string;
  selectedId?: string;
  onSelect?: (id: string) => void;
  // Cap the number of inline tabs at desktop sizes; remaining items collapse
  // into a "More" dropdown. If the selected tab isn't in the top N it's
  // promoted into the visible set so it's always reachable in one click.
  maxVisible?: number;
}

const ContentPanelContext = createContext<{
  getSlot: (slot: ContentPanelSlotName) => HTMLElement | null | undefined;
  setSlot: (slot: ContentPanelSlotName, element: HTMLElement | null) => void;
} | null>(null);

const styles = tv({
  slots: {
    root: 'relative isolate grid min-h-0 w-full flex-1 grid-cols-1 grid-rows-1 [--cp-content-top:calc(var(--cp-toolbar-top,0px)+var(--cp-sticky-area-height,0px)-var(--cp-toolbar-tuck,0px))] [--cp-section-pt:calc(var(--cp-sticky-area-height,0px)-var(--cp-toolbar-height,0px)+var(--cp-toolbar-tuck,0px))]',
    bodyCell:
      'col-start-1 row-start-1 mt-[calc(var(--cp-toolbar-height,0px)-var(--cp-toolbar-tuck,0px))] flex min-h-0 flex-col border-x border-gray-200 bg-gray-50',
    stickyArea:
      'sticky top-[calc(var(--cp-toolbar-top,0px)-var(--cp-toolbar-tuck,0px))] z-30 col-start-1 row-start-1 flex flex-col self-start',
    toolbarSlot:
      'flex min-h-16 w-full items-end bg-gray-100 [padding-top:var(--cp-toolbar-tuck,0px)]',

    cardFrame:
      'relative min-h-4 rounded-t-2xl border-x border-t border-gray-200',
    headerSlot:
      'mx-2 mt-2 rounded-xl border border-gray-200 bg-linear-to-b from-gray-200/70 to-gray-100/85 shadow-[inset_0_2px_0_0_--theme(--color-white/95%),0_2px_5px_-1px_--theme(--color-zinc-800/8%),0_4px_10px_-3px_--theme(--color-zinc-800/6%)] backdrop-blur-3xl backdrop-saturate-200 [&:empty]:hidden',
    body: 'relative flex min-h-0 flex-1 flex-col',
    sectionRoot: 'relative flex flex-col',
    sectionFade:
      'pointer-events-none sticky top-[calc(var(--cp-toolbar-top,0px)+var(--cp-toolbar-height,0px)-var(--cp-toolbar-tuck,0px))] z-10 -mb-8 h-8 bg-linear-to-b from-gray-50 to-transparent backdrop-blur-lg backdrop-saturate-150',
    sectionContent: 'flex-1 pt-[var(--cp-section-pt,0px)]',
    tabsWrapper:
      'relative flex min-h-16 w-full items-end gap-3 bg-gray-100 px-3 [padding-top:calc(var(--cp-toolbar-tuck,0px)+0.5rem)]',
    tabList: 'relative flex max-w-full items-end gap-1 px-1',
    tabsToolbarSlot: 'flex flex-1 items-center justify-end self-stretch pb-0',
  },
  variants: {
    flush: {
      true: { sectionContent: 'pt-0' },
    },
  },
});

const tabStyles = tv({
  extend: focusRing,
  base: 'group relative isolate -mb-px flex min-h-0 cursor-default items-center gap-1.5 rounded-t-xl border border-b-0 border-transparent px-3.5 pt-2 pb-1.5 text-sm whitespace-nowrap text-zinc-500 transition forced-color-adjust-none select-none [-webkit-tap-highlight-color:transparent] hover:bg-gray-200/70 hover:text-zinc-700 disabled:text-zinc-400 selected:z-10 selected:border-gray-200 selected:bg-linear-to-b selected:from-white selected:to-gray-50 selected:text-zinc-950 selected:shadow-[inset_0_1px_0_0_--theme(--color-white/95%),0_-1px_3px_-1px_--theme(--color-zinc-800/4%),0_-3px_8px_-3px_--theme(--color-zinc-800/3%)] [&_svg]:fill-zinc-100 [&_svg]:transition hover:[&_svg]:fill-zinc-200 selected:[&_svg]:fill-zinc-100',
  variants: {
    isDisabled: {
      true: 'text-zinc-400',
    },
  },
});

const toolbarContentStyles = tv({
  base: 'flex min-h-9 w-full items-center justify-end',
});

const headerContentStyles = tv({
  base: 'relative flex w-full items-center',
});

interface ContentPanelProps extends ComponentPropsWithoutRef<'div'> {
  tabs?: ContentPanelTabs;
}

export function ContentPanel({
  children,
  className,
  tabs,
  ...props
}: PropsWithChildren<ContentPanelProps>) {
  const {
    root,
    bodyCell,
    stickyArea,
    toolbarSlot,
    cardFrame,
    headerSlot,
    tabsWrapper,
    tabList,
    tabsToolbarSlot,
  } = styles();
  const rootRef = useRef<HTMLDivElement>(null);
  const stickyAreaRef = useRef<HTMLDivElement>(null);
  const tabsWrapperRef = useRef<HTMLDivElement>(null);
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

  const hasTabs = !!tabs && tabs.items.length > 0;

  useEffect(() => {
    const stickyAreaElement = stickyAreaRef.current;
    const rootElement = rootRef.current;
    const toolbarElement = hasTabs ? tabsWrapperRef.current : slots.toolbar;
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
  }, [slots.toolbar, hasTabs]);

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
          {hasTabs ? (
            <Tabs
              ref={tabsWrapperRef}
              tabs={tabs.items}
              maxVisible={tabs.maxVisible}
              defaultTab={tabs.defaultId}
              queryParam={tabs.queryParam}
              selectedTab={tabs.selectedId}
              onSelect={tabs.onSelect}
              wrapperClassName={tabsWrapper()}
              tabListClassName={tabList()}
              trailing={
                <ContentPanelSlotElement
                  slot="toolbar"
                  className={tabsToolbarSlot()}
                />
              }
            />
          ) : (
            <ContentPanelSlotElement slot="toolbar" className={toolbarSlot()} />
          )}
          <div className={cardFrame()}>
            <ContentPanelCornerMasks />
            <ContentPanelSlotElement slot="header" className={headerSlot()} />
          </div>
        </div>
      </div>
    </ContentPanelContext.Provider>
  );
}

interface TabsProps {
  ref?: React.Ref<HTMLDivElement>;
  tabs: ContentPanelTab[];
  maxVisible?: number;
  defaultTab?: string;
  queryParam?: string;
  selectedTab?: string;
  onSelect?: (id: string) => void;
  wrapperClassName: string;
  tabListClassName: string;
  trailing?: ReactNode;
}

function Tabs({
  ref,
  tabs,
  maxVisible,
  defaultTab,
  queryParam,
  selectedTab: controlledSelectedTab,
  onSelect,
  wrapperClassName,
  tabListClassName,
  trailing,
}: TabsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const disabledTabs = tabs.filter((tab) => tab.disabled).map((tab) => tab.id);
  const requestedTab = queryParam ? searchParams.get(queryParam) : null;
  const fallbackTab =
    tabs.find((tab) => tab.id === defaultTab && !tab.disabled)?.id ??
    tabs.find((tab) => !tab.disabled)?.id;
  const selectableTab = tabs.some(
    (tab) => tab.id === requestedTab && !tab.disabled,
  );
  const isControlled = controlledSelectedTab !== undefined;
  const selectedTab = isControlled
    ? controlledSelectedTab
    : requestedTab && selectableTab
      ? requestedTab
      : fallbackTab;

  const hrefFor = useCallback(
    (tabId: string): string | undefined => {
      if (isControlled || !queryParam) return undefined;
      const params = new URLSearchParams(searchParams);
      if (tabId === fallbackTab) {
        params.delete(queryParam);
      } else {
        params.set(queryParam, tabId);
      }
      const queryString = params.toString();
      return (
        location.pathname +
        (queryString ? `?${queryString}` : '') +
        location.hash
      );
    },
    [
      isControlled,
      queryParam,
      searchParams,
      fallbackTab,
      location.pathname,
      location.hash,
    ],
  );

  const selectTab = useCallback(
    (next: string) => {
      if (next === selectedTab) return;
      if (isControlled) {
        onSelect?.(next);
      } else if (queryParam) {
        setSearchParams((old) => {
          const params = new URLSearchParams(old);
          if (next === fallbackTab) {
            params.delete(queryParam);
          } else {
            params.set(queryParam, next);
          }
          return params;
        });
        onSelect?.(next);
      } else {
        onSelect?.(next);
      }
    },
    [
      selectedTab,
      isControlled,
      onSelect,
      queryParam,
      fallbackTab,
      setSearchParams,
    ],
  );

  // Split `tabs` into visible (rendered as actual tabs) and overflow (folded
  // into a "More" dropdown next to the tablist) at desktop sizes. When the
  // selected tab is past the cap we promote it into the visible set so it's
  // always reachable without opening the dropdown.
  const { visibleTabs, overflowTabs } = useMemo(
    () => splitTabsForOverflow(tabs, maxVisible, selectedTab),
    [tabs, maxVisible, selectedTab],
  );

  // Horizontal scroll for cases where the visible tabs (capped at maxVisible
  // but still arbitrarily wide via long labels) overflow the available
  // tablist width. The More dropdown handles count overflow; this handles
  // width overflow. See scroll-wrapper class comment below.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const isFirstScrollRef = useRef(true);

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Tolerance for subpixel discrepancies between scrollLeft, clientWidth
    // and scrollWidth. Without it the right chevron can stick around after
    // a full scroll-to-end (predicate sees scrollWidth as e.g. .5 px wider
    // than scrollLeft+clientWidth) and clicking it then does nothing.
    const SCROLL_END_PX = 2;
    const next = {
      left: el.scrollLeft > SCROLL_END_PX,
      right: el.scrollWidth - el.scrollLeft - el.clientWidth > SCROLL_END_PX,
    };
    // Bail when nothing changed — otherwise the ResizeObserver fires after
    // every render and re-emits the same state, causing an infinite loop.
    setScrollState((prev) =>
      prev.left === next.left && prev.right === next.right ? prev : next,
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener('scroll', updateScroll, { passive: true });
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      el.removeEventListener('scroll', updateScroll);
      ro.disconnect();
    };
  }, [updateScroll, visibleTabs]);

  const scrollByDelta = (delta: number) =>
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });

  // Auto-scroll the selected tab into view when the selection changes from
  // outside (e.g. a filter activates an off-screen tab). Operates directly on
  // the scroll container's scrollLeft — scrollIntoView would propagate to
  // ancestor scroll containers and move the page. Wrapped in rAF so the
  // measurement happens after layout settles.
  //
  // CHEVRON_AREA reserves space at each edge so the active tab doesn't end up
  // tucked under the chevron's fade gradient overlay. We trigger a scroll even
  // when the tab is technically visible but inside that area.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const wrap = scrollRef.current;
      if (!wrap || !selectedTab) return;
      const tabEl = wrap.querySelector<HTMLElement>(
        `[role="tab"][data-key="${CSS.escape(selectedTab)}"]`,
      );
      if (!tabEl) return;
      const wrapRect = wrap.getBoundingClientRect();
      const tabRect = tabEl.getBoundingClientRect();
      const CHEVRON_AREA = 48;
      const safeLeft = wrapRect.left + CHEVRON_AREA;
      const safeRight = wrapRect.right - CHEVRON_AREA;
      let delta = 0;
      if (tabRect.left < safeLeft) {
        delta = tabRect.left - safeLeft;
      } else if (tabRect.right > safeRight) {
        delta = tabRect.right - safeRight;
      }
      if (delta !== 0) {
        wrap.scrollBy({
          left: delta,
          behavior: isFirstScrollRef.current ? 'auto' : 'smooth',
        });
      }
      isFirstScrollRef.current = false;
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedTab]);

  return (
    <div ref={ref} className={wrapperClassName}>
      <MobileTabsDropdown
        items={tabs}
        selectedItem={tabs.find((t) => t.id === selectedTab) ?? tabs[0]}
        onSelect={selectTab}
      />
      <AriaTabs
        // `min-w-0` lets the flex item shrink below its content width when
        // siblings need space — that's what enables the internal horizontal
        // scroll. Intentionally no `flex-1`: when tabs fit naturally we want
        // AriaTabs to size to its content so the More button sits right next
        // to the last tab (no dead space).
        className="relative hidden min-w-0 self-stretch sm:flex"
        selectedKey={selectedTab}
        disabledKeys={disabledTabs}
        onSelectionChange={(tab) => selectTab(String(tab))}
      >
        {/* Scroll wrapper is a normal flex child so AriaTabs can size to its
            content (no dead space before the More button when tabs fit).
            `-mb-px` extends it 1px past AriaTabs' content edge and `pb-px`
            absorbs the tabs' own `-mb-px` so they still extend into the
            cardFrame border for the merge effect. Don't put overflow-x
            directly on the tablist — it clips the -mb-px and exposes
            cardFrame's top border under the selected tab. */}
        <div
          ref={scrollRef}
          className="-mb-px min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto pb-px [&::-webkit-scrollbar]:hidden"
        >
          <AriaTabList
            className={`${tabListClassName} h-full`}
            aria-label="Tabs"
          >
            {visibleTabs.map((tab) => (
              <AriaTab
                key={tab.id}
                id={tab.id}
                href={tab.href ?? hrefFor(tab.id)}
                isDisabled={tab.disabled}
                className={composeRenderProps('', (className, renderProps) =>
                  tabStyles({ ...renderProps, className }),
                )}
              >
                {tab.label}
              </AriaTab>
            ))}
          </AriaTabList>
        </div>
        {scrollState.left && (
          <button
            type="button"
            onClick={() => scrollByDelta(-220)}
            aria-label="Scroll tabs left"
            className="group absolute bottom-0 left-0 z-20 flex h-9 w-12 items-end justify-start bg-linear-to-r from-gray-100 from-40% to-transparent pb-0.5 pl-1 text-gray-500"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full transition group-hover:bg-zinc-200/70 group-hover:text-zinc-800 group-active:scale-90 group-active:bg-zinc-300/70 group-active:text-zinc-900">
              <Icon name={IconName.ChevronLeft} className="h-3.5 w-3.5" />
            </span>
          </button>
        )}
        {scrollState.right && (
          <button
            type="button"
            onClick={() => scrollByDelta(220)}
            aria-label="Scroll tabs right"
            className="group absolute right-0 bottom-0 z-20 flex h-9 w-12 items-end justify-end bg-linear-to-l from-gray-100 from-40% to-transparent pr-1 pb-0.5 text-gray-500"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full transition group-hover:bg-zinc-200/70 group-hover:text-zinc-800 group-active:scale-90 group-active:bg-zinc-300/70 group-active:text-zinc-900">
              <Icon name={IconName.ChevronRight} className="h-3.5 w-3.5" />
            </span>
          </button>
        )}
      </AriaTabs>
      {overflowTabs.length > 0 && (
        // Sibling of AriaTabs (not a child) so its react-aria Collection
        // doesn't conflict with the Tabs collection — MenuItem lookups
        // would otherwise resolve against the wrong collection and crash
        // with `Cannot read properties of null (reading 'isDisabled')`.
        <Dropdown>
          <DropdownTrigger>
            <Button
              variant="icon"
              className="hidden items-center gap-1.5 self-end rounded-t-xl rounded-b-none border border-b-0 border-transparent px-3 py-1.5 text-sm text-zinc-500 shadow-none hover:bg-gray-200/40 hover:text-zinc-700 sm:flex"
            >
              More
              <Icon
                name={IconName.ChevronsUpDown}
                className="aspect-square h-3.5 w-3.5 opacity-60"
              />
            </Button>
          </DropdownTrigger>
          <DropdownPopover>
            <DropdownMenu onSelect={(key) => selectTab(String(key))}>
              {overflowTabs.map((tab) => {
                const href = tab.href ?? hrefFor(tab.id);
                return href ? (
                  <DropdownItem
                    key={tab.id}
                    href={href}
                    isDisabled={tab.disabled}
                  >
                    {tab.label}
                  </DropdownItem>
                ) : (
                  <DropdownItem
                    key={tab.id}
                    value={tab.id}
                    isDisabled={tab.disabled}
                  >
                    {tab.label}
                  </DropdownItem>
                );
              })}
            </DropdownMenu>
          </DropdownPopover>
        </Dropdown>
      )}
      {trailing}
    </div>
  );
}

function splitTabsForOverflow(
  tabs: ContentPanelTab[],
  maxVisible: number | undefined,
  selectedTab: string | undefined,
): { visibleTabs: ContentPanelTab[]; overflowTabs: ContentPanelTab[] } {
  if (maxVisible === undefined || tabs.length <= maxVisible) {
    return { visibleTabs: tabs, overflowTabs: [] };
  }
  const top = tabs.slice(0, maxVisible);
  const rest = tabs.slice(maxVisible);
  if (!selectedTab || top.some((t) => t.id === selectedTab)) {
    return { visibleTabs: top, overflowTabs: rest };
  }
  const promoted = rest.find((t) => t.id === selectedTab);
  if (!promoted) {
    return { visibleTabs: top, overflowTabs: rest };
  }
  return {
    visibleTabs: [...top, promoted],
    overflowTabs: rest.filter((t) => t.id !== selectedTab),
  };
}

function MobileTabsDropdown({
  items,
  selectedItem,
  onSelect,
}: {
  items: ContentPanelTab[];
  selectedItem?: ContentPanelTab;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="relative -mb-px flex min-w-0 flex-1 self-end sm:hidden">
      <Dropdown>
        <DropdownTrigger>
          <Button
            variant="icon"
            className="relative z-10 flex w-full min-w-0 items-center gap-1.5 self-end rounded-t-xl rounded-b-none border border-b-0 border-gray-200 bg-linear-to-b from-white to-gray-50 px-3.5 pt-2 pb-1.5 text-sm whitespace-nowrap text-zinc-950 shadow-[inset_0_1px_0_0_--theme(--color-white/95%),0_-1px_3px_-1px_--theme(--color-zinc-800/4%),0_-3px_8px_-3px_--theme(--color-zinc-800/3%)] hover:!bg-linear-to-b hover:from-white hover:to-gray-50"
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {(selectedItem ?? items[0])?.label}
            </span>
            <Icon
              name={IconName.ChevronsUpDown}
              className="aspect-square h-3.5 w-3.5 shrink-0 opacity-60"
            />
          </Button>
        </DropdownTrigger>
        <DropdownPopover>
          <DropdownMenu onSelect={(key) => onSelect(String(key))}>
            {items.map((item) => (
              <DropdownItem
                key={item.id}
                value={item.id}
                isDisabled={item.disabled}
              >
                {item.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownPopover>
      </Dropdown>
    </div>
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
