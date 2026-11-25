import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@restate/ui-button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@restate/ui-dropdown';
import { Icon, IconName } from '@restate/ui-icons';
import { HintTooltip } from '@restate/ui-tooltip';
import { SegmentedControl } from '@restate/ui-tabs';
import { tv } from '@restate/util-styles';
import {
  describeStatusFilter,
  getInvocationStatusPreset,
  listInvocationPresets,
} from '@restate/util-sidebar-nav';
import { COLUMN_QUERY_PREFIX, getDefaultInvocationColumns } from './columns';

const ROW_PRESETS = ['all', 'processing', 'inflight', 'stuck', 'completed'];
const MORE_PRESETS = ['suspended', 'scheduled', 'notcompleted'];
const DEFAULT_COLUMNS: readonly string[] = getDefaultInvocationColumns();

const rowStyles = tv({
  slots: {
    root: 'flex max-w-full flex-wrap items-center justify-center gap-1',
    group: 'flex-wrap justify-center',
  },
});

interface StatusItem {
  id: string;
  label: string;
  href: string;
  hint?: string;
}

export function invocationStatusHref(
  baseUrl: string,
  current: URLSearchParams,
  presetSearch: string,
  activeSearch = '',
) {
  const params = new URLSearchParams(current);
  const preset = new URLSearchParams(presetSearch);
  const status = preset.get('filter_status');
  if (status) {
    params.set('filter_status', status);
  } else {
    params.delete('filter_status');
  }
  const presetColumns = preset.getAll(COLUMN_QUERY_PREFIX);
  const leftColumns = new URLSearchParams(activeSearch)
    .getAll(COLUMN_QUERY_PREFIX)
    .filter(
      (column) =>
        !DEFAULT_COLUMNS.includes(column) && !presetColumns.includes(column),
    );
  const selected = params
    .getAll(COLUMN_QUERY_PREFIX)
    .filter((column) => !leftColumns.includes(column));
  if (leftColumns.length > 0) {
    params.delete(COLUMN_QUERY_PREFIX);
    for (const column of selected) {
      params.append(COLUMN_QUERY_PREFIX, column);
    }
  }
  for (const column of presetColumns) {
    const isDefault = DEFAULT_COLUMNS.includes(column);
    if (!selected.includes(column) && (!isDefault || selected.length === 0)) {
      params.append(COLUMN_QUERY_PREFIX, column);
    }
  }
  return `${baseUrl}/invocations?${params.toString()}`;
}

function pick(items: StatusItem[], ids: string[]) {
  return ids.flatMap((id) => items.filter((item) => item.id === id));
}

export function InvocationStatusRow({
  searchParams,
  baseUrl,
}: {
  searchParams: URLSearchParams;
  baseUrl: string;
}) {
  const navigate = useNavigate();
  const search = searchParams.toString();
  const { row, more, active, custom } = useMemo(() => {
    const current = new URLSearchParams(search);
    const presets = listInvocationPresets();
    const active = getInvocationStatusPreset(current);
    const activeSearch = presets.find(({ id }) => id === active)?.search;
    const items = presets.map((preset): StatusItem => ({
      id: preset.id,
      label: preset.label,
      hint: preset.hint,
      href: invocationStatusHref(baseUrl, current, preset.search, activeSearch),
    }));
    const custom: StatusItem | undefined =
      active === 'custom'
        ? {
            id: 'custom',
            label:
              describeStatusFilter(current.get('filter_status')) ?? 'Custom',
            href: '',
          }
        : undefined;
    return {
      row: pick(items, ROW_PRESETS),
      more: pick(items, MORE_PRESETS),
      active,
      custom,
    };
  }, [search, baseUrl]);

  const go = (href: string) =>
    navigate(href, { flushSync: true, preventScrollReset: true });
  const promoted = more.filter(({ id }) => id === active);
  const items = [...row, ...promoted, ...(custom ? [custom] : [])];
  const extraId = promoted[0]?.id ?? custom?.id;
  const [group, setGroup] = useState({ extraId, key: 0 });
  if (group.extraId !== extraId) {
    setGroup({ extraId, key: extraId ? group.key + 1 : group.key });
  }
  const styles = rowStyles();

  return (
    <div className={styles.root()}>
      <SegmentedControl
        key={group.key}
        size="md"
        label="Invocation status"
        options={items.map((item) => ({
          value: item.id,
          label: item.label,
          hint: item.hint,
        }))}
        value={active}
        onChange={(key) => {
          const href = items.find(({ id }) => id === key)?.href;
          if (href) go(href);
        }}
        className={styles.group()}
      />
      <Dropdown>
        <DropdownTrigger>
          <Button variant="ghost">
            More
            <Icon
              name={IconName.ChevronsUpDown}
              size="xs"
              className="opacity-60"
            />
          </Button>
        </DropdownTrigger>
        <DropdownPopover placement="bottom end">
          <DropdownMenu
            selectable
            selectedItems={[active]}
            onSelect={(key) => {
              const href = more.find(({ id }) => id === key)?.href;
              if (href) go(href);
            }}
          >
            {more.map((item) => (
              <DropdownItem key={item.id} value={item.id}>
                <HintTooltip
                  hint={item.hint}
                  placement="right"
                  offset={16}
                  className="min-w-0 flex-auto"
                >
                  {item.label}
                </HintTooltip>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownPopover>
      </Dropdown>
    </div>
  );
}
