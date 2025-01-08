import { Button } from '@restate/ui/button';
import { focusRing } from '@restate/ui/focus';
import { Icon, IconName } from '@restate/ui/icons';
import {
  Tag as AriaTag,
  TagGroup as AriaTagGroup,
  TagGroupProps as AriaTagGroupProps,
  TagProps as AriaTagProps,
  composeRenderProps,
  TagList as RACTagList,
  TagListProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

export type TagGroupProps = AriaTagGroupProps;

export type TagProps = AriaTagProps;

const tagGroupStyles = tv({
  base: 'flex flex-col gap-1',
});
export function TagGroup({ children, className, ...props }: TagGroupProps) {
  return (
    <AriaTagGroup {...props} className={tagGroupStyles({ className })}>
      {children}
    </AriaTagGroup>
  );
}

const tagListStyles = tv({
  base: 'flex flex-wrap gap-1',
});
export function TagList<T extends object>({
  className,
  ...props
}: Omit<TagListProps<T>, 'className'> & { className?: string }) {
  return <RACTagList {...props} className={tagListStyles({ className })} />;
}

const tagStyles = tv({
  extend: focusRing,
  base: 'bg-white/90 border shadow-sm text-inherits flex max-w-fit cursor-default items-center gap-x-1 rounded-md pl-1.5 py-0.5 text-xs font-medium outline-0 transition ',
});
export function Tag({ children, ...props }: TagProps) {
  const textValue = typeof children === 'string' ? children : undefined;

  return (
    <AriaTag
      textValue={textValue}
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        tagStyles({ ...renderProps, className })
      )}
    >
      {(renderProps) => {
        return (
          <>
            {typeof children === 'function' ? children(renderProps) : children}
            {renderProps.allowsRemoving && (
              <Button slot="remove" variant="icon">
                <Icon name={IconName.X} className="w-3 h-3" />
              </Button>
            )}
          </>
        );
      }}
    </AriaTag>
  );
}
