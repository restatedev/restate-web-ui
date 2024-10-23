import { ComponentProps, useContext, type PropsWithChildren } from 'react';
import { Pressable, PressResponder } from '@react-aria/interactions';
import { TooltipTriggerStateContext } from 'react-aria-components';

type TooltipTriggerProps = Pick<ComponentProps<typeof Pressable>, 'children'>;
export function TooltipTrigger({
  children,
}: PropsWithChildren<TooltipTriggerProps>) {
  const state = useContext(TooltipTriggerStateContext);

  return (
    <PressResponder
      onPress={() => {
        state.open();
      }}
    >
      {children}
    </PressResponder>
  );
}
