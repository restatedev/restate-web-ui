import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { RestateError } from '@restate/util/errors';
import { useMemo } from 'react';
import { tv } from 'tailwind-variants';
const failureStyle = tv({
  base: '',
  slots: {
    trigger:
      'text-red-500 bg-white/70 border px-1.5 py-0 flex rounded-md items-center gap-1 [font-size:inherit] h-5',
    errorIcon: 'h-3 w-3 shrink-0 text-red-500/90',
  },
});
export function Failure({
  message,
  restate_code,
  className,
}: {
  restate_code?: string;
  message: string;
  className?: string;
}) {
  const error = useMemo(
    () => new RestateError(message, restate_code),
    [message, restate_code]
  );
  const { trigger, errorIcon } = failureStyle();

  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="secondary"
          className={trigger({ className })}
          disabled={!error}
        >
          <Icon name={IconName.CircleX} className={errorIcon()} />
          {restate_code}
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3 w-3 text-gray-500 shrink-0"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <DropdownSection title="Failure">
          <ErrorBanner
            error={error}
            wrap={error?.message.includes('\n')}
            className="rounded-lg flex-auto w-[min(40rem,90vw)] [&_details]:max-h-full [&:has(details[open])]:h-[min(50vh,16rem)]  overflow-auto resize max-w-full max-h-full"
          />
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}
