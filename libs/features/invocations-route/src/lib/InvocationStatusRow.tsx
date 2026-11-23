import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  SelectionIndicator,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-aria-components';
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
import { tv } from '@restate/util-styles';
import {
  describeStatusFilter,
  getInvocationStatusPreset,
  listInvocationPresets,
} from '@restate/util-sidebar-nav';
import { vqueueSummaryStyles } from '@restate/features-status-chart';

const ROW_PRESETS = ['all', 'processing', 'inflight', 'stuck', 'completed'];
const MORE_PRESETS = ['suspended', 'scheduled'];

const moreButtonStyles = tv({
  base: 'flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted shadow-none hover:bg-emphasis/40 hover:text-secondary',
});

interface StatusItem {
  id: string;
  label: string;
  href: string;
  hint?: string;
}

function statusHref(
  baseUrl: string,
  current: URLSearchParams,
  presetSearch: string,
) {
  const params = new URLSearchParams(current);
  const preset = new URLSearchParams(presetSearch);
  params.delete('filter_status');
  const status = preset.get('filter_status');
  if (status) params.set('filter_status', status);
  const field = preset.get('sort_field');
  const order = preset.get('sort_order');
  if (field && order) {
    params.set('sort_field', field);
    params.set('sort_order', order);
  }
  return `${baseUrl}/invocations?${params.toString()}`;
}

function pick(items: StatusItem[], ids: string[]) {
  return ids.flatMap((id) => items.filter((item) => item.id === id));
}

export function InvocationStatusRow({
  searchParams,
  baseUrl,
  canSortByTransition,
}: {
  searchParams: URLSearchParams;
  baseUrl: string;
  canSortByTransition: boolean;
}) {
  const navigate = useNavigate();
  const search = searchParams.toString();
  const { row, more, active, custom } = useMemo(() => {
    const current = new URLSearchParams(search);
    const items = listInvocationPresets(canSortByTransition).map(
      (preset): StatusItem => ({
        id: preset.id,
        label: preset.label,
        hint: preset.hint,
        href: statusHref(baseUrl, current, preset.search),
      }),
    );
    const active = getInvocationStatusPreset(current);
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
  }, [search, baseUrl, canSortByTransition]);

  const go = (href: string) =>
    navigate(href, { flushSync: true, preventScrollReset: true });
  const promoted = more.filter(({ id }) => id === active);
  const items = [...row, ...promoted, ...(custom ? [custom] : [])];
  const { focusTabList, focusTab, focusIndicator } = vqueueSummaryStyles();

  return (
    <div className="flex items-center gap-1">
      <ToggleButtonGroup
        key={promoted[0]?.id ?? (custom ? 'custom' : 'presets')}
        aria-label="Invocation status"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[active]}
        onSelectionChange={(keys) => {
          const [key] = keys;
          const href = items.find(({ id }) => id === key)?.href;
          if (href) go(href);
        }}
        className={focusTabList()}
      >
        {items.map((item) => (
          <HintTooltip key={item.id} hint={item.hint} placement="bottom">
            <ToggleButton id={item.id} className={focusTab()}>
              <span>{item.label}</span>
              <SelectionIndicator className={focusIndicator()} />
            </ToggleButton>
          </HintTooltip>
        ))}
      </ToggleButtonGroup>
      <Dropdown>
        <DropdownTrigger>
          <Button variant="icon" className={moreButtonStyles()}>
            More
            <Icon
              name={IconName.ChevronsUpDown}
              className="aspect-square h-3 w-3 opacity-60"
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
