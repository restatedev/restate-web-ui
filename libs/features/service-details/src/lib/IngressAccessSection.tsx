import { useServiceDetails } from '@restate/data-access/admin-api-hooks';
import { Button } from '@restate/ui/button';
import { SectionTitle, Section } from '@restate/ui/section';
import { useSearchParams } from 'react-router';
import { SERVICE_ACCESS_EDIT } from './constants';
import { SubSection } from './SubSection';
import { IngressAccessExplainer } from '@restate/features/explainers';

export function IngressAccessSection({
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
      <SectionTitle className="flex items-center">
        Ingress access
        <Button
          variant="secondary"
          onClick={() =>
            setSearchParams(
              (old) => {
                old.set(SERVICE_ACCESS_EDIT, String(data?.name));
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
      <div className="flex flex-col gap-2">
        <SubSection
          value={
            data?.public ? 'Public' : data?.public === false ? 'Private' : ''
          }
          label={
            <IngressAccessExplainer variant="indicator-button">
              Service access
            </IngressAccessExplainer>
          }
          isPending={isPending}
        />
      </div>
    </Section>
  );
}
