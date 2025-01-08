import { PropsWithChildren } from 'react';

interface ToolbarProps {
  id?: string;
}

export function Toolbar(props: PropsWithChildren<ToolbarProps>) {
  return (
    <div className="hidden [&:has(>*>*)]:flex z-0 h-20 sticky items-center justify-center left2-0 right2-0 bottom-0 bg-gradient-to-b from-transparent to-gray-100">
      <div
        {...props}
        className="backdrop-blur-xl text-zinc-200 border-zinc-900/80 bg-gradient-to-b from-zinc-900/90 to-zinc-900/80 px-0 py-0 rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)] [filter:drop-shadow(0_8px_6px_rgb(39_39_42/0.15))_drop-shadow(0_4px_3px_rgb(39_39_42/0.2))]"
      />
    </div>
  );
}
