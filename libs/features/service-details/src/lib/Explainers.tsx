import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';
import { PropsWithChildren } from 'react';

const warningStyles = tv({
  base: 'mt-2 flex gap-2 rounded-xl bg-blue-100 p-3 text-xs text-blue-600/90',
});
export function Warning({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={warningStyles({ className })}>
      <Icon
        className="h-4.5 w-4.5 shrink-0 fill-blue-500/80 text-blue-100"
        name={IconName.Info}
      />
      <span className="inline-block">{children}</span>
    </div>
  );
}

function WithLearnMore({
  children,
  learnMore,
}: PropsWithChildren<{ learnMore?: boolean }>) {
  return (
    <div className="inline">
      {children}
      {learnMore && (
        <Link
          className="ml-1 inline-block text-inherit"
          rel="noopener noreferrer"
          target="_blank"
          variant="secondary"
          href="https://docs.restate.dev/operate/configuration/services/"
        >
          Learn more…
        </Link>
      )}
    </div>
  );
}
export const WorkflowRetentionExplanation = ({
  learnMore,
}: PropsWithChildren<{ learnMore?: boolean }>) => (
  <WithLearnMore learnMore={learnMore}>
    The period for which a workflow's result is retained after{' '}
    <span className="font-mono font-medium italic">run()</span> completes.
  </WithLearnMore>
);

export const WorkflowIdempotencyExplanation = ({
  learnMore,
}: PropsWithChildren<{ learnMore?: boolean }>) => (
  <WithLearnMore learnMore={learnMore}>
    The period for which a shared handler's result is retained when invoked with
    an idempotency key.
  </WithLearnMore>
);
export const IdempotencyExplanation = ({
  learnMore,
}: PropsWithChildren<{ learnMore?: boolean }>) => (
  <WithLearnMore learnMore={learnMore}>
    The period for which an invocation's result is retained when invoked with an
    idempotency key.
  </WithLearnMore>
);
export const JournalExplanation = ({
  learnMore,
}: PropsWithChildren<{ learnMore?: boolean }>) => (
  <WithLearnMore learnMore={learnMore}>
    The period for which an invocation's journal entries are retained.
  </WithLearnMore>
);

export const WarningIdempotencyCapExplanation = ({
  cap,
}: {
  cap?: string | null;
}) =>
  cap && (
    <Warning>
      For invocations with an idempotency key, the journal retention period is
      capped at{' '}
      <span className="font-mono font-medium text-blue-600">{cap}</span>.
    </Warning>
  );
export const WarningWorkflowCapExplanation = ({
  cap,
}: {
  cap?: string | null;
}) =>
  cap && (
    <Warning>
      For workflow executions, the journal retention period is capped at{' '}
      <span className="font-mono font-medium text-blue-600">{cap}</span>.
    </Warning>
  );
