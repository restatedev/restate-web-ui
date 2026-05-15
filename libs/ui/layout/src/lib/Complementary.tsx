import {
  ComponentProps,
  createContext,
  use,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { LayoutOutlet } from './Layout';
import { LayoutZone } from './LayoutZone';
import { useSearchParams } from 'react-router';
import { Pressable, PressResponder } from '@react-aria/interactions';
import { FocusScope } from 'react-aria';
import { createPortal } from 'react-dom';
import { PANEL_QUERY_PARAM } from '@restate/util/panel';

interface ComplementaryProps {
  setFooterEl: (el: HTMLElement | null) => void;
  setHeaderEl: (el: HTMLElement | null) => void;
  onClose?: VoidFunction;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
const ComplementaryContext = createContext({ onClose: noop });

export function Complementary({
  children,
  onClose = noop,
  setFooterEl,
  setHeaderEl,
}: PropsWithChildren<ComplementaryProps>) {
  if (!children) {
    return null;
  }

  return (
    <ComplementaryContext.Provider value={{ onClose }}>
      <LayoutOutlet zone={LayoutZone.Complementary}>
        <FocusScope restoreFocus autoFocus>
          <div
            ref={setHeaderEl}
            className="z-10 flex items-center justify-end gap-0.5 px-1 pb-1 3xl:px-2 3xl:pb-1.5 [&:not(:has(*))]:hidden"
          />
          <div className="flex max-h-[inherit] min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[1.125rem] border bg-gray-50/80 p-1.5 shadow-lg shadow-zinc-800/5 backdrop-blur-xl backdrop-saturate-200 transition-all duration-250 3xl:overflow-visible 3xl:border-transparent 3xl:bg-transparent 3xl:p-0 3xl:shadow-none 3xl:backdrop-blur-none 3xl:backdrop-saturate-100">
            <div
              data-complementary-content
              className="relative flex max-h-[inherit] min-h-[50vh] flex-auto flex-col overflow-x-hidden overflow-y-auto rounded-xl border bg-white p-3 pt-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)] 3xl:rounded-t-2xl 3xl:rounded-b-none 3xl:border-b-0 3xl:border-gray-200 3xl:bg-gray-50"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onClose?.();
                }
              }}
            >
              <div tabIndex={0} />
              {children}
            </div>
            <div
              ref={setFooterEl}
              className="z-10 flex gap-2 rounded-2xl *:min-w-0 has-[*]:mt-1 has-[*]:py-1 has-[*]:pb-0 3xl:p-3 [&:not(:has(*))]:hidden"
            />
          </div>
        </FocusScope>
      </LayoutOutlet>
    </ComplementaryContext.Provider>
  );
}

export function ComplementaryClose({
  children,
}: {
  children: ComponentProps<typeof Pressable>['children'];
}) {
  const state = useContext(ComplementaryContext);
  return (
    <PressResponder
      onPress={() => {
        state.onClose();
      }}
    >
      {children}
    </PressResponder>
  );
}

export function ComplementaryWithSearchParam({
  children,
  paramName,
  onCloseQueryParam,
}: PropsWithChildren<{
  paramName: string;
  onCloseQueryParam?: (prev: URLSearchParams) => URLSearchParams;
}>) {
  const [searchParams] = useSearchParams();
  const isActive = searchParams.get(PANEL_QUERY_PARAM) === paramName;
  const paramValue = searchParams.get(paramName);

  if (!isActive || !paramValue) {
    return null;
  }

  return (
    <ComplementaryWithSearchParamValue
      children={children}
      paramName={paramName}
      paramValue={paramValue}
      onCloseQueryParam={onCloseQueryParam}
    />
  );
}

const ComplementaryWithSearchContext = createContext<{
  paramValue: string;
  footerElement?: HTMLElement | null;
  setFooterEl?: (el: HTMLElement | null) => void;
  headerElement?: HTMLElement | null;
  setHeaderEl?: (el: HTMLElement | null) => void;
}>({
  paramValue: '',
});
const noOp = (prev: URLSearchParams) => prev;

function ComplementaryWithSearchParamValue({
  children,
  paramValue,
  onCloseQueryParam = noOp,
}: PropsWithChildren<{
  paramName: string;
  paramValue: string;
  onCloseQueryParam?: (prev: URLSearchParams) => URLSearchParams;
}>) {
  const [, setSearchParams] = useSearchParams();
  const renderedChildren = useMemo(() => {
    if (!paramValue) {
      return null;
    }
    return children;
  }, [children, paramValue]);
  const [footerEl, setFooterEl] = useState<HTMLElement | null>(null);
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);

  const onClose = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const activePanel = next.get(PANEL_QUERY_PARAM);
        next.delete(PANEL_QUERY_PARAM);
        if (activePanel) {
          next.delete(activePanel);
        }
        return onCloseQueryParam(next);
      },
      { preventScrollReset: true },
    );
  }, [setSearchParams, onCloseQueryParam]);

  return (
    <ComplementaryWithSearchContext.Provider
      value={{
        paramValue,
        footerElement: footerEl,
        headerElement: headerEl,
      }}
    >
      <Complementary
        children={renderedChildren}
        onClose={onClose}
        setFooterEl={setFooterEl}
        setHeaderEl={setHeaderEl}
      />
    </ComplementaryWithSearchContext.Provider>
  );
}

export function ComplementaryFooter({ children }: PropsWithChildren) {
  const { footerElement } = use(ComplementaryWithSearchContext);

  if (footerElement) {
    return createPortal(children, footerElement);
  }
  return null;
}

export function ComplementaryHeader({ children }: PropsWithChildren) {
  const { headerElement } = use(ComplementaryWithSearchContext);

  if (headerElement) {
    return createPortal(children, headerElement);
  }
  return null;
}

export function useParamValue() {
  const { paramValue } = use(ComplementaryWithSearchContext);

  return paramValue;
}

export function useActiveSidebarParam(paramName: string) {
  const [searchParams] = useSearchParams();

  if (searchParams.get(PANEL_QUERY_PARAM) !== paramName) {
    return undefined;
  }
  return searchParams.get(paramName) ?? undefined;
}
