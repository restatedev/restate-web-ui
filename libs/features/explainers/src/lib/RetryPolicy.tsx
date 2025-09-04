import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';

export function RetryMaxAttemptsExplainer({
  children,
  variant = 'indicator-button',
  className,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
  className?: string;
}>) {
  return (
    <InlineTooltip
      variant={variant}
      title="Max attempts"
      description={
        <p>
          Maximum number of retry attempts before applying the policy in{' '}
          <code>onMaxAttempts</code>.
        </p>
      }
      className={className}
    >
      {children}
    </InlineTooltip>
  );
}

export function OnMaxAttemptsExplainer({
  children,
  variant = 'indicator-button',
  className,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
  className?: string;
}>) {
  return (
    <InlineTooltip
      variant={variant}
      title="On max attempts"
      description={
        <p>
          What happens when max attempts are reached: pause (manual resume) or
          kill (stop permanently).
        </p>
      }
      className={className}
    >
      {children}
    </InlineTooltip>
  );
}

export function InitialIntervalExplainer({
  children,
  variant = 'indicator-button',
  className,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
  className?: string;
}>) {
  return (
    <InlineTooltip
      variant={variant}
      title="Initial interval"
      description={<p>Delay before the first retry.</p>}
      className={className}
    >
      {children}
    </InlineTooltip>
  );
}

export function MaxIntervalExplainer({
  children,
  variant = 'indicator-button',
  className,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
  className?: string;
}>) {
  return (
    <InlineTooltip
      variant={variant}
      title="Max interval"
      description={<p>Maximum delay allowed between retries.</p>}
      className={className}
    >
      {children}
    </InlineTooltip>
  );
}

export function ExponentialFactorExplainer({
  children,
  variant = 'indicator-button',
  className,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
  className?: string;
}>) {
  return (
    <InlineTooltip
      variant={variant}
      title="Exponential factor"
      description={
        <p>
          Multiplier used to increase the retry interval after each attempt.
        </p>
      }
      className={className}
    >
      {children}
    </InlineTooltip>
  );
}
