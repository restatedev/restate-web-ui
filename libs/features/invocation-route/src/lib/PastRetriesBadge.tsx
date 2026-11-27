import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { HoverTooltip } from '@restate/ui-tooltip';
import { formatNumber } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import type { PastRetries } from './problemRows';

const styles = tv({
  base: 'mx-1 flex shrink-0 items-center gap-0.5 self-center rounded-md px-1 py-0 font-sans text-2xs leading-5 text-warning hover:bg-warning-subtle',
  variants: {
    isExpanded: {
      true: 'bg-warning-subtle',
      false: '',
    },
  },
});

export function PastRetriesBadge({
  retries,
  hasFailed,
  isExpanded,
  onToggle,
}: {
  retries: PastRetries;
  hasFailed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { count, lastMessage } = retries;
  const summary = `${
    count === 1
      ? '1 transient error'
      : `${formatNumber(count)} transient errors`
  } recorded before this step ${hasFailed ? 'failed' : 'completed'}`;
  return (
    <HoverTooltip
      content={
        <div className="flex max-w-xs flex-col gap-1 break-normal wrap-break-word">
          <span>{summary}</span>
          {lastMessage && (
            <span className="line-clamp-2 font-mono text-2xs opacity-75">
              {lastMessage}
            </span>
          )}
        </div>
      }
    >
      <Button
        variant="icon"
        onClick={onToggle}
        aria-label={summary}
        aria-expanded={isExpanded}
        className={styles({ isExpanded })}
      >
        <Icon name={IconName.Retry} size="xs" />
        {formatNumber(count)}
      </Button>
    </HoverTooltip>
  );
}
