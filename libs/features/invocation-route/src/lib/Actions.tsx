import { Invocation } from '@restate/data-access/admin-api';
import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import {
  CANCEL_INVOCATION_QUERY_PARAM,
  KILL_INVOCATION_QUERY_PARAM,
  PURGE_INVOCATION_QUERY_PARAM,
} from './constants';
import { Button } from '@restate/ui/button';
import { Link } from '@restate/ui/link';
import { tv } from 'tailwind-variants';

const menuTriggerStyles = tv({
  base: 'group-focus-within:z-[2] rounded-l-md px-1 py-1 [font-size:inherit] [line-height:inherit] rounded-r-md text-red-500',
  variants: {
    mini: {
      false: 'rounded-l-none',
      true: 'group-hover:rounded-l-none',
    },
  },
});
const mainButtonStyles = tv({
  base: 'rounded-r-none px-2 py-0.5 translate-x-px [font-size:inherit] [line-height:inherit] rounded-l-md text-red-500',
  variants: {
    mini: {
      true: 'absolute invisible drop-shadow-[-20px_2px_4px_rgba(255,255,255,0.8)] group-hover:visible right-full z-[2] ',
      false: '',
    },
  },
});

const styles = tv({
  base: 'flex items-stretch relative overflow-visible group text-xs',
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
    <div className={styles({ className })}>
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
      <Dropdown>
        <DropdownTrigger>
          <Button variant="secondary" className={menuTriggerStyles({ mini })}>
            <Icon name={IconName.ChevronsUpDown} className="w-[1em] h-[1em]" />
          </Button>
        </DropdownTrigger>
        <DropdownPopover>
          <DropdownSection title="Actions">
            <DropdownMenu>
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
            </DropdownMenu>
          </DropdownSection>
        </DropdownPopover>
      </Dropdown>
    </div>
  );
}
