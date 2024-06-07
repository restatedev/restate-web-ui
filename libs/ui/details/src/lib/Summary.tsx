import { PropsWithChildren } from 'react';
import { useSummaryElement } from './DetailsContext';
import { createPortal } from 'react-dom';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SummaryProps {}

export function Summary({ children }: PropsWithChildren<SummaryProps>) {
  const element = useSummaryElement();
  return element ? createPortal(children, element) : null;
}
