import { PropsWithChildren, useContext } from 'react';
import { useHover } from 'react-aria';
import {
  RadioContext,
  TooltipTriggerStateContext,
} from 'react-aria-components';

export function RadioTooltipTrigger({ children }: PropsWithChildren) {
  const state = useContext(TooltipTriggerStateContext);
  const {
    hoverProps: {
      onPointerEnter,
      onPointerLeave,
      onMouseEnter,
      onMouseLeave,
      onTouchStart,
    },
  } = useHover({
    onHoverChange(isHovering) {
      if (isHovering) {
        state?.open(false);
      } else {
        state?.close();
      }
    },
  });

  return (
    <RadioContext.Provider
      value={{
        onPointerEnter,
        onPointerLeave,
        onMouseEnter,
        onMouseLeave,
        onTouchStart,
      }}
    >
      {children}
    </RadioContext.Provider>
  );
}
