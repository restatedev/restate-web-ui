import type { Invocation } from '@restate/data-access/admin-api-spec';
import { Badge } from '@restate/ui/badge';
import { HoverTooltip } from '@restate/ui/tooltip';
import { Ellipsis } from '@restate/ui/loading';
import {
  formatDateTime,
  formatDurations,
  formatRange,
  normaliseDuration,
  parseISODuration,
} from '@restate/util/intl';

export interface InvocationDurationProps {
  invocation: Pick<Invocation, 'duration' | 'created_at' | 'completed_at'>;
}

// Extracted from the main invocation table for reuse by tenant view.
export function InvocationDuration({ invocation }: InvocationDurationProps) {
  if (!invocation.duration) {
    return null;
  }
  const durationObject = normaliseDuration(
    parseISODuration(invocation.duration),
  );
  const formatted = formatDurations(durationObject);
  const createdAt = new Date(invocation.created_at);
  const completedAt = invocation.completed_at
    ? new Date(invocation.completed_at)
    : undefined;
  const isCompleted = !!completedAt;
  return (
    <Badge className="w-full border-none bg-transparent pl-0">
      <HoverTooltip
        className="mx-[-0.1em] max-w-full truncate rounded-xs px-[0.1em] underline decoration-zinc-400 decoration-dashed decoration-from-font underline-offset-[0.2em] hover:bg-black/5"
        content={
          <div className="flex flex-col gap-3">
            <div className="text-base font-semibold capitalize">Duration</div>
            <div className="inline font-medium">
              <div className="inline font-normal opacity-80">
                {isCompleted ? (
                  formatRange(createdAt, completedAt)
                ) : (
                  <span>
                    {formatDateTime(createdAt, 'system')} –{' '}
                    <Ellipsis>now</Ellipsis>
                  </span>
                )}
              </div>
              <div className="inline font-semibold">
                {'  '}({formatted})
              </div>
            </div>
          </div>
        }
      >
        <span className="w-full truncate">
          {formatted} {!isCompleted && <Ellipsis />}
        </span>
      </HoverTooltip>
    </Badge>
  );
}
