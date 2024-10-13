import { useContext } from 'react';
import { OverlayTriggerStateContext } from 'react-aria-components';

export function usePopover() {
  const { open, close, isOpen, ...a } = useContext(OverlayTriggerStateContext);

  return { open, close, isOpen };
}
