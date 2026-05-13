import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';

const SIDEBAR_HEADER_ID = 'restate-sidebar-header';
const SIDEBAR_NAV_ID = 'restate-sidebar-nav';
const SIDEBAR_FOOTER_ID = 'restate-sidebar-footer';

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
      'peer group/sidebar @container/sidebar sticky top-0 z-50 flex h-screen w-[16rem] -ml-[16rem] shrink-0 flex-col border-r bg-gray-200/50 shadow-[inset_-1px_0px_0px_0px_rgba(0,0,0,0.03)] backdrop-blur-xl backdrop-saturate-200 transition-[width,margin] duration-300 ease-in-out md:ml-0 md:w-[4.25rem] xl:w-[16rem] max-md:data-[collapsed=false]:ml-0 md:data-[collapsed=false]:w-[16rem] xl:data-[collapsed=true]:w-[4.25rem]',
    asideInner: 'relative flex h-full w-full flex-col gap-2 overflow-hidden',
    headerBar:
      'flex flex-none items-stretch gap-1 px-4.5 pt-3 max-xl:px-2 group-data-[collapsed=true]/sidebar:px-2 group-data-[collapsed=false]/sidebar:px-4.5',
    headerCard:
      'flex min-w-0 flex-1 items-start gap-2 py-1 max-xl:items-center max-xl:justify-center group-data-[collapsed=true]/sidebar:items-center group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=false]/sidebar:items-start group-data-[collapsed=false]/sidebar:justify-start',
    navSlot:
      'flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto px-3 py-2 [scrollbar-width:thin] max-xl:px-2 group-data-[collapsed=true]/sidebar:px-2 group-data-[collapsed=false]/sidebar:px-3',
    footerSlot:
      'flex flex-none flex-col px-3 pt-1 pb-3 max-xl:px-2 group-data-[collapsed=true]/sidebar:px-2 group-data-[collapsed=false]/sidebar:px-3',
    toggleButton:
      'fixed top-4 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-full border bg-white p-0 text-gray-500 shadow-xs transition-[left,transform] duration-300 ease-in-out hover:bg-gray-50 hover:text-gray-700 md:left-[4.25rem] md:h-6 md:w-6 md:-translate-x-1/2 xl:left-[16rem] xl:rotate-180 peer-data-[collapsed=false]:left-[16rem] peer-data-[collapsed=false]:-translate-x-1/2 peer-data-[collapsed=false]:rotate-180 xl:peer-data-[collapsed=true]:left-[4.25rem] xl:peer-data-[collapsed=true]:rotate-0',
  },
});

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebar();
  const s = sidebarStyles();

  return (
    <>
      <aside
        data-collapsed={isCollapsed === undefined ? undefined : String(isCollapsed)}
        className={s.aside()}
      >
        <div className={s.asideInner()}>
          <div className={s.headerBar()}>
            <div id={SIDEBAR_HEADER_ID} className={s.headerCard()} />
          </div>
          <nav id={SIDEBAR_NAV_ID} className={s.navSlot()} />
          <div id={SIDEBAR_FOOTER_ID} className={s.footerSlot()} />
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

function SidebarPortal({
  zoneId,
  children,
}: PropsWithChildren<{ zoneId: string }>) {
  if (typeof document === 'undefined') {
    return null;
  }
  const target = document.getElementById(zoneId);
  if (!target) {
    return null;
  }
  return createPortal(children, target);
}

export function SidebarHeader({ children }: PropsWithChildren) {
  return <SidebarPortal zoneId={SIDEBAR_HEADER_ID}>{children}</SidebarPortal>;
}

export function SidebarNav({ children }: PropsWithChildren) {
  return (
    <SidebarPortal zoneId={SIDEBAR_NAV_ID}>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </SidebarPortal>
  );
}

export function SidebarFooter({ children }: PropsWithChildren) {
  return <SidebarPortal zoneId={SIDEBAR_FOOTER_ID}>{children}</SidebarPortal>;
}
