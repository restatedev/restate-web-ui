import { PropsWithChildren, useContext } from 'react';
import {
  ButtonContext,
  OverlayTriggerStateContext,
} from 'react-aria-components';

export function DialogClose({ children }: PropsWithChildren) {
  const state = useContext(OverlayTriggerStateContext);
  return (
    <ButtonContext.Provider
      value={{
        onPress: () => {
          state?.close();
        },
      }}
    >
      {children}
    </ButtonContext.Provider>
  );
}
