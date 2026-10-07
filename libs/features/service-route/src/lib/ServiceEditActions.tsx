import {
  SERVICE_ACCESS_EDIT,
  SERVICE_RETENTION_EDIT,
  SERVICE_TIMEOUT_EDIT,
} from '@restate/features/service-details';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import { useSearchParams } from 'react-router';

const EDIT_ACTIONS = [
  { key: SERVICE_ACCESS_EDIT, label: 'Access…', icon: IconName.ShieldCheck },
  { key: SERVICE_RETENTION_EDIT, label: 'Retention…', icon: IconName.History },
  { key: SERVICE_TIMEOUT_EDIT, label: 'Timeouts…', icon: IconName.Timer },
];

const styles = tv({
  slots: {
    trigger:
      'flex items-center gap-1 rounded-lg px-2 py-0.5 text-[0.9375rem] text-blue-700 disabled:text-gray-400',
    label: 'max-md:hidden',
    chevron: 'h-[1em] w-[1em] shrink-0 text-gray-500',
  },
});

const DISABLED_REASON =
  'Configuration can only be edited at the service level. Deselect the handler to edit the service configuration.';

export function ServiceEditActions({
  service,
  isReadonly,
}: {
  service: string;
  isReadonly: boolean;
}) {
  const [, setSearchParams] = useSearchParams();
  const s = styles();
  const trigger = (
    <Button
      variant="secondary"
      className={s.trigger()}
      disabled={isReadonly}
      aria-label="Edit configuration"
    >
      <span className={s.label()}>Edit</span>
      <Icon name={IconName.ChevronsUpDown} className={s.chevron()} />
    </Button>
  );

  if (isReadonly) {
    return (
      <HoverTooltip
        content={DISABLED_REASON}
        contentClassName="max-w-56 break-normal"
      >
        {trigger}
      </HoverTooltip>
    );
  }

  return (
    <Dropdown>
      <DropdownTrigger>{trigger}</DropdownTrigger>
      <DropdownPopover placement="bottom end">
        <DropdownSection title="Edit configuration">
          <DropdownMenu
            onSelect={(key) =>
              setSearchParams(
                (old) => {
                  old.set(key, service);
                  return old;
                },
                { preventScrollReset: true },
              )
            }
          >
            {EDIT_ACTIONS.map((action) => (
              <DropdownItem key={action.key} value={action.key}>
                <Icon
                  name={action.icon}
                  className="h-3.5 w-3.5 shrink-0 opacity-80"
                />
                {action.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
