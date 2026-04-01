import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';

export function CircularRefWarning() {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="icon" className="text-amber-500 z-[2]">
          <Icon
            name={IconName.TriangleAlert}
            className="h-5 w-5 shrink-0 fill-amber-500 text-white"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs">
        <div className="m-3 text-sm text-amber-800">
          This entry references an invocation that already appears earlier in
          the call tree. This typically indicates a deadlock.
        </div>
      </PopoverContent>
    </Popover>
  );
}
