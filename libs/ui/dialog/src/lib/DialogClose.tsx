import { PropsWithChildren, useContext } from 'react';
import { OverlayTriggerStateContext, Button } from 'react-aria-components';
import { PressResponder } from '@react-aria/interactions';

interface DialogCLoseProps {}

export function DialogClose({ children }: PropsWithChildren<DialogCLoseProps>) {
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
