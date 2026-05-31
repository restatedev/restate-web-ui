import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { ZONE_IDS, LayoutZone } from './LayoutZone';
import { LayoutOutlet } from './LayoutOutlet';

const STORAGE_KEY = 'restate.sidebar.collapsed';
const FORCE_COLLAPSED_QUERY = '(max-width: 79.99rem)';

function readPersistedCollapsed(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

function writePersistedCollapsed(collapsed: boolean) {
  window.localStorage.setItem(STORAGE_KEY, String(collapsed));
}

function computeCollapsed(): boolean {
  if (window.matchMedia(FORCE_COLLAPSED_QUERY).matches) return true;
  return readPersistedCollapsed();
}

interface SidebarContextValue {
  isCollapsed: boolean | undefined;
  toggle: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const SidebarContext = createContext<SidebarContextValue>({
  isCollapsed: undefined,
  toggle: noop,
});

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: PropsWithChildren) {
  const [isCollapsed, setIsCollapsed] = useState<boolean | undefined>(
    undefined,
  );

  useEffect(() => {
    setIsCollapsed(computeCollapsed());

    const mql = window.matchMedia(FORCE_COLLAPSED_QUERY);
    const onResize = () => {
      if (mql.matches) {
        setIsCollapsed(true);
        writePersistedCollapsed(true);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && !mql.matches) {
        setIsCollapsed(readPersistedCollapsed());
      }
    };
    mql.addEventListener('change', onResize);
    window.addEventListener('storage', onStorage);
    return () => {
      mql.removeEventListener('change', onResize);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggle = useCallback(() => {
    setIsCollapsed((c) => {
      const next = !c;
      writePersistedCollapsed(next);
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

// `data-collapsed` (set on the aside below) is the single source of truth for
// the rail-vs-expanded look, and `@container/sidebar` exposes the sidebar's own
// width. Descendants (SidebarNavItem labels, sub-lists, chevrons) must drive
// show/hide off THAT state — never off the viewport — otherwise an expanded
// sidebar on a small screen renders as a rail. The `md:`/`xl:` breakpoints here
// only pick the responsive default width + mobile drawer; they realize the
// collapsed state, they are not a screen-width signal for content to read.
const sidebarStyles = tv({
  slots: {
    aside:
      'peer group/sidebar @container/sidebar sticky top-0 z-50 -ml-[16rem] flex h-screen w-[16rem] shrink-0 flex-col border-r bg-gray-200/50 shadow-[inset_-1px_0px_0px_0px_rgba(0,0,0,0.03),0_100vh_0_0_--theme(--color-gray-200/50%),0_-100vh_0_0_--theme(--color-gray-200/50%)] backdrop-blur-xl backdrop-saturate-200 transition-[width,margin] duration-300 ease-in-out has-[[data-variant=hidden]]:hidden max-md:data-[collapsed=false]:ml-0 md:ml-0 md:w-[4.25rem] md:data-[collapsed=false]:w-[16rem] xl:w-[16rem] xl:data-[collapsed=true]:w-[4.25rem]',
    asideInner: 'relative h-full w-full overflow-hidden',
    // Cloud/sky backdrop: a non-scrolling layer pinned to the full rail with
    // NO padding (so the w-screen cloud stays pixel-aligned with the page
    // cloud) and clipped to it. Sits behind the scroll area; the sticky bars
    // frost over it.
    backdrop: 'pointer-events-none absolute inset-0 -z-10 overflow-hidden',
    // The whole rail is one scroll container; the nav is clipped so scrolled
    // items dissolve behind the (transparent) header/footer overlays instead of
    // ghosting through. Default clip = an edge fade sized to the measured
    // header/footer heights (published as --sidebar-header-h/-footer-h); apps
    // override --sidebar-nav-mask(+-size/-position/-composite) with a custom
    // shape (cloud sets a cloud silhouette). Alpha mask: opaque = keep.
    // NOTE: `mask-composite` is set inline, NOT here — Tailwind auto-prefixes
    // it to `-webkit-mask-composite`, whose legacy values differ (`add`/
    // `intersect` are invalid there), which drops the whole mask.
    scrollArea:
      'relative flex h-full w-full [scrollbar-width:thin] flex-col overflow-x-hidden overflow-y-auto [mask-image:var(--sidebar-nav-mask,linear-gradient(to_bottom,transparent_0,transparent_var(--sidebar-header-h,0px),black_calc(var(--sidebar-header-h,0px)_+_0.5rem),black_calc(100%_-_var(--sidebar-footer-h,0px)_-_0.5rem),transparent_calc(100%_-_var(--sidebar-footer-h,0px)),transparent_100%))] [mask-mode:alpha] [mask-size:var(--sidebar-nav-mask-size,100%_100%)] [mask-position:var(--sidebar-nav-mask-position,center)] [mask-repeat:no-repeat]',
    // Overlay (like the footer) so the nav mask clips only the nav — the
    // selector deck sits on top, unclipped, transparent over the sky/cloud.
    headerBar:
      'pointer-events-none absolute inset-x-0 top-0 z-20 flex min-h-16 items-stretch gap-1 px-4.5 pt-3 [&>*]:pointer-events-auto',
    headerCard: 'flex min-w-0 flex-1 items-start gap-2 py-1',
    // flex-[1_0_auto]: grow to fill when the list is short; never shrink below
    // content height, so a long list overflows and the rail scrolls. Top/bottom
    // padding clears the header/footer overlays (measured heights);
    // --sidebar-nav-pt-extra / --sidebar-nav-pb let an app reserve more (cloud
    // uses them for the collapsed top-cloud band and the bottom cloud).
    navSlot:
      'flex flex-[1_0_auto] flex-col gap-2 overflow-x-hidden px-3 pt-[calc(var(--sidebar-header-h,0px)_+_var(--sidebar-nav-pt-extra,0.5rem))] pb-[var(--sidebar-nav-pb,calc(var(--sidebar-footer-h,0px)_+_1rem))]',
    // The footer is an overlay (not in the scroll flow) so the nav mask clips
    // only the nav, leaving the footer crisp and transparent over the cloud.
    footerSlot:
      'pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col px-3 pt-1 pb-3 [&>*]:pointer-events-auto',
    toggleButton:
      'fixed top-4 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-full border bg-white p-0 text-gray-500 shadow-xs transition-[left,transform] duration-300 ease-in-out peer-has-[[data-variant=hidden]]:hidden peer-data-[collapsed=false]:left-[16rem] peer-data-[collapsed=false]:-translate-x-1/2 peer-data-[collapsed=false]:rotate-180 hover:bg-gray-50 hover:text-gray-700 md:left-[4.25rem] md:h-6 md:w-6 md:-translate-x-1/2 xl:left-[16rem] xl:rotate-180 xl:peer-data-[collapsed=true]:left-[4.25rem] xl:peer-data-[collapsed=true]:rotate-0',
  },
});

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebar();
  const s = sidebarStyles();

  // Header and footer are absolute overlays (so the nav mask clips only the
  // nav), so they no longer reserve flow space. Measure them and publish the
  // heights as CSS vars on the aside; the nav padding and the default fade
  // mask are expressed against these vars in the `tv()` slots above.
  const asideRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const aside = asideRef.current;
    if (!aside || typeof ResizeObserver === 'undefined') {
      return;
    }
    const measure = () => {
      aside.style.setProperty(
        '--sidebar-header-h',
        `${headerRef.current?.offsetHeight ?? 0}px`,
      );
      aside.style.setProperty(
        '--sidebar-footer-h',
        `${footerRef.current?.offsetHeight ?? 0}px`,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (headerRef.current) ro.observe(headerRef.current);
    if (footerRef.current) ro.observe(footerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <aside
        ref={asideRef}
        data-collapsed={
          isCollapsed === undefined ? undefined : String(isCollapsed)
        }
        className={s.aside()}
      >
        <div className={s.asideInner()}>
          <div
            id={`${ZONE_IDS[LayoutZone.SideBar]}-backdrop`}
            className={s.backdrop()}
          />
          <div
            className={s.scrollArea()}
            // `mask-composite` can't be a Tailwind class (its `-webkit-` auto-
            // prefix takes invalid values and drops the mask). Standard-only.
            // Unset var → `add` (single fade layer); cloud sets `intersect`.
            style={{ maskComposite: 'var(--sidebar-nav-mask-composite)' }}
          >
            <nav id={ZONE_IDS[LayoutZone.SideBar]} className={s.navSlot()} />
          </div>
          <div ref={headerRef} className={s.headerBar()}>
            <div
              id={`${ZONE_IDS[LayoutZone.SideBar]}-header`}
              className={s.headerCard()}
            />
          </div>
          <div
            ref={footerRef}
            id={`${ZONE_IDS[LayoutZone.SideBar]}-footer`}
            className={s.footerSlot()}
          />
        </div>
      </aside>
      <Button
        variant="secondary"
        onClick={toggle}
        className={s.toggleButton()}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Icon
          name={IconName.ChevronRight}
          className="h-5 w-5 md:h-3.5 md:w-3.5"
        />
      </Button>
    </>
  );
}

export function SidebarHeader({ children }: PropsWithChildren) {
  return (
    <LayoutOutlet zone={LayoutZone.SideBar} slot="header">
      {children}
    </LayoutOutlet>
  );
}

// Non-scrolling layer behind the scroll area, for the cloud/sky motif. Kept out
// of the sticky header/footer so the cloud anchors to the full rail (no
// padding) and stays aligned with the page-level cloud.
export function SidebarBackdrop({ children }: PropsWithChildren) {
  return (
    <LayoutOutlet zone={LayoutZone.SideBar} slot="backdrop">
      {children}
    </LayoutOutlet>
  );
}

interface NavExpansionContextValue {
  isOpen: (id: string, hasActiveDescendant: boolean) => boolean;
  toggle: (id: string, currentlyOpen: boolean) => void;
}

const NavExpansionContext = createContext<NavExpansionContextValue>({
  isOpen: () => true,
  toggle: noop,
});

export function useNavExpansion(): NavExpansionContextValue {
  return useContext(NavExpansionContext);
}

function NavExpansionProvider({ children }: PropsWithChildren) {
  const { isCollapsed } = useSidebar();
  const listRef = useRef<HTMLUListElement>(null);
  const [fitsAll, setFitsAll] = useState(true);
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(
    () => new Map(),
  );

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') {
      return;
    }
    const nav = list.closest('nav');
    const scrollArea = nav?.parentElement;
    if (!nav || !scrollArea) {
      return;
    }
    let frame = 0;
    const recompute = () => {
      frame = 0;
      const cs = getComputedStyle(nav);
      const available =
        scrollArea.clientHeight -
        (parseFloat(cs.paddingTop) || 0) -
        (parseFloat(cs.paddingBottom) || 0);
      if (available <= 0) {
        return;
      }
      let projected = list.scrollHeight;
      list.querySelectorAll('[data-nav-sublist]').forEach((el) => {
        const sub = el as HTMLElement;
        projected += Math.max(0, sub.scrollHeight - sub.offsetHeight);
      });
      setFitsAll((prev) => {
        const next = projected <= available + 4;
        return prev === next ? prev : next;
      });
    };
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(recompute);
      }
    };
    recompute();
    const ro = new ResizeObserver(schedule);
    ro.observe(scrollArea);
    ro.observe(list);
    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      ro.disconnect();
    };
  }, [isCollapsed]);

  const value = useMemo<NavExpansionContextValue>(
    () => ({
      isOpen: (id, hasActiveDescendant) => {
        const override = overrides.get(id);
        if (override !== undefined) {
          return override;
        }
        return hasActiveDescendant || fitsAll;
      },
      toggle: (id, currentlyOpen) =>
        setOverrides((prev) => {
          const next = new Map(prev);
          next.set(id, !currentlyOpen);
          return next;
        }),
    }),
    [overrides, fitsAll],
  );

  return (
    <NavExpansionContext.Provider value={value}>
      <ul ref={listRef} className="flex flex-col gap-0.5">
        {children}
      </ul>
    </NavExpansionContext.Provider>
  );
}

export function SidebarNav({ children }: PropsWithChildren) {
  return (
    <LayoutOutlet zone={LayoutZone.SideBar}>
      <NavExpansionProvider>{children}</NavExpansionProvider>
    </LayoutOutlet>
  );
}

export function SidebarFooter({ children }: PropsWithChildren) {
  return (
    <LayoutOutlet zone={LayoutZone.SideBar} slot="footer">
      {children}
    </LayoutOutlet>
  );
}
