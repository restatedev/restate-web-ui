import { Button } from '@restate/ui-button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui-dropdown';
import { Icon, IconName } from '@restate/ui-icons';
import { useMemo } from 'react';
import { useOverviewContext } from './OverviewContext';
import {
  getMetadataGroupKey,
  getMetadataKeys,
  metadataGroupBy,
  parseServiceGroupBy,
  useServiceGroupBy,
  type ServiceGroupBy,
} from './serviceGroups';

const BUILT_IN_LABELS: Partial<Record<ServiceGroupBy, string>> = {
  deployment: 'Deployment',
};

export function ServicesGroupBy() {
  const { servicesMap } = useOverviewContext();
  const [groupBy, setGroupBy] = useServiceGroupBy();
  const keys = useMemo(
    () => getMetadataKeys(servicesMap?.values() ?? []),
    [servicesMap],
  );
  const total = servicesMap?.size ?? 0;
  const activeLabel = getMetadataGroupKey(groupBy) ?? BUILT_IN_LABELS[groupBy];

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="flex h-6.5 shrink-0 items-center gap-1.5 rounded-lg py-0.5 pr-2 pl-1.5 text-sm"
        >
          <Icon
            name={IconName.Rows3}
            className="h-3.5 w-3.5 shrink-0 opacity-70"
          />
          <span className="max-sm:sr-only">
            {activeLabel ? (
              <>
                Group: <span className="font-medium">{activeLabel}</span>
              </>
            ) : (
              'Group'
            )}
          </span>
        </Button>
      </DropdownTrigger>
      <DropdownPopover placement="bottom end">
        <DropdownSection title="Group services by">
          <DropdownMenu
            selectable
            selectedItems={[groupBy]}
            onSelect={(key) => setGroupBy(parseServiceGroupBy(key))}
            aria-label="Group services by"
          >
            <DropdownItem value="none">None</DropdownItem>
            <DropdownItem value="deployment">Deployment</DropdownItem>
            {keys.map(({ key, count }) => (
              <DropdownItem key={key} value={metadataGroupBy(key)}>
                <span className="truncate">{key}</span>
                <span className="ml-auto pl-4 text-xs text-muted tabular-nums group-highlighted:text-inverse-secondary">
                  {count === total ? 'all' : `${count} of ${total}`}
                </span>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
        {keys.length === 0 && (
          <p className="max-w-64 px-4 pt-1 pb-3 text-0.5xs text-muted">
            Add metadata to your services, such as a team or a domain, to group
            by it.
          </p>
        )}
      </DropdownPopover>
    </Dropdown>
  );
}
