import { Icon, type IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import type {
  ComponentPropsWithoutRef,
  PropsWithChildren,
  ReactNode,
} from 'react';

const styles = tv({
  slots: {
    root: 'flex w-full flex-col gap-2.5 px-6 pt-8 pb-6',
    heading: 'flex items-center',
    title:
      'inline-flex h-8 items-center gap-1.5 rounded-[0.625rem] bg-blue-50/90 px-2.5 text-sm font-semibold tracking-[-0.01em] text-blue-900/75 shadow-xs ring-1 ring-blue-200/60',
    icon: 'h-4 w-4 text-blue-600/90',
    description: 'max-w-[68ch] text-sm leading-6 text-zinc-500',
  },
});

interface ListPageHeaderProps extends Omit<
  ComponentPropsWithoutRef<'section'>,
  'title'
> {
  icon: IconName;
  title: ReactNode;
}

export function ListPageHeader({
  icon,
  title: titleContent,
  children,
  className,
  ...props
}: PropsWithChildren<ListPageHeaderProps>) {
  const { root, heading, title, icon: iconStyles, description } = styles();

  return (
    <section {...props} className={root({ className })}>
      <h1 className={heading()}>
        <span className={title()}>
          <Icon name={icon} className={iconStyles()} />
          {titleContent}
        </span>
      </h1>
      <p className={description()}>{children}</p>
    </section>
  );
}
