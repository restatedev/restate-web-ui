import { PropsWithChildren } from 'react';
import styles from './AppBar.module.css';
import { ZONE_IDS, LayoutZone } from './LayoutZone';

interface AppBarProps {
  id?: string;
}

export function AppBar(props: PropsWithChildren<AppBarProps>) {
  return (
    <header
      className={`${styles.header} [&:has(>*>*)]:animate-in [&:has(>*>*)]:slide-in-from-top duration-300 [&:has([data-variant="hidden"])]:invisible [&:has([data-variant="secondary"])]:shadow-none [&:has([data-variant="secondary"])]:border-none [&:has([data-variant="secondary"])]:bg-transparent [&:has([data-variant="secondary"])]:backdrop-blur-0 sticky top-3 sm:top-6 rounded-xl border z-40 flex flex-none flex-wrap items-stretch justify-between gap-4 backdrop-blur-xl backdrop-saturate-200 shadow-lg shadow-zinc-800/5 bg-gray-50/80`}
    >
      <div {...props} className="m-[-1px] flex items-stretch flex-1" />
      <nav
        className="ml-auto pr-4 flex gap-2 items-center"
        id={ZONE_IDS[LayoutZone.Nav]}
      />
    </header>
  );
}
