import { Button } from '@restate/ui/button';
import { SectionTitle, Section } from '@restate/ui/section';
import { useSearchParams } from 'react-router';
import { SERVICE_ACCESS_EDIT } from './constants';
import { SubSection } from './SubSection';
import { IngressAccessExplainer } from '@restate/features/explainers';

export function IngressAccessSection({
  isPublic,
  className,
  isPending,
  isReadonly = false,
  service,
}: {
  className?: string;
  isPending?: boolean;
  isPublic?: boolean;
  isReadonly?: boolean;
  service: string;
}) {
  const [, setSearchParams] = useSearchParams();

  return (
    <Section>
      <SectionTitle className="flex items-center">
        Access
        {isReadonly && (
          <Button
            variant="secondary"
            onClick={() =>
              setSearchParams(
                (old) => {
                  old.set(SERVICE_ACCESS_EDIT, String(service));
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
          value={isPublic ? 'Public' : isPublic === false ? 'Private' : ''}
          label={
            <IngressAccessExplainer variant="indicator-button">
              Ingress
            </IngressAccessExplainer>
          }
          isPending={isPending}
        />
      </div>
    </Section>
  );
}
