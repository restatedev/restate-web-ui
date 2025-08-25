import { useServiceDetails } from '@restate/data-access/admin-api-hooks';
import { Button } from '@restate/ui/button';
import { SectionTitle, Section } from '@restate/ui/section';
import { useSearchParams } from 'react-router';
import { SERVICE_TIMEOUT_EDIT } from './constants';
import { SubSection } from './SubSection';

export function TimeoutSection({
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
        Timeouts
        <Button
          variant="secondary"
          onClick={() =>
            setSearchParams(
              (old) => {
                old.set(SERVICE_TIMEOUT_EDIT, String(data?.name));
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
        <SubSection
          value={data?.inactivity_timeout}
          label="Inactivity"
          isPending={isPending}
        />
        <SubSection
          value={data?.abort_timeout}
          label="Abort"
          isPending={isPending}
        />
      </div>
    </Section>
  );
}
