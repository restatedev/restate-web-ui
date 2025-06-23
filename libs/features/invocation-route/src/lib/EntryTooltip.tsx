import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { Ellipsis } from '@restate/ui/loading';
import {
  formatDateTime,
  formatDurations,
  formatRange,
} from '@restate/util/intl';
import { getDuration } from '@restate/util/snapshot-time';
import { DOMAttributes, ReactElement } from 'react';
import { useJournalContext } from './JournalContext';
import { HoverTooltip } from '@restate/ui/tooltip';

export function EntryTooltip({
  className,
  children,
  entry,
}: {
  entry?: JournalEntryV2;
  className?: string;
  children: ReactElement<DOMAttributes<HTMLElement>, string>;
}) {
  if (!entry) {
    return children;
  }

  return (
    <HoverTooltip
      content={<EntryContent entry={entry} />}
      className="flex h-full"
      size="lg"
    >
      {children}
    </HoverTooltip>
  );
}

function EntryContent({ entry }: { entry: JournalEntryV2 }) {
  const isPoint = !entry.end && !entry.isPending;
  const inProgress = !entry.end && !!entry.isPending;
  const isFinished = !!entry.end;
  const { end } = useJournalContext();
  return (
    <div className="flex flex-col gap-3">
      <div className="uppercase font-semibold text-base">{entry.type}</div>

      <div className="flex gap-5 font-medium">
        <div>Execution Time:</div>
        <div className="text-right font-normal">
          <div className="flex items-center gap-2">
            {isPoint && (
              <div className="opacity-80">
                {formatDateTime(new Date(String(entry.start)), 'system')}
              </div>
            )}
            {isFinished && (
              <div className="opacity-80">
                {formatRange(
                  new Date(String(entry.start)),
                  new Date(String(entry.end))
                )}
              </div>
            )}
            {inProgress && (
              <div className="opacity-80">
                {`${formatDateTime(
                  new Date(String(entry.start)),
                  'system'
                )} – `}
                <Ellipsis> </Ellipsis>
              </div>
            )}

            {entry.start && (entry.end || inProgress) && (
              <div className="font-semibold">
                (
                {formatDurations(
                  getDuration(
                    new Date(entry.end || end).getTime() -
                      new Date(entry.start).getTime()
                  )
                )}
                )
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
