import { Button } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'text-red-500',
});
export function CallInvokedLoadingError({
  error,
  className,
}: {
  error: Error | null | undefined;
  className?: string;
}) {
  if (!error) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="icon" className={styles({ className })}>
          <Icon
            name={IconName.CircleX}
            className="h-3 w-3 text-red-500 shrink-0"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-2xl">
        <ErrorBanner error={error} />
      </PopoverContent>
    </Popover>
  );
}
