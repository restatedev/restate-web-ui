import {
  createContext,
  use,
  useCallback,
  useState,
  type PropsWithChildren,
} from 'react';
import { LayoutOutlet } from './LayoutOutlet';
import { LayoutZone } from './LayoutZone';
import { useSearchParams } from 'react-router';
import { ButtonContext } from 'react-aria-components';
import { FocusScope } from 'react-aria';
import { createPortal } from 'react-dom';
import { PANEL_QUERY_PARAM } from '@restate/util/panel';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
const ComplementaryContext = createContext<{
  paramValue: string;
  headerElement: HTMLElement | null;
  onClose: VoidFunction;
}>({
  paramValue: '',
  headerElement: null,
  onClose: noop,
});

export function ComplementaryWithSearchParam({
  children,
  paramName,
}: PropsWithChildren<{
  paramName: string;
}>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [headerElement, setHeaderElement] = useState<HTMLElement | null>(null);
  const isActive = searchParams.get(PANEL_QUERY_PARAM) === paramName;
  const paramValue = searchParams.get(paramName);

  const onClose = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(PANEL_QUERY_PARAM);
        next.delete(paramName);
        return next;
      },
      { preventScrollReset: true },
    );
  }, [paramName, setSearchParams]);

  if (!isActive || !paramValue) {
    return null;
  }

  return (
    <ComplementaryContext.Provider
      value={{ paramValue, headerElement, onClose }}
    >
      <LayoutOutlet zone={LayoutZone.Complementary}>
        <FocusScope restoreFocus autoFocus>
          <div
            ref={setHeaderElement}
            className="z-10 flex items-center justify-end gap-0.5 px-1 pb-1 3xl:px-2 3xl:pb-1.5 [&:not(:has(*))]:hidden"
          />
          <div className="flex max-h-[inherit] min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[1.125rem] border bg-gray-50/80 p-1.5 shadow-lg shadow-zinc-800/5 backdrop-blur-xl backdrop-saturate-200 transition-all duration-250 3xl:overflow-visible 3xl:border-transparent 3xl:bg-transparent 3xl:p-0 3xl:shadow-none 3xl:backdrop-blur-none 3xl:backdrop-saturate-100">
            <div
              data-complementary-content
              className="relative flex max-h-[inherit] min-h-[50vh] flex-auto flex-col overflow-x-hidden overflow-y-auto rounded-xl border bg-white p-3 pt-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)] 3xl:rounded-t-2xl 3xl:rounded-b-none 3xl:border-b-0 3xl:border-gray-200 3xl:bg-gray-50"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onClose();
                }
              }}
            >
              <div tabIndex={0} />
              {children}
            </div>
          </div>
        </FocusScope>
      </LayoutOutlet>
    </ComplementaryContext.Provider>
  );
}

export function ComplementaryClose({ children }: PropsWithChildren) {
  const { onClose } = use(ComplementaryContext);
  return (
    <ButtonContext.Provider value={{ onPress: onClose }}>
      {children}
    </ButtonContext.Provider>
  );
}

export function ComplementaryHeader({ children }: PropsWithChildren) {
  const { headerElement } = use(ComplementaryContext);

  if (headerElement) {
    return createPortal(children, headerElement);
  }
  return null;
}

export function useParamValue() {
  const { paramValue } = use(ComplementaryContext);

  return paramValue;
}
