import { useServiceDetails } from '@restate/data-access/admin-api-hooks';
import { Button } from '@restate/ui/button';
import { SectionTitle, Section } from '@restate/ui/section';
import { RestateMinimumVersion } from '@restate/util/feature-flag';
import { humanTimeToMs } from '@restate/util/humantime';
import { useSearchParams } from 'react-router';
import { SERVICE_RETENTION_EDIT } from './constants';
import {
  WarningWorkflowCapExplanation,
  WarningIdempotencyCapExplanation,
} from './Explainers';
import { SubSection } from './SubSection';
import {
  IdempotencyRetentionExplainer,
  JournalRetentionExplainer,
  WorkflowRetentionExplainer,
} from '@restate/features/explainers';

export function RetentionSection({
  serviceDetails: data,
  className,
  isPending,
}: {
  className?: string;
  isPending?: boolean;
  serviceDetails?: ReturnType<typeof useServiceDetails>['data'];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isWorkflow = data?.ty === 'Workflow';

  return (
    <Section>
      <SectionTitle className="flex items-center">
        Retentions
        <Button
          variant="secondary"
          onClick={() =>
            setSearchParams(
              (old) => {
                old.set(SERVICE_RETENTION_EDIT, String(data?.name));
                return old;
              },
              { preventScrollReset: true },
            )
          }
          className="ml-auto flex items-center gap-1 rounded-md bg-gray-50/50 px-1.5 py-0.5 font-sans text-xs font-normal shadow-none"
        >
          Edit…
        </Button>
      </SectionTitle>
      <div className="flex flex-col pt-2">
        {isWorkflow && (
          <SubSection
            value={data?.workflow_completion_retention}
            label={
              <WorkflowRetentionExplainer variant="indicator-button">
                Workflow
              </WorkflowRetentionExplainer>
            }
            isPending={isPending}
          />
        )}
        <SubSection
          value={data?.idempotency_retention}
          label={
            <IdempotencyRetentionExplainer
              variant="indicator-button"
              isWorkflow={isWorkflow}
            >
              Idempotency
            </IdempotencyRetentionExplainer>
          }
          isPending={isPending}
        />
        <RestateMinimumVersion minVersion="1.4.5">
          <SubSection
            value={data?.journal_retention}
            label={
              <JournalRetentionExplainer variant="indicator-button">
                Journal
              </JournalRetentionExplainer>
            }
            footer={
              <>
                {isWorkflow &&
                  humanTimeToMs(data?.workflow_completion_retention) <
                    humanTimeToMs(data?.journal_retention) && (
                    <WarningWorkflowCapExplanation
                      cap={data?.workflow_completion_retention}
                    />
                  )}
                {humanTimeToMs(data?.idempotency_retention) <
                  humanTimeToMs(data?.journal_retention) && (
                  <WarningIdempotencyCapExplanation
                    cap={data?.idempotency_retention}
                  />
                )}
              </>
            }
            isPending={isPending}
          />
        </RestateMinimumVersion>
      </div>
    </Section>
  );
}
