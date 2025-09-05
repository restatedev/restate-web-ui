import { useServiceDetails } from '@restate/data-access/admin-api-hooks';
import { SectionTitle, Section } from '@restate/ui/section';
import { useSearchParams } from 'react-router';
import { SubSection } from './SubSection';
import {
  ExponentialFactorExplainer,
  IdempotencyRetentionExplainer,
  InitialIntervalExplainer,
  MaxIntervalExplainer,
  OnMaxAttemptsExplainer,
  RetryMaxAttemptsExplainer,
} from '@restate/features/explainers';

export function RetryPolicySection({
  serviceDetails: data,
  className,
  isPending,
}: {
  className?: string;
  isPending?: boolean;
  serviceDetails?: ReturnType<typeof useServiceDetails>['data'];
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <Section>
      <SectionTitle className="flex items-center">Retry policy</SectionTitle>
      <div className="flex flex-col">
        <SubSection
          value={data?.retry_policy.max_attempts}
          label={
            <RetryMaxAttemptsExplainer variant="indicator-button">
              Max attempts
            </RetryMaxAttemptsExplainer>
          }
          isPending={isPending}
        />
        <SubSection
          value={data?.retry_policy.on_max_attempts}
          label={
            <OnMaxAttemptsExplainer variant="indicator-button">
              On max attempts
            </OnMaxAttemptsExplainer>
          }
          isPending={isPending}
        />
        <SubSection
          value={data?.retry_policy.initial_interval}
          label={
            <InitialIntervalExplainer variant="indicator-button">
              Initial interval
            </InitialIntervalExplainer>
          }
          isPending={isPending}
        />
        <SubSection
          value={data?.retry_policy.max_interval ?? 'No limit'}
          label={
            <MaxIntervalExplainer variant="indicator-button">
              Max interval
            </MaxIntervalExplainer>
          }
          isPending={isPending}
        />
        <SubSection
          value={data?.retry_policy.exponentiation_factor}
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
