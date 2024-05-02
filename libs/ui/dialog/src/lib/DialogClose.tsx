import { PropsWithChildren, useContext } from 'react';
import { OverlayTriggerStateContext } from 'react-aria-components';
import { PressResponder } from '@react-aria/interactions';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
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
