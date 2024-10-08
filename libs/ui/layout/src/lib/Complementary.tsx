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
          className="min-h-[50vh] bg-white p-6 border rounded-xl max-h-[inherit] overflow-auto relative"
        >
          {children}
        </div>
        {footer && (
          <div className="flex gap-2 has-[*]:py-1 has-[*]:pb-0 has-[*]:mt-1">
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
}: Pick<ComplementaryProps, 'footer'> & {
  paramName: string;
  children: (args: { paramValue: string }) => ReactNode;
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const paramValue = searchParams.get(paramName);
  const renderedChildren = useMemo(() => {
    if (!paramValue) {
      return null;
    }
    return children({ paramValue });
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
