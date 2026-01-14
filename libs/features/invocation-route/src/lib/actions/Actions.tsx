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
import { PauseInvocation } from './PauseInvocation';
import { ActionText } from '@restate/ui/action-text';
import { withConfirmation } from '@restate/ui/dialog';
import { RestartWorkflow } from './RestartWorkflow';

interface ActionConfig {
  key: string;
  condition: (
    invocation: Invocation,
    isVersionGte?: (version: string) => boolean,
  ) => boolean;
  component: ReturnType<typeof withConfirmation>;
  icon: IconName;
  label: string;
  destructive: boolean;
  isPrimary?: (
    invocation: Invocation,
    isVersionGte?: (version: string) => boolean,
  ) => boolean;
  minVersion?: string;
}

export const isRestateAsNewSupported = (invocation: Invocation) => {
  const isCompleted = Boolean(invocation.completion_result);
  const isNotWorkflow = invocation.target_service_ty !== 'workflow';
  return Boolean(invocation.journal_size && isNotWorkflow && isCompleted);
};

export const isRestateAsNewWorkflowSupported = (invocation: Invocation) => {
  const isCompleted = Boolean(invocation.completion_result);
  const isWorkflow = invocation.target_service_ty === 'workflow';
  return Boolean(invocation.journal_size && isWorkflow && isCompleted);
};

const ACTION_CONFIGS: ActionConfig[] = [
  {
    key: 'resume',
    condition: (invocation) => invocation.status === 'paused',
    component: ResumeInvocation,
    icon: IconName.Resume,
    label: 'Resume',
    destructive: false,
    isPrimary: (invocation) => invocation.status === 'paused',
  },
  {
    key: 'retryNow',
    condition: (invocation) => invocation.status === 'backing-off',
    component: RetryNowInvocation,
    icon: IconName.RetryNow,
    label: 'Retry now',
    destructive: false,
  },
  {
    key: 'cancel',
    condition: (invocation) => !invocation.completion_result,
    component: CancelInvocation,
    icon: IconName.Cancel,
    label: 'Cancel',
    destructive: true,
    isPrimary: (invocation) => {
      const isCompleted = Boolean(invocation.completion_result);
      const isPaused = invocation.status === 'paused';
      return !isPaused && !isRestateAsNewSupported(invocation) && !isCompleted;
    },
  },
  {
    key: 'pause',
    condition: (invocation) =>
      !invocation.completion_result &&
      !['paused', 'ready', 'pending', 'suspended', 'scheduled'].includes(
        invocation.status,
      ),
    component: PauseInvocation,
    icon: IconName.Pause,
    label: 'Pause',
    destructive: true,
    minVersion: '1.6.0',
  },
  {
    key: 'kill',
    condition: (invocation) => !invocation.completion_result,
    component: KillInvocation,
    icon: IconName.Kill,
    label: 'Kill',
    destructive: true,
  },
  {
    key: 'restart',
    condition: (invocation) => {
      return isRestateAsNewSupported(invocation);
    },
    component: RestartInvocation,
    icon: IconName.Restart,
    label: 'Restart as new',
    destructive: false,
    isPrimary: (invocation) => {
      return isRestateAsNewSupported(invocation);
    },
  },
  {
    key: 'restart-workflow',
    condition: (invocation) => {
      return isRestateAsNewWorkflowSupported(invocation);
    },
    component: RestartWorkflow,
    icon: IconName.Restart,
    label: 'Restart as new',
    destructive: false,
    isPrimary: (invocation) => {
      return isRestateAsNewWorkflowSupported(invocation);
    },
  },
  {
    key: 'purge',
    condition: (invocation) => Boolean(invocation.completion_result),
    component: PurgeInvocation,
    icon: IconName.Trash,
    label: 'Purge',
    destructive: true,
    isPrimary: (invocation) => {
      const isCompleted = Boolean(invocation.completion_result);
      const isPaused = invocation.status === 'paused';
      return isCompleted && !isRestateAsNewSupported(invocation) && !isPaused;
    },
  },
];

const mainButtonStyles = tv({
  base: 'flex translate-x-px items-center gap-1 rounded-l-md rounded-r-none px-2 py-0.5 [font-size:inherit] [line-height:inherit] whitespace-nowrap',
  variants: {
    mini: {
      true: 'invisible absolute right-full z-2 drop-shadow-[-20px_2px_4px_--theme(--color-gray-100/0.5)] group-hover:visible',
      false: '',
    },
    destructive: {
      true: 'text-red-500',
      false: 'text-blue-700',
    },
  },
});

function getAvailableActions(
  invocation: Invocation,
  isVersionGte?: (version: string) => boolean,
): ActionConfig[] {
  return ACTION_CONFIGS.filter((config) =>
    config.condition(invocation, isVersionGte),
  );
}

function getPrimaryAction(
  invocation: Invocation,
  isVersionGte?: (version: string) => boolean,
): ActionConfig | undefined {
  return ACTION_CONFIGS.find((config) =>
    config.isPrimary?.(invocation, isVersionGte),
  );
}

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

  const availableActions = getAvailableActions(invocation, isVersionGte);
  const primaryAction = getPrimaryAction(invocation, isVersionGte);

  const renderDropdownItem = (config: ActionConfig) => {
    const item = (
      <config.component.Trigger
        formData={config.component.getFormData(invocation.id)}
      >
        <DropdownItem key={config.key} destructive={config.destructive}>
          <Icon
            name={config.icon}
            className="h-3.5 w-3.5 shrink-0 opacity-80"
          />
          <ActionText hasFollowup={config.component.hasFollowup()}>
            {config.label}
          </ActionText>
        </DropdownItem>
      </config.component.Trigger>
    );
    return config.minVersion ? (
      <RestateMinimumVersion minVersion={config.minVersion}>
        {item}
      </RestateMinimumVersion>
    ) : (
      item
    );
  };

  return (
    <SplitButton
      mini={mini}
      className={className}
      menus={availableActions.map(renderDropdownItem)}
    >
      {primaryAction && (
        <primaryAction.component.Trigger
          formData={primaryAction.component.getFormData(invocation.id)}
        >
          <Link
            variant="secondary-button"
            className={mainButtonStyles({
              mini,
              destructive: primaryAction.destructive,
            })}
          >
            <Icon
              name={primaryAction.icon}
              className="h-[0.9em] w-[0.9em] shrink-0 opacity-80"
            />
            <ActionText hasFollowup={primaryAction.component.hasFollowup()}>
              {primaryAction.label}
            </ActionText>
          </Link>
        </primaryAction.component.Trigger>
      )}
    </SplitButton>
  );
}
