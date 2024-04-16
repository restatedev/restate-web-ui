import type { PropsWithChildren } from 'react';
import { MenuTrigger as AriaMenuTrigger } from 'react-aria-components';

export function MenuTrigger(props: PropsWithChildren<{}>) {
  return <AriaMenuTrigger {...props} />;
}
