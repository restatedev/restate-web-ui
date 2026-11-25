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
import { useOverviewContext } from './OverviewContext';
import {
  getMetadataGroupKey,
  metadataGroupBy,
  parseServiceGroupBy,
  type ServiceGroupBy,
} from './serviceGroups';
import { useServiceGroupBy } from './useServiceGroupBy';

const BUILT_IN_LABELS: Partial<Record<ServiceGroupBy, string>> = {
  deployment: 'Deployment',
};

export function ServicesGroupBy() {
  const { metadataKeys, isServiceDetailsPending, isServiceDetailsError } =
    useOverviewContext();
  const [groupBy, setGroupBy] = useServiceGroupBy();
  const activeLabel = getMetadataGroupKey(groupBy) ?? BUILT_IN_LABELS[groupBy];
  const selectGroupBy = (key: string) => setGroupBy(parseServiceGroupBy(key));

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary" size="xs" className="shrink-0">
          <span className="flex max-w-44 min-w-0 items-center gap-1.5">
            <Icon name={IconName.Rows3} size="sm" tone="dimmed" />
            <span className="min-w-0 truncate max-sm:sr-only">
              {activeLabel ? (
                <>
                  Group: <span className="font-medium">{activeLabel}</span>
                </>
              ) : (
                'Group'
              )}
            </span>
          </span>
        </Button>
      </DropdownTrigger>
      <DropdownPopover placement="bottom end">
        <DropdownSection title="Group services by">
          <DropdownMenu
            selectable
            selectedItems={[groupBy]}
            onSelect={selectGroupBy}
            aria-label="Group services by"
          >
            <DropdownItem value="none">None</DropdownItem>
            <DropdownItem value="deployment">Deployment</DropdownItem>
          </DropdownMenu>
        </DropdownSection>
        {metadataKeys.length > 0 ? (
          <DropdownSection title="Service metadata">
            <DropdownMenu
              selectable
              selectedItems={[groupBy]}
              onSelect={selectGroupBy}
              aria-label="Group services by metadata"
            >
              {metadataKeys.map((key) => (
                <DropdownItem key={key} value={metadataGroupBy(key)}>
                  <span className="truncate">{key}</span>
                </DropdownItem>
              ))}
            </DropdownMenu>
          </DropdownSection>
        ) : (
          !isServiceDetailsPending &&
          !isServiceDetailsError && (
            <p className="max-w-64 px-4 pt-1 pb-3 text-0.5xs text-muted">
              Add metadata to your services, such as a team or a domain, to
              group by it.
            </p>
          )
        )}
      </DropdownPopover>
    </Dropdown>
  );
}
