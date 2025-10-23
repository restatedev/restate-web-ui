import { Invocation } from '@restate/data-access/admin-api';
import { DropdownItem } from '@restate/ui/dropdown';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';
import { SplitButton } from '@restate/ui/split-button';
import { useRestateContext } from '@restate/features/restate-context';
import { RestateMinimumVersion } from '@restate/util/feature-flag';
import { Icon, IconName } from '@restate/ui/icons';
import { KillInvocation } from './KillInvocation';
import { CancelInvocation } from './CancelInvocation';
import { PurgeInvocation } from './PurgeInvocation';
import { RestartInvocation } from './RestartInvocation';
import { RetryNowInvocation } from './RetryNowInvocation';
import { ResumeInvocation } from './ResumeInvocation';

const mainButtonStyles = tv({
  base: 'flex translate-x-px items-center gap-1 rounded-l-md rounded-r-none px-2 py-0.5 [font-size:inherit] [line-height:inherit]',
  variants: {
    mini: {
      true: 'invisible absolute right-full z-2 drop-shadow-[-20px_2px_4px_rgba(255,255,255,0.8)] group-hover:visible',
      false: '',
    },
    destructive: {
      true: 'text-red-500',
      false: 'text-blue-700',
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
  const isBackingOff = Boolean(invocation.status === 'backing-off');
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
            <RestateMinimumVersion minVersion="1.4.5">
              <DropdownItem
                {...ResumeInvocation.getTriggerProps(invocation.id)}
              >
                <Icon
                  name={IconName.Resume}
                  className="h-3.5 w-3.5 opacity-80"
                />
                Resume…
              </DropdownItem>
            </RestateMinimumVersion>
          )}
          {isBackingOff && (
            <RestateMinimumVersion minVersion="1.4.5">
              <DropdownItem
                {...RetryNowInvocation.getTriggerProps(invocation.id)}
              >
                <Icon
                  name={IconName.RetryNow}
                  className="h-3.5 w-3.5 opacity-80"
                />
                Retry now…
              </DropdownItem>
            </RestateMinimumVersion>
          )}
          {!isCompleted && (
            <DropdownItem
              destructive
              {...CancelInvocation.getTriggerProps(invocation.id)}
            >
              <Icon name={IconName.Cancel} className="h-3.5 w-3.5 opacity-80" />
              Cancel…
            </DropdownItem>
          )}
          {!isCompleted && (
            <DropdownItem
              destructive
              {...KillInvocation.getTriggerProps(invocation.id)}
            >
              <Icon name={IconName.Kill} className="h-3.5 w-3.5 opacity-80" />
              Kill…
            </DropdownItem>
          )}
          {isRestateAsNewSupported && (
            <DropdownItem {...RestartInvocation.getTriggerProps(invocation.id)}>
              <Icon
                name={IconName.Restart}
                className="h-3.5 w-3.5 opacity-80"
              />
              Restart as new…
            </DropdownItem>
          )}
          {isCompleted && (
            <DropdownItem
              destructive
              {...PurgeInvocation.getTriggerProps(invocation.id)}
            >
              <Icon name={IconName.Trash} className="h-3.5 w-3.5 opacity-80" />
              Purge…
            </DropdownItem>
          )}
        </>
      }
    >
      <Link
        variant="secondary-button"
        {...(isPaused
          ? ResumeInvocation.getTriggerProps(invocation.id)
          : isRestateAsNewSupported
            ? RestartInvocation.getTriggerProps(invocation.id)
            : isCompleted
              ? PurgeInvocation.getTriggerProps(invocation.id)
              : CancelInvocation.getTriggerProps(invocation.id))}
        className={mainButtonStyles({
          mini,
          destructive: !isRestateAsNewSupported && !isPaused,
        })}
      >
        <Icon
          name={
            isPaused
              ? IconName.Resume
              : isRestateAsNewSupported
                ? IconName.Restart
                : isCompleted
                  ? IconName.Trash
                  : IconName.Cancel
          }
          className="h-[0.9em] w-[0.9em] opacity-80"
        />

        {isPaused
          ? 'Resume…'
          : isRestateAsNewSupported
            ? 'Restart as new…'
            : isCompleted
              ? 'Purge…'
              : 'Cancel…'}
      </Link>
    </SplitButton>
  );
}
