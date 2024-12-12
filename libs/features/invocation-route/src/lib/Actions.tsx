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

export function Actions({ invocation }: { invocation?: Invocation }) {
  if (!invocation) {
    return null;
  }
  const isCompleted = Boolean(invocation.completion_result);

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="icon">
          <Icon name={IconName.Ellipsis} className="w-4 h-4" />
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
  );
}
