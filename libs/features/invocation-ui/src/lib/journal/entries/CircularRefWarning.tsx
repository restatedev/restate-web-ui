import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';

export function CircularRefWarning() {
  return (
    <Popover>
      <PopoverTrigger>
        <Button
          aria-label="Circular reference"
          variant="icon"
          className="z-[2] text-pending-subtle"
        >
          <Icon
            name={IconName.TriangleAlert}
            size="lg"
            className="fill-pending-vivid text-inverse"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs">
        <div className="m-3 text-sm text-pending-strong">
          This entry references an invocation that already appears earlier in
          the call tree. This typically indicates a deadlock.
        </div>
      </PopoverContent>
    </Popover>
  );
}
