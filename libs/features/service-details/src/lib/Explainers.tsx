import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';
import { PropsWithChildren } from 'react';

const warningStyles = tv({
  base: 'mt-2 flex gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-600/90',
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
          href="https://docs.restate.dev/services/configuration"
        >
          Learn more…
        </Link>
      )}
    </div>
  );
}

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
