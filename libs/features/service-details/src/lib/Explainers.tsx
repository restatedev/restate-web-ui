import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { PropsWithChildren } from 'react';

function Warning({ children }: PropsWithChildren) {
  return (
    <div className="mt-2 flex gap-2 rounded-xl bg-orange-100 p-3 text-xs text-orange-500">
      <Icon
        className="h-5 w-5 shrink-0 fill-orange-500 text-orange-100"
        name={IconName.TriangleAlert}
      />
      <span className="inline-block">{children}</span>
    </div>
  );
}

function WithLearnMore({ children }: PropsWithChildren) {
  return (
    <div className="inline">
      {children}
      <Link
        className="ml-1 inline-block"
        rel="noopener noreferrer"
        target="_blank"
        variant="secondary"
        href="https://docs.restate.dev/operate/configuration/services/"
      >
        Learn more…
      </Link>
    </div>
  );
}
export const WorkflowRetentionExplanation = () => (
  <WithLearnMore>
    The period for which a workflow's result is retained after{' '}
    <span className="font-mono font-medium text-gray-600 italic">run()</span>{' '}
    completes.
  </WithLearnMore>
);

export const WorkflowIdempotencyExplanation = () => (
  <WithLearnMore>
    The period for which a shared handler's result is retained when invoked with
    an idempotency key.
  </WithLearnMore>
);
export const IdempotencyExplanation = () => (
  <WithLearnMore>
    The period for which an invocation's result is retained when invoked with an
    idempotency key.
  </WithLearnMore>
);
export const JournalExplanation = () => (
  <WithLearnMore>
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
      <span className="font-mono font-medium text-orange-600">{cap}</span>
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
      <span className="font-mono font-medium text-orange-600">{cap}</span>
    </Warning>
  );
