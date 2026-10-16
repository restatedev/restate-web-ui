import { PropsWithChildren, createContext } from 'react';

const DetailsContext = createContext({ id: '' });

export function DetailsProvider({
  id,
  children,
}: PropsWithChildren<{ id: string }>) {
  return (
    <DetailsContext.Provider value={{ id }}>{children}</DetailsContext.Provider>
  );
}
