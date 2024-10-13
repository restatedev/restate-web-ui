import { PropsWithChildren, createContext, useContext } from 'react';

const DetailsContext = createContext({ id: '' });

export function DetailsProvider({
  id,
  children,
}: PropsWithChildren<{ id: string }>) {
  return (
    <DetailsContext.Provider value={{ id }}>{children}</DetailsContext.Provider>
  );
}

export function useSummaryElement() {
  const { id } = useContext(DetailsContext);
  const element = document.getElementById(id);
  return element;
}
