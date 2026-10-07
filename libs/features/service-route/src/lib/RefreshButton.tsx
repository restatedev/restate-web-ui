import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

const iconStyles = tv({
  base: 'h-3.5 w-3.5',
  variants: {
    isFetching: {
      true: 'animate-spin',
      false: '',
    },
  },
});

export function RefreshButton({
  isFetching,
  label,
  onClick,
}: {
  isFetching: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          type="button"
          variant="icon"
          aria-label={label}
          className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg p-0"
          onClick={onClick}
          disabled={isFetching}
        >
          <Icon name={IconName.Retry} className={iconStyles({ isFetching })} />
        </Button>
      </TooltipTrigger>
      <TooltipContent size="sm">{label}</TooltipContent>
    </Tooltip>
  );
}
