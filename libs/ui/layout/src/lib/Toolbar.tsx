import { PropsWithChildren } from 'react';

interface ToolbarProps {
  id?: string;
}

export function Toolbar(props: PropsWithChildren<ToolbarProps>) {
  return (
    <div className="sticky bottom-0 z-10 hidden min-h-20 max-w-full items-center justify-center bg-linear-to-b from-transparent to-canvas/80 [&:has(>*>*)]:flex [body:has([data-content-panel-fill-viewport])_&]:-mt-20">
      <div
        {...props}
        className="mb-4 max-w-[calc(100%-1.5rem)] rounded-xl border-inverse bg-linear-to-b from-inverse/90 to-inverse/80 px-0 py-0 text-inverse-secondary shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-edge/40%)] filter-[drop-shadow(0_8px_6px_--theme(--box-shadow-color-default/15%))_drop-shadow(0_4px_3px_--theme(--box-shadow-color-default/20%))] backdrop-blur-xl *:max-w-full md:max-w-[calc(100%-6rem)]"
      />
    </div>
  );
}
