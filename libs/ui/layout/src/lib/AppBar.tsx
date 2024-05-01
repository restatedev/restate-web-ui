import { PropsWithChildren } from 'react';

interface AppBarProps {
  id?: string;
}

export function AppBar(props: PropsWithChildren<AppBarProps>) {
  return (
    <header
      className={
        '[&:has(.header:empty)]:hidden sticky top-3 sm:top-6 rounded-xl border z-40 flex flex-none flex-wrap items-stretch justify-between gap-4 backdrop-blur-xl backdrop-saturate-150 h-14 shadow-lg shadow-zinc-800/5 bg-gray-50/90'
      }
    >
      <div {...props} className="header m-[-1px] flex items-stretch"></div>
    </header>
  );
}
