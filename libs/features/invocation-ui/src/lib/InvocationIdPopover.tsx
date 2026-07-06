import {
  ComponentType,
  createContext,
  PropsWithChildren,
  useContext,
} from 'react';

const InvocationIdPopoverContext = createContext<
  ComponentType<{ id: string }> | undefined
>(undefined);

export function InvocationIdPopoverProvider({
  Content,
  children,
}: PropsWithChildren<{ Content: ComponentType<{ id: string }> }>) {
  return (
    <InvocationIdPopoverContext.Provider value={Content}>
      {children}
    </InvocationIdPopoverContext.Provider>
  );
}

export function useInvocationIdPopoverContent() {
  return useContext(InvocationIdPopoverContext);
}
