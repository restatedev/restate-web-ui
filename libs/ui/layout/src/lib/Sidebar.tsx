import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';

const SIDEBAR_HEADER_ID = 'restate-sidebar-header';
const SIDEBAR_NAV_ID = 'restate-sidebar-nav';
const SIDEBAR_FOOTER_ID = 'restate-sidebar-footer';

const STORAGE_KEY = 'restate.sidebar.collapsed';
const PERSIST_EVENT = 'restate:sidebar-collapsed-change';
const COLLAPSED_THRESHOLD_PX = 128;

function readPersistedCollapsed(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

function getServerCollapsed(): boolean {
  return false;
}

function subscribePersistedCollapsed(cb: () => void) {
  window.addEventListener(PERSIST_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(PERSIST_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

function writePersistedCollapsed(collapsed: boolean) {
  window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  window.dispatchEvent(new Event(PERSIST_EVENT));
}

interface SidebarContextValue {
  userCollapsed: boolean;
  isDrawerOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  asideRef: Ref<HTMLElement>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const SidebarContext = createContext<SidebarContextValue>({
  userCollapsed: false,
  isDrawerOpen: false,
  isCollapsed: false,
  toggle: noop,
  asideRef: null,
});

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: PropsWithChildren) {
  const userCollapsed = useSyncExternalStore(
    subscribePersistedCollapsed,
    readPersistedCollapsed,
    getServerCollapsed,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const asideRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setIsCollapsed(rect.right < COLLAPSED_THRESHOLD_PX);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    node.addEventListener('transitionend', update);
    return () => {
      ro.disconnect();
      node.removeEventListener('transitionend', update);
    };
  }, []);

  const toggle = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 47.99rem)').matches
    ) {
      setIsDrawerOpen((open) => !open);
    } else {
      writePersistedCollapsed(!readPersistedCollapsed());
    }
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        userCollapsed,
        isDrawerOpen,
        isCollapsed,
        toggle,
        asideRef,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

const sidebarStyles = tv({
  slots: {
    aside:
      'peer @container/sidebar sticky top-0 z-50 -ml-[16rem] flex h-screen w-[16rem] shrink-0 flex-col border-r bg-gray-200/50 shadow-[inset_-1px_0px_0px_0px_rgba(0,0,0,0.03)] backdrop-blur-xl backdrop-saturate-200 transition-[width,margin] duration-300 ease-in-out max-md:data-[drawer-open=true]:ml-0 md:ml-0 md:w-[4.25rem] xl:w-[16rem] xl:data-[user-collapsed=true]:w-[4.25rem]',
    asideInner: 'relative flex h-full w-full flex-col gap-2 overflow-hidden',
    headerBar:
      'flex flex-none items-stretch gap-1 px-4.5 pt-3 @max-[8rem]/sidebar:px-2',
    headerCard:
      'flex min-w-0 flex-1 items-start gap-2 py-1 @max-[8rem]/sidebar:items-center @max-[8rem]/sidebar:justify-center',
    navSlot:
      'flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto px-3 py-2 [scrollbar-width:thin] @max-[8rem]/sidebar:px-2',
    footerSlot:
      'flex flex-none flex-col px-3 pt-1 pb-3 @max-[8rem]/sidebar:px-2',
    toggleButton:
      'fixed top-4 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-full border bg-white p-0 text-gray-500 shadow-xs transition-[left,transform] duration-300 ease-in-out hover:bg-gray-50 hover:text-gray-700 max-md:peer-data-[drawer-open=true]:left-[16rem] max-md:peer-data-[drawer-open=true]:-translate-x-1/2 max-md:peer-data-[drawer-open=true]:rotate-180 md:h-6 md:w-6 md:left-[4.25rem] md:-translate-x-1/2 xl:left-[16rem] xl:rotate-180 xl:peer-data-[user-collapsed=true]:left-[4.25rem] xl:peer-data-[user-collapsed=true]:rotate-0',
  },
});

export function Sidebar() {
  const { userCollapsed, isDrawerOpen, isCollapsed, toggle, asideRef } =
    useSidebar();
  const s = sidebarStyles();

  return (
    <>
      <aside
        ref={asideRef}
        data-user-collapsed={String(userCollapsed)}
        data-drawer-open={String(isDrawerOpen)}
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
