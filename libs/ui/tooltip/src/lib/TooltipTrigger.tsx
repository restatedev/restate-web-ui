import { ComponentProps, useContext, type PropsWithChildren } from 'react';
import { Pressable, useHover } from 'react-aria';
import { PressResponder } from 'react-aria/private/interactions/PressResponder';
import { TooltipTriggerStateContext } from 'react-aria-components';

type TooltipTriggerProps = Pick<ComponentProps<typeof Pressable>, 'children'>;
export function TooltipTrigger({
  children,
}: PropsWithChildren<TooltipTriggerProps>) {
  const state = useContext(TooltipTriggerStateContext);
  const { hoverProps } = useHover({
    onHoverChange(isHovering) {
      if (isHovering) {
        state?.open(false);
      } else {
        state?.close();
      }
    },
  });

  return (
    <PressResponder
      onPress={() => {
        state?.open();
      }}
      {...hoverProps}
    >
      {children}
    </PressResponder>
  );
}
