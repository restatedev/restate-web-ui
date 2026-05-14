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
  onClose?: VoidFunction;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
const ComplementaryContext = createContext({ onClose: noop });

export function Complementary({
  children,
  onClose = noop,
  setFooterEl,
}: PropsWithChildren<ComplementaryProps>) {
  if (!children) {
    return null;
  }

  return (
    <ComplementaryContext.Provider value={{ onClose }}>
      <LayoutOutlet zone={LayoutZone.Complementary}>
        <div className="flex max-h-[inherit] min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[1.125rem] border bg-gray-50/80 p-1.5 shadow-lg shadow-zinc-800/5 backdrop-blur-xl backdrop-saturate-200 transition-all duration-250 3xl:border-transparent 3xl:bg-transparent 3xl:shadow-none 3xl:backdrop-blur-none 3xl:backdrop-saturate-100">
          <FocusScope restoreFocus autoFocus>
            <div
              data-complementary-content
              className="relative flex max-h-[inherit] min-h-[50vh] flex-auto flex-col overflow-x-hidden overflow-y-auto rounded-xl border bg-white p-3 pt-7"
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
              className="z-10 flex gap-2 rounded-2xl *:min-w-0 has-[*]:mt-1 has-[*]:py-1 has-[*]:pb-0 3xl:sticky 3xl:bottom-0 3xl:-mx-1.5 3xl:-mb-1.5 3xl:bg-transparent 3xl:p-1.5 3xl:pb-1.5 3xl:backdrop-blur-xl 3xl:backdrop-saturate-200 3xl:before:pointer-events-none 3xl:before:absolute 3xl:before:-top-8 3xl:before:-right-3 3xl:before:-bottom-3 3xl:before:-left-3 3xl:before:-z-10 3xl:before:bg-linear-to-b 3xl:before:from-transparent 3xl:before:via-gray-100/80 3xl:before:to-gray-100/80 3xl:before:content-[''] [&:not(:has(*))]:hidden"
            />
          </FocusScope>
        </div>
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

  const onClose = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(PANEL_QUERY_PARAM);
        return onCloseQueryParam(next);
      },
      { preventScrollReset: true },
    );
  }, [setSearchParams, onCloseQueryParam]);

  return (
    <ComplementaryWithSearchContext.Provider
      value={{ paramValue, footerElement: footerEl }}
    >
      <Complementary
        children={renderedChildren}
        onClose={onClose}
        setFooterEl={setFooterEl}
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
