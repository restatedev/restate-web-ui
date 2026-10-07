import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import { Button } from '@restate/ui/button';
import { SectionTitle, Section } from '@restate/ui/section';
import { useSearchParams } from 'react-router';
import { SERVICE_TIMEOUT_EDIT } from './constants';
import { SubSection } from './SubSection';
import { getProtocolType } from '@restate/data-access/admin-api-spec';
import { Warning } from './Explainers';
import {
  AbortTimeoutIllustration,
  InactivityTimeoutIllustration,
} from './illustrations';

export function TimeoutSection({
  className,
  isPending,
  service,
  isReadonly,
  revision,
  timeout,
}: {
  className?: string;
  isPending?: boolean;
  isReadonly?: boolean;
  service: string;
  revision?: number;
  timeout?: { inactivity?: string | null; abort?: string | null };
}) {
  const [, setSearchParams] = useSearchParams();
  const { data: listDeploymentsData } = useListDeployments();
  const deploymentId =
    listDeploymentsData?.services.get(service)?.deployments?.[
      Number(revision)
    ] ?? [];
  const isRequestResponse = deploymentId.some(
    (id) =>
      getProtocolType(listDeploymentsData?.deployments.get(id)) ===
      'RequestResponse',
  );

  return (
    <Section className="group">
      <SectionTitle className="flex items-center">
        Timeouts
        {!isReadonly && (
          <Button
            variant="secondary"
            onClick={() =>
              setSearchParams(
                (old) => {
                  old.set(SERVICE_TIMEOUT_EDIT, service);
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
      <div className="flex flex-col gap-2">
        <SubSection
          value={timeout?.inactivity ?? 'Default'}
          label="Inactivity"
          isPending={isPending}
          footer={
            <div className="flex flex-col gap-4">
              {isRequestResponse && (
                <Warning className="mt-0">
                  Inactivity timer not supported in this deployment. (Available
                  only in <code className="font-mono">Bidirectional</code>{' '}
                  mode.)
                </Warning>
              )}
              <InactivityTimeoutIllustration inactivity={timeout?.inactivity} />
            </div>
          }
        />
        <SubSection
          value={timeout?.abort ?? 'Default'}
          label="Abort"
          isPending={isPending}
          footer={
            <AbortTimeoutIllustration
              inactivity={timeout?.inactivity}
              abort={timeout?.abort}
            />
          }
        />
      </div>
    </Section>
  );
}
