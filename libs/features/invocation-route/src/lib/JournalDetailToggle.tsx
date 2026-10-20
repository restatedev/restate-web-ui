import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
  type DropdownMenuSelection,
} from '@restate/ui-dropdown';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { HoverTooltip } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';
import {
  DETAIL_CATEGORY_DESCRIPTIONS,
  DETAIL_CATEGORY_LABELS,
  type DetailCategory,
} from '@restate/features-invocation-ui';

// Segmented control matching the old Compact|Detailed Nav box (subtle inset
// background + white "active" pill), but Detailed is now a split button: the
// body activates the full detailed view, the chevron opens a multi-select
// popover to pick exactly which categories show. Selecting none falls back to
// Compact, so there is never a "detailed but empty" state.
const styles = tv({
  slots: {
    container:
      'inline-flex items-stretch rounded-xl border-[0.5px] border-tint-subtle bg-tint-subtle shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)]',
    compact:
      'rounded-xl border border-transparent px-2.5 py-1 font-sans text-xs text-tertiary shadow-none',
    pill: 'flex items-stretch rounded-xl border border-transparent',
    body: 'gap-1 rounded-xl rounded-r-none px-2.5 py-1 font-sans text-xs text-tertiary shadow-none',
    chevron:
      'rounded-xl rounded-l-none border-l border-transparent px-1 py-1 text-muted shadow-none',
    count:
      'rounded bg-emphasis/70 px-1 text-2xs font-medium text-muted tabular-nums',
  },
  variants: {
    isCompact: {
      true: { compact: 'border-tint bg-raised text-primary shadow-xs' },
      false: {},
    },
    isDetailed: {
      true: {
        pill: 'border-tint bg-raised shadow-xs',
        body: 'text-primary',
        chevron: 'border-tint-subtle',
        count: 'bg-accent-subtle text-accent',
      },
      false: {},
    },
  },
});

export function JournalDetailToggle({
  availableCategories,
  selectedCategories,
  isCompact,
  onCompact,
  onDetailed,
  onChange,
}: {
  availableCategories: DetailCategory[];
  selectedCategories: DetailCategory[];
  isCompact: boolean;
  onCompact: () => void;
  onDetailed: () => void;
  onChange: (selection: DropdownMenuSelection) => void;
}) {
  const isDetailed = !isCompact;
  const isPartial =
    isDetailed && selectedCategories.length < availableCategories.length;
  const { container, compact, pill, body, chevron, count } = styles({
    isCompact,
    isDetailed,
  });

  return (
    <div className={container()}>
      <HoverTooltip content="Actions only" placement="top" className="block">
        <Button variant="icon" onClick={onCompact} className={compact()}>
          Compact
        </Button>
      </HoverTooltip>
      <div className={pill()}>
        <HoverTooltip
          content="Show all extra detail"
          placement="top"
          className="block"
        >
          <Button variant="icon" onClick={onDetailed} className={body()}>
            Detailed
            {isPartial && (
              <span className={count()}>{selectedCategories.length}</span>
            )}
          </Button>
        </HoverTooltip>
        <Dropdown>
          <DropdownTrigger>
            <Button
              variant="icon"
              className={chevron()}
              aria-label="Choose what the detailed view shows"
            >
              <Icon name={IconName.ChevronsUpDown} className="h-3 w-3" />
            </Button>
          </DropdownTrigger>
          <DropdownPopover placement="bottom right">
            <DropdownSection title="Show in detailed view">
              <DropdownMenu
                multiple
                selectable
                selectedItems={selectedCategories}
                onSelect={onChange}
                shouldCloseOnSelect={false}
                aria-label="Detailed view categories"
              >
                {availableCategories.map((category) => (
                  <DropdownItem key={category} value={category}>
                    <div className="flex flex-col gap-0.5 whitespace-normal">
                      <span>{DETAIL_CATEGORY_LABELS[category]}</span>
                      <span className="text-xs font-normal opacity-70">
                        {DETAIL_CATEGORY_DESCRIPTIONS[category]}
                      </span>
                    </div>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </DropdownSection>
          </DropdownPopover>
        </Dropdown>
      </div>
    </div>
  );
}
