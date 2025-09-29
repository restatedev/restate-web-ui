import { useServiceDetails } from '@restate/data-access/admin-api-hooks';
import { SectionTitle, Section } from '@restate/ui/section';
import { SubSection } from './SubSection';
import { LazyStateExplainer } from '@restate/features/explainers';

export function AdvancedSection({
  serviceDetails: data,
  className,
  isPending,
}: {
  className?: string;
  isPending?: boolean;
  serviceDetails?: ReturnType<typeof useServiceDetails>['data'];
}) {
  return (
    <Section>
      <SectionTitle className="flex items-center">Advanced</SectionTitle>
      <div className="flex flex-col gap-2">
        <SubSection
          value={String(data?.enable_lazy_state ? 'Enabled' : 'Disabled')}
          label={
            <LazyStateExplainer variant="indicator-button">
              Lazy State
            </LazyStateExplainer>
          }
          isPending={isPending}
        />
      </div>
    </Section>
  );
}
