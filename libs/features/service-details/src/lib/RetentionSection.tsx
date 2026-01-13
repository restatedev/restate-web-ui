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
  className,
  isPending,
  service,
  isReadonly,
  retention,
  type,
}: {
  className?: string;
  isPending?: boolean;
  isReadonly?: boolean;
  service: string;
  retention?: {
    workflowCompletionRetention?: string | null;
    idempotencyRetention?: string | null;
    journalRetention?: string | null;
  };
  type?: 'Service' | 'VirtualObject' | 'Workflow';
}) {
  const [, setSearchParams] = useSearchParams();
  const isWorkflow = type === 'Workflow';

  return (
    <Section>
      <SectionTitle className="flex items-center">
        Retentions
        {!isReadonly && (
          <Button
            variant="secondary"
            onClick={() =>
              setSearchParams(
                (old) => {
                  old.set(SERVICE_RETENTION_EDIT, service);
                  return old;
                },
                { preventScrollReset: true },
              )
            }
            className="ml-auto flex items-center gap-1 rounded-md bg-gray-50/50 px-1.5 py-0.5 font-sans text-xs font-normal shadow-none"
          >
            Edit…
          </Button>
        )}
      </SectionTitle>
      <div className="flex flex-col">
        {isWorkflow && (
          <SubSection
            value={
              retention?.workflowCompletionRetention === '0s'
                ? 'Disabled'
                : retention?.workflowCompletionRetention
            }
            label={
              <WorkflowRetentionExplainer variant="indicator-button">
                Workflow
              </WorkflowRetentionExplainer>
            }
            isPending={isPending}
          />
        )}
        <SubSection
          value={
            retention?.idempotencyRetention === '0s'
              ? 'Disabled'
              : retention?.idempotencyRetention
          }
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
            value={
              retention?.journalRetention === '0s'
                ? 'Disabled'
                : retention?.journalRetention
            }
            label={
              <JournalRetentionExplainer variant="indicator-button">
                Journal
              </JournalRetentionExplainer>
            }
            footer={
              <>
                {isWorkflow &&
                  humanTimeToMs(retention?.workflowCompletionRetention) <
                    humanTimeToMs(retention?.journalRetention) && (
                    <WarningWorkflowCapExplanation
                      cap={retention?.workflowCompletionRetention}
                    />
                  )}
                {humanTimeToMs(retention?.idempotencyRetention) <
                  humanTimeToMs(retention?.journalRetention) && (
                  <WarningIdempotencyCapExplanation
                    cap={retention?.idempotencyRetention}
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
