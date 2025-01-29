import {
  ComponentProps,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { LayoutOutlet } from './Layout';
import { LayoutZone } from './LayoutZone';
import { useSearchParams } from 'react-router';
import { Pressable, PressResponder } from '@react-aria/interactions';
import { FocusScope } from 'react-aria';

interface ComplementaryProps {
  footer?: ReactNode;
  onClose?: VoidFunction;
  isOnTop?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
const ComplementaryContext = createContext({ onClose: noop });

export function Complementary({
  children,
  footer,
  onClose = noop,
  isOnTop = false,
}: PropsWithChildren<ComplementaryProps>) {
  if (!children) {
    return null;
  }

  return (
    <ComplementaryContext.Provider value={{ onClose }}>
      <LayoutOutlet zone={LayoutZone.Complementary}>
        <div
          data-top={isOnTop}
          className="[&[data-top=false]]:overflow-hidden duration-250 [&[data-top=true]]:z-[1] [&[data-top=true]]:order-1 transition-all min-h-0 min-w-0 p-1.5 border shadow-lg 3xl:shadow-sm shadow-zinc-800/5 bg-gray-50/80 backdrop-blur-xl backdrop-saturate-200 rounded-[1.125rem] max-h-[inherit] flex flex-col w-full"
        >
          <FocusScope restoreFocus autoFocus>
            <div
              data-complementary-content
              className="[content-visibility:auto] overflow-y-auto bg-white p-3 pt-7 border rounded-xl flex-auto flex flex-col min-h-[50vh] overflow-auto relative max-h-[inherit]"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onClose?.();
                }
              }}
            >
              <div tabIndex={0} />
              {children}
            </div>
            {footer && (
              <div className="flex gap-2 has-[*]:py-1 has-[*]:pb-0 has-[*]:mt-1 [&>*]:min-w-0 3xl:sticky 3xl:bottom-0 3xl:bg-gray-50/80 3xl:backdrop-blur-xl 3xl:backdrop-saturate-200 rounded-[1rem] 3xl:-mx-1.5 3xl:-mb-1.5 3xl:p-1.5 3xl:pb-1.5 z-10">
                {footer}
              </div>
            )}
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
  footer,
  paramName,
}: PropsWithChildren<
  Pick<ComplementaryProps, 'footer'> & {
    paramName: string;
  }
>) {
  const [searchParams] = useSearchParams();
  const paramValues = searchParams.getAll(paramName);

  return (
    <>
      {paramValues.map((paramValue) => (
        <ComplementaryWithSearchParamValue
          children={children}
          footer={footer}
          key={paramValue}
          paramName={paramName}
          paramValue={paramValue}
        />
      ))}
    </>
  );
}

function ComplementaryWithSearchParamValue({
  children,
  footer,
  paramName,
  paramValue,
}: PropsWithChildren<
  Pick<ComplementaryProps, 'footer'> & {
    paramName: string;
    paramValue: string;
  }
>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const renderedChildren = useMemo(() => {
    if (!paramValue) {
      return null;
    }
    return children;
  }, [children, paramValue]);

  const onClose = useCallback(() => {
    setSearchParams(
      (prev) => {
        return new URLSearchParams(
          prev.toString().replace(`${paramName}=${paramValue}`, '')
        );
      },
      { preventScrollReset: true }
    );
  }, [paramName, paramValue, setSearchParams]);
  const isOnTop = searchParams
    .toString()
    .startsWith(`${paramName}=${paramValue}`);

  return (
    <Complementary
      children={renderedChildren}
      footer={footer}
      onClose={onClose}
      isOnTop={isOnTop}
    />
  );
}

export function useActiveSidebarParam(paramName: string) {
  const [searchParams] = useSearchParams();

  if (searchParams.toString().startsWith(paramName)) {
    return searchParams.get(paramName) as string;
  } else {
    return undefined;
  }
}
