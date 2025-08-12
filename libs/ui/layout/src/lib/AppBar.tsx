import { PropsWithChildren } from 'react';
import { ZONE_IDS, LayoutZone } from './LayoutZone';

interface AppBarProps {
  id?: string;
}

export function AppBar(props: PropsWithChildren<AppBarProps>) {
  return (
    <header
      className={`[&:has([data-variant="secondary"])]:backdrop-blur-0 invisible sticky top-3 z-100 flex flex-none items-stretch justify-between gap-4 rounded-xl border bg-gray-50/80 shadow-lg shadow-zinc-800/5 backdrop-blur-xl backdrop-saturate-200 duration-300 sm:top-6 [&:has(>*>*)]:visible [&:has(>*>*)]:animate-in [&:has(>*>*)]:slide-in-from-top [&:has([data-variant="hidden"])]:invisible [&:has([data-variant="secondary"])]:border-none [&:has([data-variant="secondary"])]:bg-transparent [&:has([data-variant="secondary"])]:shadow-none`}
    >
      <div {...props} className="-m-px flex min-w-0 flex-auto items-stretch" />
      <nav
        className="ml-auto flex items-center gap-2 pr-4"
        id={ZONE_IDS[LayoutZone.Nav]}
      />
    </header>
  );
}
