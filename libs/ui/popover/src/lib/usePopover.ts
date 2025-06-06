import { useContext } from 'react';
import { OverlayTriggerStateContext } from 'react-aria-components';

export function usePopover() {
  const { open, close, isOpen } = useContext(OverlayTriggerStateContext) ?? {};

  return { open, close, isOpen };
}
