import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';

export interface FilteredResultsCaptionProps {
  noun: string;
  onClear: () => void;
}

export function FilteredResultsCaption({
  noun,
  onClear,
}: FilteredResultsCaptionProps) {
  return (
    <div className="mx-2 mt-11 -mb-8 flex h-8 min-w-0 items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2 text-xs">
      <Icon
        name={IconName.Filter}
        className="h-3.5 w-3.5 shrink-0 text-blue-500"
      />
      <span className="shrink-0 font-medium text-gray-700">
        Filtered results
      </span>
      <span className="min-w-0 truncate text-zinc-500">
        Only matching {noun} are shown.
      </span>
      <Button
        type="button"
        variant="icon"
        aria-label={`Reset ${noun} filters`}
        className="ml-auto h-6 shrink-0 rounded-md px-1.5 py-0 text-xs font-medium text-blue-700 hover:bg-blue-100 pressed:bg-blue-200"
        onClick={onClear}
      >
        Reset
      </Button>
    </div>
  );
}
