import { type PropsWithChildren, type ReactNode } from 'react';
import {
  Header,
  ListBoxSection as Section,
  ListBoxItem,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';

export interface ListBoxSectionProps extends PropsWithChildren<object> {
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
}

const styles = tv({
  slots: {
    container:
      'relative mt-8 rounded-xl border bg-white px-1 py-1 [&_.dropdown-item]:rounded-lg',
    header:
      'absolute -top-8 w-full truncate px-2 py-1 pt-2 text-sm font-semibold text-gray-400',
    description: 'px-2 py-1 text-xs text-gray-400',
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
      <Section>
        {description && (
          <Header className={descriptionStyles()} slot="description">
            {description}
          </Header>
        )}
        <ListBoxItem isDisabled />
      </Section>
    </>
  );
}
