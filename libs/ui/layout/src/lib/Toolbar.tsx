import { PropsWithChildren } from 'react';

interface ToolbarProps {
  id?: string;
}

export function Toolbar(props: PropsWithChildren<ToolbarProps>) {
  return (
    <div className="sticky bottom-0 z-10 hidden min-h-20 max-w-full items-center justify-center bg-linear-to-b from-transparent to-gray-100/80 [&:has(>*>*)]:flex">
      <div
        {...props}
        className="mb-4 max-w-[calc(100%-6rem)] rounded-xl border-zinc-900/80 bg-linear-to-b from-zinc-900/90 to-zinc-900/80 px-0 py-0 text-zinc-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)] filter-[drop-shadow(0_8px_6px_rgb(39_39_42/0.15))_drop-shadow(0_4px_3px_rgb(39_39_42/0.2))] backdrop-blur-xl *:max-w-full"
      />
    </div>
  );
}
