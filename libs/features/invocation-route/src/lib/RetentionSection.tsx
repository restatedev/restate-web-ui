import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from '@restate/util/styles';
import { DateTooltip } from '@restate/ui/tooltip';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';
import { formatDurations } from '@restate/util/intl';

const styles = tv({ base: '' });
export function RetentionSection({
  invocation,
  isPending,
  className,
}: {
  invocation?: Invocation;
  isPending?: boolean;
  className?: string;
}) {
  const completionExpiration = invocation?.completion_expiration;
  const journalExpiration = invocation?.journal_expiration;
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const completionDuration = completionExpiration
    ? durationSinceLastSnapshot(completionExpiration)
    : undefined;
  const journalDuration = journalExpiration
    ? durationSinceLastSnapshot(completionExpiration)
    : undefined;

  if (!completionExpiration && !journalExpiration) {
    return null;
  }

  return (
    <Section className={styles({ className })}>
      <SectionTitle>Invocation Retention</SectionTitle>
      <SectionContent className="p-0">
        {completionExpiration && completionDuration && (
          <div className="flex h-9 items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto pl-1 text-0.5xs font-medium whitespace-nowrap text-gray-500">
              Completion retention ends{' '}
              <DateTooltip
                date={new Date(completionExpiration)}
                title="Completion retained until"
              >
                {!completionDuration?.isPast && (
                  <span className="font-normal text-zinc-500">in </span>
                )}
                {formatDurations(completionDuration)}
                {completionDuration?.isPast && (
                  <span className="font-normal text-zinc-500"> ago</span>
                )}
              </DateTooltip>
            </span>
          </div>
        )}
        {journalExpiration && journalDuration && (
          <div className="flex h-9 items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto pl-1 text-0.5xs font-medium whitespace-nowrap text-gray-500">
              Journal retention ends{' '}
              <DateTooltip
                date={new Date(journalExpiration)}
                title="Journal retained until"
              >
                {!journalDuration?.isPast && (
                  <span className="font-normal text-zinc-500">in </span>
                )}
                {formatDurations(journalDuration)}
                {journalDuration?.isPast && (
                  <span className="font-normal text-zinc-500"> ago</span>
                )}
              </DateTooltip>
            </span>
          </div>
        )}
      </SectionContent>
    </Section>
  );
}
