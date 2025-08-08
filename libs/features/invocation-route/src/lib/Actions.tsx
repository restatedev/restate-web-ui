import { Invocation } from '@restate/data-access/admin-api';
import { DropdownItem } from '@restate/ui/dropdown';
import {
  CANCEL_INVOCATION_QUERY_PARAM,
  KILL_INVOCATION_QUERY_PARAM,
  PURGE_INVOCATION_QUERY_PARAM,
} from './constants';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';
import { SplitButton } from '@restate/ui/split-button';

const mainButtonStyles = tv({
  base: 'translate-x-px rounded-l-md rounded-r-none px-2 py-0.5 [font-size:inherit] [line-height:inherit] text-red-500',
  variants: {
    mini: {
      true: 'invisible absolute right-full z-2 drop-shadow-[-20px_2px_4px_rgba(255,255,255,0.8)] group-hover:visible',
      false: '',
    },
  },
});

export function Actions({
  invocation,
  mini = true,
  className,
}: {
  invocation?: Invocation;
  mini?: boolean;
  className?: string;
}) {
  if (!invocation) {
    return null;
  }
  const isCompleted = Boolean(invocation.completion_result);

  return (
    <SplitButton
      mini={mini}
      className={className}
      menus={
        <>
          {!isCompleted && (
            <DropdownItem
              destructive
              href={`?${CANCEL_INVOCATION_QUERY_PARAM}=${invocation.id}`}
            >
              Cancel…
            </DropdownItem>
          )}
          {!isCompleted && (
            <DropdownItem
              destructive
              href={`?${KILL_INVOCATION_QUERY_PARAM}=${invocation.id}`}
            >
              Kill…
            </DropdownItem>
          )}
          {isCompleted && (
            <DropdownItem
              destructive
              href={`?${PURGE_INVOCATION_QUERY_PARAM}=${invocation.id}`}
            >
              Delete…
            </DropdownItem>
          )}
        </>
      }
    >
      <Link
        variant="secondary-button"
        href={
          isCompleted
            ? `?${PURGE_INVOCATION_QUERY_PARAM}=${invocation.id}`
            : `?${CANCEL_INVOCATION_QUERY_PARAM}=${invocation.id}`
        }
        className={mainButtonStyles({ mini })}
      >
        {isCompleted ? 'Delete…' : 'Cancel…'}
      </Link>
    </SplitButton>
  );
}
