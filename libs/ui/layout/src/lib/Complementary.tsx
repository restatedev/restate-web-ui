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
import { useSearchParams } from '@remix-run/react';
import { Pressable, PressResponder } from '@react-aria/interactions';

interface ComplementaryProps {
  footer?: ReactNode;
  onClose?: VoidFunction;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
const ComplementaryContext = createContext({ onClose: noop });

export function Complementary({
  children,
  footer,
  onClose = noop,
}: PropsWithChildren<ComplementaryProps>) {
  if (!children) {
    return null;
  }

  return (
    <ComplementaryContext.Provider value={{ onClose }}>
      <LayoutOutlet zone={LayoutZone.Complementary}>
        <div
          data-complementary-content
          className="overflow-y-auto min-h-[50vh] bg-white p-3 pt-7 border rounded-xl max-h-[inherit] overflow-auto relative flex-auto"
        >
          {children}
        </div>
        {footer && (
          <div className="flex gap-2 has-[*]:py-1 has-[*]:pb-0 has-[*]:mt-1 3xl:sticky 3xl:bottom-0 3xl:bg-gray-50/80 3xl:backdrop-blur-xl 3xl:backdrop-saturate-200 rounded-[1rem] 3xl:-mx-1.5 3xl:-mb-1.5 3xl:p-1.5 3xl:pb-1.5 z-10">
            {footer}
          </div>
        )}
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
  const [searchParams, setSearchParams] = useSearchParams();

  const paramValue = searchParams.get(paramName);
  const renderedChildren = useMemo(() => {
    if (!paramValue) {
      return null;
    }
    return children;
  }, [children, paramValue]);

  const onClose = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete(paramName);
      return prev;
    });
  }, [paramName, setSearchParams]);

  return (
    <Complementary
      children={renderedChildren}
      footer={footer}
      onClose={onClose}
    />
  );
}
