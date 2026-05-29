import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

const sidebarStyles = tv({
  slots: {
    aside:
      'peer group/sidebar @container/sidebar sticky top-0 z-50 -ml-[16rem] flex h-screen w-[16rem] shrink-0 flex-col border-r bg-gray-200/50 shadow-[inset_-1px_0px_0px_0px_rgba(0,0,0,0.03),0_100vh_0_0_--theme(--color-gray-200/50%),0_-100vh_0_0_--theme(--color-gray-200/50%)] backdrop-blur-xl backdrop-saturate-200 transition-[width,margin] duration-300 ease-in-out max-md:data-[collapsed=false]:ml-0 md:ml-0 md:w-[4.25rem] md:data-[collapsed=false]:w-[16rem] xl:w-[16rem] xl:data-[collapsed=true]:w-[4.25rem] has-[[data-variant=hidden]]:hidden',
    asideInner: 'relative flex h-full w-full flex-col gap-2 overflow-hidden',
    headerBar: 'flex min-h-16 flex-none items-stretch gap-1 px-4.5 pt-3',
    headerCard: 'flex min-w-0 flex-1 items-start gap-2 py-1',
    // Mask fades the top and bottom edges of the scroll area so nav
    // items dissolve behind the sticky header / footer as they scroll
    // off-screen instead of butting up against them with a hard cut.
    navSlot:
      'flex min-h-0 flex-1 [scrollbar-width:thin] flex-col gap-2 overflow-x-hidden overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent_0,black_0.75rem,black_calc(100%-0.75rem),transparent_100%)] px-3 py-2',
    footerSlot: 'flex flex-none flex-col px-3 pt-1 pb-3',
    toggleButton:
      'fixed top-4 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-full border bg-white p-0 text-gray-500 shadow-xs transition-[left,transform] duration-300 ease-in-out peer-data-[collapsed=false]:left-[16rem] peer-data-[collapsed=false]:-translate-x-1/2 peer-data-[collapsed=false]:rotate-180 hover:bg-gray-50 hover:text-gray-700 md:left-[4.25rem] md:h-6 md:w-6 md:-translate-x-1/2 xl:left-[16rem] xl:rotate-180 xl:peer-data-[collapsed=true]:left-[4.25rem] xl:peer-data-[collapsed=true]:rotate-0 peer-has-[[data-variant=hidden]]:hidden',
  },
});

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebar();
  const s = sidebarStyles();

  return (
    <>
      <aside
        data-collapsed={
          isCollapsed === undefined ? undefined : String(isCollapsed)
        }
        className={s.aside()}
      >
        <div className={s.asideInner()}>
          <div className={s.headerBar()}>
            <div
              id={`${ZONE_IDS[LayoutZone.SideBar]}-header`}
              className={s.headerCard()}
            />
          </div>
          <nav id={ZONE_IDS[LayoutZone.SideBar]} className={s.navSlot()} />
          <div
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

export function SidebarNav({ children }: PropsWithChildren) {
  return (
    <LayoutOutlet zone={LayoutZone.SideBar}>
      <ul className="flex flex-col gap-0.5">{children}</ul>
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
