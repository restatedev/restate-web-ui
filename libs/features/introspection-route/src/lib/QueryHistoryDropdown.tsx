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
import { clearQueryHistory, useQueryHistory } from './queryHistory';

function toSingleLine(query: string) {
  return query.replace(/\s+/g, ' ').trim();
}

export function QueryHistoryDropdown({
  onSelect,
}: {
  onSelect: (query: string) => void;
}) {
  const history = useQueryHistory();
  const isEmpty = history.length === 0;

  return (
    <Dropdown>
      <DropdownTrigger>
        <HoverTooltip content="Query history">
          <Button
            variant="icon"
            disabled={isEmpty}
            className="h-full rounded-lg bg-white/10 px-2 text-gray-200 hover:bg-white/20 disabled:text-gray-400 pressed:bg-white/25"
          >
            <Icon name={IconName.History} className="h-4 w-4 shrink-0" />
          </Button>
        </HoverTooltip>
      </DropdownTrigger>
      <DropdownPopover className="max-w-[min(90vw,32rem)]">
        <DropdownSection title="Recent queries" className="mb-0">
          <DropdownMenu
            autoFocus
            onSelect={(query) => onSelect(query)}
            aria-label="Recent queries"
          >
            {history.map((query) => (
              <DropdownItem key={query} value={query}>
                <span className="min-w-0 truncate font-mono text-xs">
                  {toSingleLine(query)}
                </span>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
        <DropdownMenu
          onSelect={() => clearQueryHistory()}
          aria-label="Query history actions"
          className="mt-0 pt-0"
        >
          <DropdownItem value="clear" destructive>
            <Icon name={IconName.Trash} className="h-3.5 w-3.5 shrink-0" />
            Clear history
          </DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}
