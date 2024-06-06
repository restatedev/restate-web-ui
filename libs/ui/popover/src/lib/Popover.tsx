import type { ReactNode } from 'react';
import { DialogTrigger } from 'react-aria-components';

export function Popover(props: { children: ReactNode }) {
  return <DialogTrigger {...props} />;
}
