import type { PropsWithChildren } from 'react';
import { Header, Section } from 'react-aria-components';
import { tv } from 'tailwind-variants';

export interface ListBoxSectionProps extends PropsWithChildren<object> {
  title?: string;
  className?: string;
}

const styles = tv({
  slots: {
    container:
      'px-1 py-1 bg-white relative mt-8 rounded-xl border [&_.dropdown-item]:rounded-lg',
    header:
      'text-sm absolute -top-8 font-semibold text-gray-400 px-2 py-1 pt-2 truncate',
  },
});

export function ListBoxSection({
  children,
  title,
  className,
}: ListBoxSectionProps) {
  const { container, header } = styles();

  return (
    <Section className={container()}>
      {title && <Header className={header()}>{title}</Header>}
      {children}
    </Section>
  );
}
