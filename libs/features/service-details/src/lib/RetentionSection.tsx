import { useServiceDetails } from '@restate/data-access/admin-api-hooks';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import { SectionTitle, SectionContent, Section } from '@restate/ui/section';
import { RestateMinimumVersion } from '@restate/util/feature-flag';
import { humanTimeToMs } from '@restate/util/humantime';
import { useSearchParams } from 'react-router';
import { SERVICE_RETENTION_EDIT } from './constants';
import { Icon, IconName } from '@restate/ui/icons';
import { ReactNode } from 'react';
import { tv } from '@restate/util/styles';
import {
  WorkflowRetentionExplanation,
  WorkflowIdempotencyExplanation,
  IdempotencyExplanation,
  JournalExplanation,
  WarningWorkflowCapExplanation,
  WarningIdempotencyCapExplanation,
} from './Explainers';

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
        Retention
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
          className="ml-auto flex items-center gap-1 rounded-md bg-gray-50 px-1.5 py-0.5 font-sans text-xs font-normal shadow-none"
        >
          Edit…
        </Button>
      </SectionTitle>
      <div className="flex flex-col gap-2 pt-2">
        {isWorkflow && (
          <RetentionSubSection
            value={data?.workflow_completion_retention}
            label="Workflow"
            footer={<WorkflowRetentionExplanation />}
            isPending={isPending}
          />
        )}
        <RetentionSubSection
          value={data?.idempotency_retention}
          label="Idempotency"
          footer={
            isWorkflow ? (
              <WorkflowIdempotencyExplanation />
            ) : (
              <IdempotencyExplanation />
            )
          }
          isPending={isPending}
        />
        <RestateMinimumVersion minVersion="1.4.5">
          <RetentionSubSection
            value={data?.journal_retention}
            label="Journal"
            footer={
              <>
                <JournalExplanation />
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

const subSectionStyles = tv({
  base: 'p-0',
});
function RetentionSubSection({
  value,
  className,
  label,
  footer,
  isPending,
}: {
  className?: string;
  label: string;
  value?: string | null;
  isPending?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div>
      <SectionContent className={subSectionStyles({ className })}>
        <div className="flex items-center px-1.5 py-1 not-last:border-b">
          <span className="flex-auto pl-1 text-0.5xs font-medium text-gray-500">
            {label}
          </span>
          <Badge size="sm" className="py-0 align-middle font-mono">
            {value}
          </Badge>
        </div>
      </SectionContent>
      {footer && (
        <span className="mt-2 block px-3 pb-2 text-xs font-normal text-gray-500 normal-case">
          {footer}
        </span>
      )}
    </div>
  );
}
