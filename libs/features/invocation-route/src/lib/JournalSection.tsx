import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api';
import { Invocation } from '@restate/data-access/admin-api/spec';
import { Section, SectionContent } from '@restate/ui/section';
import { JournalV2 } from './JournalV2';
import { tv } from 'tailwind-variants';

const sectionStyles = tv({
  base: '',
});
export function JournalSection({
  invocation,
  isPending,
  className,
}: {
  invocation?: Invocation;
  isPending?: boolean;
  className?: string;
}) {
  const { data, isSuccess } = useGetInvocationJournalWithInvocationV2(
    String(invocation?.id),
    {
      enabled: Boolean(invocation?.id),
      refetchOnMount: true,
    }
  );
  if (!data || !invocation?.id) {
    return null;
  }

  return (
    <Section className={sectionStyles({ className })}>
      <SectionContent className="px-1 pb-0" raised={false}>
        <JournalV2
          invocationId={invocation?.id}
          timelineWidth={0}
          className="mt-0 pl-2 pr-2"
          showApiError={false}
        />
      </SectionContent>
    </Section>
  );
}
