import { ComponentProps, useContext } from 'react';
import { OverlayTriggerStateContext } from 'react-aria-components';
import { Pressable, PressResponder } from '@react-aria/interactions';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DialogCLoseProps {
  children: ComponentProps<typeof Pressable>['children'];
}

export function DialogClose({ children }: DialogCLoseProps) {
  const state = useContext(OverlayTriggerStateContext);
  return (
    <PressResponder
      onPress={() => {
        state.close();
      }}
    >
      {children}
    </PressResponder>
  );
}
