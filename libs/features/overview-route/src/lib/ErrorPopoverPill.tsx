import { Button } from '@restate/ui-button';
import { ErrorBanner } from '@restate/ui-error';
import { Icon, IconName } from '@restate/ui-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';

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
          className="flex shrink-0 items-center gap-1.5 rounded-xl border-danger/80 bg-danger-subtle px-3 py-1 text-xs text-danger shadow-none hover:bg-danger-muted/80"
        >
          <Icon
            name={IconName.TriangleAlert}
            className="h-3.5 w-3.5 fill-danger-emphasis text-danger"
          />
          {label}
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3.5 w-3.5 text-danger-subtle"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-sm">
        <ErrorBanner error={error} className="rounded-xl" />
      </PopoverContent>
    </Popover>
  );
}
