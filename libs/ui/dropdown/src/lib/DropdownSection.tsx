import { PropsWithChildren } from 'react';
import { Header } from 'react-aria-components';
import { tv } from 'tailwind-variants';

export interface DropdownSectionProps extends PropsWithChildren<object> {
  title?: string;
  className?: string;
}

const styles = tv({
  slots: {
    container: 'px-1',
    header: 'text-sm font-semibold text-gray-500 px-4 py-1 truncate',
    menu: 'bg-white rounded-xl border',
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
