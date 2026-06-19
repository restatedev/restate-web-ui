import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
  type DropdownMenuSelection,
} from '@restate/ui/dropdown';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import {
  DETAIL_CATEGORY_DESCRIPTIONS,
  DETAIL_CATEGORY_LABELS,
  type DetailCategory,
} from './useJournalDetail';

// Segmented control matching the old Compact|Detailed Nav box (subtle inset
// background + white "active" pill), but Detailed is now a split button: the
// body activates the full detailed view, the chevron opens a multi-select
// popover to pick exactly which categories show. Selecting none falls back to
// Compact, so there is never a "detailed but empty" state.
const styles = tv({
  slots: {
    container:
      'inline-flex items-stretch rounded-xl border-[0.5px] border-zinc-800/5 bg-black/3 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]',
    compact:
      'rounded-xl border border-transparent px-2.5 py-1 font-sans text-xs text-gray-600 shadow-none',
    pill: 'flex items-stretch rounded-xl border border-transparent',
    body: 'gap-1 rounded-xl rounded-r-none px-2.5 py-1 font-sans text-xs text-gray-600 shadow-none',
    chevron:
      'rounded-xl rounded-l-none border-l border-transparent px-1 py-1 text-gray-500 shadow-none',
    count:
      'rounded bg-gray-200/70 px-1 text-2xs font-medium text-gray-500 tabular-nums',
  },
  variants: {
    isCompact: {
      true: { compact: 'border-black/10 bg-white text-gray-800 shadow-xs' },
      false: {},
    },
    isDetailed: {
      true: {
        pill: 'border-black/10 bg-white shadow-xs',
        body: 'text-gray-800',
        chevron: 'border-black/[0.07]',
        count: 'bg-blue-50 text-blue-600',
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
