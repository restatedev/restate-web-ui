import {
  Children,
  isValidElement,
  PropsWithChildren,
  ReactNode,
  useMemo,
} from 'react';
import {
  SelectionIndicator,
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  TabPanels as AriaTabPanels,
  Tabs as AriaTabs,
  composeRenderProps,
} from 'react-aria-components';
import { useSearchParams } from 'react-router';
import { focusRing } from '@restate/ui/focus';
import { tv } from '@restate/util/styles';

export type TabId = string;

export interface TabsProps {
  className?: string;
  defaultTab?: TabId;
  queryParam?: string;
  onTabChange?: (tab: TabId) => void;
  selectedTab?: TabId;
}

export interface TabListProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
}

export interface TabProps {
  id: TabId;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export interface TabPanelsProps {
  className?: string;
}

export interface TabPanelProps {
  id: TabId;
  children: ReactNode;
  className?: string;
}

interface TabDefinition {
  id: TabId;
  disabled?: boolean;
}

interface BaseTabsProps extends Omit<TabsProps, 'queryParam'> {
  disabledTabs: TabId[];
}

interface QueryParamTabsProps extends Omit<TabsProps, 'queryParam'> {
  disabledTabs: TabId[];
  queryParam: string;
  tabs: TabDefinition[];
}

const tabsStyles = tv({
  base: 'flex max-w-full flex-col gap-3',
});

const tabListStyles = tv({
  base: '-m-1 flex max-w-full gap-4 overflow-x-auto overflow-y-clip border-b border-zinc-200 p-1 outline-none [scrollbar-width:none]',
});

const tabStyles = tv({
  extend: focusRing,
  base: 'group relative mb-1 flex min-h-0 cursor-default items-center justify-center gap-1.5 rounded-xl px-1 py-0.5 text-sm font-medium whitespace-nowrap text-zinc-500 transition forced-color-adjust-none [-webkit-tap-highlight-color:transparent] hover:text-zinc-900 disabled:text-zinc-400 pressed:text-zinc-900 selected:text-zinc-950',
  variants: {
    isDisabled: {
      true: 'text-zinc-400',
    },
  },
});

const selectionIndicatorStyles = tv({
  base: 'absolute -bottom-2 left-0 h-0.5 w-full rounded-full bg-blue-600 motion-safe:transition-[translate,width,height]',
});

const tabPanelsStyles = tv({
  base: 'relative min-w-0 flex-1 overflow-clip',
});

const tabPanelStyles = tv({
  extend: focusRing,
  base: 'min-w-0 text-sm text-zinc-900 transition entering:opacity-0 exiting:absolute exiting:top-0 exiting:left-0 exiting:w-full exiting:opacity-0',
});

function collectTabsFromChildren(children: ReactNode): TabDefinition[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) {
      return [];
    }

    if (child.type === Tab) {
      const props = child.props as TabProps;
      return [{ id: props.id, disabled: props.disabled }];
    }

    const props = child.props as { children?: ReactNode };

    return collectTabsFromChildren(props.children);
  });
}

function getFallbackTab(tabs: TabDefinition[], defaultTab?: TabId) {
  if (tabs.length === 0) {
    return defaultTab;
  }

  const selectableDefault = tabs.some(
    (tab) => tab.id === defaultTab && !tab.disabled,
  );

  if (defaultTab && selectableDefault) {
    return defaultTab;
  }

  return tabs.find((tab) => !tab.disabled)?.id;
}

function getSelectedTab(
  selectedTab: TabId | null | undefined,
  tabs: TabDefinition[],
  defaultTab?: TabId,
) {
  if (tabs.length === 0) {
    return selectedTab ?? defaultTab;
  }

  const selectableTab = tabs.some(
    (tab) => tab.id === selectedTab && !tab.disabled,
  );

  if (selectedTab && selectableTab) {
    return selectedTab;
  }

  return getFallbackTab(tabs, defaultTab);
}

function BaseTabs({
  children,
  className,
  defaultTab,
  disabledTabs,
  onTabChange,
  selectedTab,
}: PropsWithChildren<BaseTabsProps>) {
  return (
    <AriaTabs
      selectedKey={selectedTab}
      defaultSelectedKey={selectedTab ? undefined : defaultTab}
      disabledKeys={disabledTabs}
      onSelectionChange={(tab) => onTabChange?.(String(tab))}
      className={composeRenderProps(className, (className) =>
        tabsStyles({ className }),
      )}
    >
      {children}
    </AriaTabs>
  );
}

function QueryParamTabs({
  children,
  defaultTab,
  disabledTabs,
  onTabChange,
  queryParam,
  tabs,
  ...props
}: PropsWithChildren<QueryParamTabsProps>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = getSelectedTab(
    searchParams.get(queryParam),
    tabs,
    defaultTab,
  );

  return (
    <BaseTabs
      {...props}
      defaultTab={defaultTab}
      disabledTabs={disabledTabs}
      selectedTab={selectedTab}
      onTabChange={(tab) => {
        setSearchParams((old) => {
          const next = new URLSearchParams(old);

          if (tab === getFallbackTab(tabs, defaultTab)) {
            next.delete(queryParam);
          } else {
            next.set(queryParam, tab);
          }

          return next;
        });
        onTabChange?.(tab);
      }}
    >
      {children}
    </BaseTabs>
  );
}

export function Tabs({
  children,
  defaultTab,
  queryParam,
  selectedTab,
  ...props
}: PropsWithChildren<TabsProps>) {
  const tabs = useMemo(() => collectTabsFromChildren(children), [children]);
  const disabledTabs = useMemo(
    () => tabs.filter((tab) => tab.disabled).map((tab) => tab.id),
    [tabs],
  );

  if (queryParam) {
    return (
      <QueryParamTabs
        {...props}
        defaultTab={defaultTab}
        disabledTabs={disabledTabs}
        queryParam={queryParam}
        tabs={tabs}
      >
        {children}
      </QueryParamTabs>
    );
  }

  return (
    <BaseTabs
      {...props}
      defaultTab={defaultTab}
      disabledTabs={disabledTabs}
      selectedTab={selectedTab}
    >
      {children}
    </BaseTabs>
  );
}

export function TabList({
  children,
  className,
  ...props
}: PropsWithChildren<TabListProps>) {
  return (
    <AriaTabList
      {...props}
      className={composeRenderProps(className, (className) =>
        tabListStyles({ className }),
      )}
    >
      {children}
    </AriaTabList>
  );
}

export function Tab({ children, className, disabled, id }: TabProps) {
  return (
    <AriaTab
      id={id}
      isDisabled={disabled}
      className={composeRenderProps(className, (className, renderProps) =>
        tabStyles({
          ...renderProps,
          className,
        }),
      )}
    >
      {children}
      <SelectionIndicator className={selectionIndicatorStyles()} />
    </AriaTab>
  );
}

export function TabPanels({
  children,
  className,
}: PropsWithChildren<TabPanelsProps>) {
  return (
    <AriaTabPanels className={tabPanelsStyles({ className })}>
      {children}
    </AriaTabPanels>
  );
}

export function TabPanel({ children, className, id }: TabPanelProps) {
  return (
    <AriaTabPanel
      id={id}
      className={composeRenderProps(className, (className, renderProps) =>
        tabPanelStyles({ ...renderProps, className }),
      )}
    >
      {children}
    </AriaTabPanel>
  );
}
