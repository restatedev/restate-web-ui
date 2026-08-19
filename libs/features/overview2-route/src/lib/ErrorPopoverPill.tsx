import { Button } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';

export function ErrorPopoverPill({
  error,
  label,
}: {
  error?: Error | null;
  label: string;
}) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="secondary"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border-red-200/80 bg-red-50/80 px-3 py-1 text-xs text-red-600 shadow-none hover:bg-red-100/80"
        >
          <Icon
            name={IconName.TriangleAlert}
            className="h-3.5 w-3.5 fill-red-200 text-red-500"
          />
          {label}
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3.5 w-3.5 text-red-400"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-sm">
        <ErrorBanner error={error} className="rounded-xl" />
      </PopoverContent>
    </Popover>
  );
}
