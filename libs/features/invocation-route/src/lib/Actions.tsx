import { Invocation } from '@restate/data-access/admin-api';
import { DropdownItem } from '@restate/ui/dropdown';
import {
  CANCEL_INVOCATION_QUERY_PARAM,
  KILL_INVOCATION_QUERY_PARAM,
  PURGE_INVOCATION_QUERY_PARAM,
  RESTART_AS_NEW_INVOCATION_QUERY_PARAM,
} from './constants';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';
import { SplitButton } from '@restate/ui/split-button';
import { useRestateContext } from '@restate/features/restate-context';

const mainButtonStyles = tv({
  base: 'translate-x-px rounded-l-md rounded-r-none px-2 py-0.5 [font-size:inherit] [line-height:inherit]',
  variants: {
    mini: {
      true: 'invisible absolute right-full z-2 drop-shadow-[-20px_2px_4px_rgba(255,255,255,0.8)] group-hover:visible',
      false: '',
    },
    destructive: {
      true: 'text-red-500',
      false: 'text-blue-500',
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
  const { isVersionGte } = useRestateContext();
  if (!invocation) {
    return null;
  }
  const isCompleted = Boolean(invocation.completion_result);
  const isPaused = Boolean(invocation.status === 'paused');
  const isNotWorkflow = invocation.target_service_ty !== 'workflow';
  const isRestateAsNewSupported = Boolean(
    isVersionGte?.('1.5.0') &&
      invocation.journal_size &&
      isNotWorkflow &&
      isCompleted,
  );

  return (
    <SplitButton
      mini={mini}
      className={className}
      menus={
        <>
          {isPaused && (
            <DropdownItem
              href={`?${RESTART_AS_NEW_INVOCATION_QUERY_PARAM}=${invocation.id}`}
            >
              Resume…
            </DropdownItem>
          )}
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
          {isRestateAsNewSupported && (
            <DropdownItem
              href={`?${RESTART_AS_NEW_INVOCATION_QUERY_PARAM}=${invocation.id}`}
            >
              Restart as new…
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
          isRestateAsNewSupported
            ? `?${RESTART_AS_NEW_INVOCATION_QUERY_PARAM}=${invocation.id}`
            : isCompleted
              ? `?${PURGE_INVOCATION_QUERY_PARAM}=${invocation.id}`
              : `?${CANCEL_INVOCATION_QUERY_PARAM}=${invocation.id}`
        }
        className={mainButtonStyles({
          mini,
          destructive: !isRestateAsNewSupported && !isPaused,
        })}
      >
        {isPaused
          ? 'Resume…'
          : isRestateAsNewSupported
            ? 'Restart as new…'
            : isCompleted
              ? 'Delete…'
              : 'Cancel…'}
      </Link>
    </SplitButton>
  );
}
