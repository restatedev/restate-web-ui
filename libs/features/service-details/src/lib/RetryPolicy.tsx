import { SectionTitle, Section } from '@restate/ui/section';
import { SubSection } from './SubSection';
import {
  ExponentialFactorExplainer,
  InitialIntervalExplainer,
  MaxIntervalExplainer,
  OnMaxAttemptsExplainer,
  RetryMaxAttemptsExplainer,
} from '@restate/features/explainers';

export function RetryPolicySection({
  className,
  isPending,
  retryPolicy,
  service,
}: {
  className?: string;
  isPending?: boolean;
  service: string;
  retryPolicy?: {
    maxAttempts?: number | null;
    onMaxAttempts?: 'Pause' | 'Kill' | undefined;
    initialInterval?: string;
    maxInterval?: string | null;
    exponentiationFactor?: number;
  };
}) {
  return (
    <Section>
      <SectionTitle className="flex items-center">Retry policy</SectionTitle>
      <div className="flex flex-col">
        <SubSection
          value={retryPolicy?.maxAttempts ?? 'No limit'}
          label={
            <RetryMaxAttemptsExplainer variant="indicator-button">
              Max attempts
            </RetryMaxAttemptsExplainer>
          }
          isPending={isPending}
        />
        <SubSection
          value={retryPolicy?.onMaxAttempts}
          label={
            <OnMaxAttemptsExplainer variant="indicator-button">
              On max attempts
            </OnMaxAttemptsExplainer>
          }
          isPending={isPending}
        />
        <SubSection
          value={retryPolicy?.initialInterval}
          label={
            <InitialIntervalExplainer variant="indicator-button">
              Initial interval
            </InitialIntervalExplainer>
          }
          isPending={isPending}
        />
        <SubSection
          value={retryPolicy?.maxInterval ?? 'No limit'}
          label={
            <MaxIntervalExplainer variant="indicator-button">
              Max interval
            </MaxIntervalExplainer>
          }
          isPending={isPending}
        />
        <SubSection
          value={retryPolicy?.exponentiationFactor}
          label={
            <ExponentialFactorExplainer variant="indicator-button">
              Exponential factor
            </ExponentialFactorExplainer>
          }
          isPending={isPending}
        />
      </div>
    </Section>
  );
}
