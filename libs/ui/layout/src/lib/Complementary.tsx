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

interface ComplementaryProps {
  setFooterEl: (el: HTMLElement | null) => void;
  onClose?: VoidFunction;
  isOnTop?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
const ComplementaryContext = createContext({ onClose: noop });

export function Complementary({
  children,
  onClose = noop,
  isOnTop = false,
  setFooterEl,
}: PropsWithChildren<ComplementaryProps>) {
  if (!children) {
    return null;
  }

  return (
    <ComplementaryContext.Provider value={{ onClose }}>
      <LayoutOutlet zone={LayoutZone.Complementary}>
        <div
          data-top={isOnTop}
          className="flex max-h-[inherit] min-h-0 w-full min-w-0 flex-col rounded-[1.125rem] border bg-gray-50/80 p-1.5 shadow-lg shadow-zinc-800/5 backdrop-blur-xl backdrop-saturate-200 transition-all duration-250 data-[top=false]:overflow-hidden data-[top=true]:z-1 data-[top=true]:order-1 3xl:shadow-xs [&[data-top=false]:has(~[data-top=false])]:shadow-none"
        >
          <FocusScope restoreFocus autoFocus>
            <div
              data-complementary-content
              className="relative flex max-h-[inherit] min-h-[50vh] flex-auto flex-col overflow-auto overflow-y-auto rounded-xl border bg-white p-3 pt-7"
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
              className="z-10 flex gap-2 rounded-2xl *:min-w-0 has-[*]:mt-1 has-[*]:py-1 has-[*]:pb-0 3xl:sticky 3xl:bottom-0 3xl:-mx-1.5 3xl:-mb-1.5 3xl:bg-gray-50/80 3xl:p-1.5 3xl:pb-1.5 3xl:backdrop-blur-xl 3xl:backdrop-saturate-200 [&:not(:has(*))]:hidden"
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
}: PropsWithChildren<{
  paramName: string;
}>) {
  const [searchParams] = useSearchParams();
  const paramValues = searchParams.getAll(paramName);

  return (
    <>
      {paramValues.map((paramValue) => (
        <ComplementaryWithSearchParamValue
          children={children}
          key={paramValue}
          paramName={paramName}
          paramValue={paramValue}
        />
      ))}
    </>
  );
}

const ComplementaryWithSearchContext = createContext<{
  paramValue: string;
  footerElement?: HTMLElement | null;
  setFooterEl?: (el: HTMLElement | null) => void;
}>({
  paramValue: '',
});

function ComplementaryWithSearchParamValue({
  children,
  paramName,
  paramValue,
}: PropsWithChildren<{
  paramName: string;
  paramValue: string;
}>) {
  const [searchParams, setSearchParams] = useSearchParams();
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
        return new URLSearchParams(
          prev
            .toString()
            .replace(`${paramName}=${paramValue}`, '')
            .replace(`${paramName}=${encodeURIComponent(paramValue)}`, ''),
        );
      },
      { preventScrollReset: true },
    );
  }, [paramName, paramValue, setSearchParams]);
  const isOnTop =
    searchParams.toString().startsWith(`${paramName}=${paramValue}`) ||
    searchParams
      .toString()
      .startsWith(`${paramName}=${encodeURIComponent(paramValue)}`);

  return (
    <ComplementaryWithSearchContext.Provider
      value={{ paramValue, footerElement: footerEl }}
    >
      <Complementary
        children={renderedChildren}
        onClose={onClose}
        isOnTop={isOnTop}
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

  if (searchParams.toString().startsWith(`${paramName}=`)) {
    return searchParams.get(paramName) as string;
  } else {
    return undefined;
  }
}
