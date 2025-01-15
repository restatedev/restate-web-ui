import { use, type PropsWithChildren, type ReactNode } from 'react';
import {
  Header,
  ListBoxContext,
  ListBoxSection as Section,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

export interface ListBoxSectionProps extends PropsWithChildren<object> {
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
}

const styles = tv({
  slots: {
    container:
      'px-1 py-1 bg-white relative mt-8 rounded-xl border [&_.dropdown-item]:rounded-lg',
    header:
      'text-sm absolute -top-8 font-semibold text-gray-400 px-2 py-1 pt-2 truncate w-full',
    description: 'text-xs text-gray-400 px-2 py-1',
  },
});

//TODO: fix descriptions
export function ListBoxSection({
  children,
  title,
  description,
  className,
}: ListBoxSectionProps) {
  const {
    container,
    header,
    description: descriptionStyles,
  } = styles({ className });

  return (
    <>
      <Section className={container()}>
        {title && (
          <Header className={header()} slot="title">
            {title}
          </Header>
        )}
        {children}
      </Section>
      {description && (
        <Header className={descriptionStyles()} slot="description">
          {description}
        </Header>
      )}
    </>
  );
}
