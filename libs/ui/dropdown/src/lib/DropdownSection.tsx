import { PropsWithChildren, ReactNode } from 'react';
import { Header } from 'react-aria-components';
import { tv } from 'tailwind-variants';

export interface DropdownSectionProps extends PropsWithChildren<object> {
  title?: ReactNode;
  className?: string;
}

const styles = tv({
  slots: {
    container: 'px-1',
    header: 'truncate px-4 py-1 pt-2 text-sm font-semibold text-gray-500',
    menu: 'rounded-xl border bg-white last:mb-1 [&_.dropdown-item]:rounded-lg [&:not(:has(*))]:hidden',
  },
});
export function DropdownSection({
  children,
  title,
  className,
}: DropdownSectionProps) {
  const { container, menu, header } = styles();
  // TODO: fix accessibility of header and section
  return (
    <div className={container()}>
      {title && <Header className={header()}>{title}</Header>}
      <div className={menu({ className })}>{children}</div>
    </div>
  );
}
