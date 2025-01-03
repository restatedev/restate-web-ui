import { PropsWithChildren } from 'react';

interface ToolbarProps {
  id?: string;
}

export function Toolbar(props: PropsWithChildren<ToolbarProps>) {
  return (
    <div className="hidden [&:has(>*>*)]:block z-0 h-20 fixed left-0 right-0 bottom-0 bg-gradient-to-b from-transparent to-gray-100">
      <div {...props} />
    </div>
  );
}
