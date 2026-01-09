import { SectionTitle, Section } from '@restate/ui/section';
import { SubSection } from './SubSection';
import { LazyStateExplainer } from '@restate/features/explainers';

export function AdvancedSection({
  isLazyStateEnabled,
  className,
  isPending,
}: {
  className?: string;
  isPending?: boolean;
  service: string;
  isLazyStateEnabled?: boolean;
}) {
  return (
    <Section>
      <SectionTitle className="flex items-center">Advanced</SectionTitle>
      <div className="flex flex-col gap-2">
        <SubSection
          value={String(isLazyStateEnabled ? 'Enabled' : 'Disabled')}
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
