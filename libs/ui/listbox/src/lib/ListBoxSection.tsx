import type { PropsWithChildren } from 'react';
import { Header, Section } from 'react-aria-components';

export interface ListboxSectionProps {
  title?: string;
}

export function ListboxSection({
  children,
  title,
}: PropsWithChildren<ListboxSectionProps>) {
  return (
    <Section className="first:-mt-[5px] after:content-[''] after:block after:h-[5px]">
      <Header className="text-sm font-semibold text-gray-500 dark:text-zinc-300 px-4 py-1 truncate sticky -top-[5px] -mt-px -mx-1 z-10 bg-gray-100/60 dark:bg-zinc-700/60 backdrop-blur-md supports-[-moz-appearance:none]:bg-gray-100 border-y dark:border-y-zinc-700 [&+*]:mt-1">
        {title}
      </Header>
      {children}
    </Section>
  );
}
