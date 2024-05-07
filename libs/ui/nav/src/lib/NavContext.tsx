import { AriaAttributes, createContext } from 'react';

export const NavContext = createContext<{
  value: AriaAttributes['aria-current'];
}>({
  value: true,
});
