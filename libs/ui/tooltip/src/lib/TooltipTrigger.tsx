import { ComponentProps, useContext, type PropsWithChildren } from 'react';
import { Pressable, PressResponder, useHover } from '@react-aria/interactions';
import { TooltipTriggerStateContext } from 'react-aria-components';

type TooltipTriggerProps = Pick<ComponentProps<typeof Pressable>, 'children'>;
export function TooltipTrigger({
  children,
}: PropsWithChildren<TooltipTriggerProps>) {
  const state = useContext(TooltipTriggerStateContext);
  const { hoverProps } = useHover({
    onHoverChange(isHovering) {
      isHovering ? state.open(true) : state.close();
    },
  });
  return (
    <PressResponder
      onPress={() => {
        state.open();
      }}
      {...hoverProps}
    >
      {children}
    </PressResponder>
  );
}
