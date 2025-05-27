import { createContext, PropsWithChildren, use } from 'react';

const InvocationPageContext = createContext({ isInInvocationPage: false });

export function InvocationPageProvider({
  isInInvocationPage,
  children,
}: PropsWithChildren<{ isInInvocationPage: boolean }>) {
  return (
    <InvocationPageContext.Provider value={{ isInInvocationPage }}>
      {children}
    </InvocationPageContext.Provider>
  );
}

export function useIsInInvocationPage() {
  const { isInInvocationPage } = use(InvocationPageContext);
  return isInInvocationPage;
}
