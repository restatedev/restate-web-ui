import { PropsWithChildren, useContext } from 'react';
import {
  RadioContext,
  TooltipTriggerStateContext,
} from 'react-aria-components';

export function RadioTooltipTrigger({ children }: PropsWithChildren) {
  const state = useContext(TooltipTriggerStateContext);

  return (
    <RadioContext.Provider
      value={{
        onHoverChange(isHovering) {
          if (isHovering) {
            state?.open(false);
          } else {
            state?.close();
          }
        },
      }}
    >
      {children}
    </RadioContext.Provider>
  );
}
