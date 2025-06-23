import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api';
import { Invocation } from '@restate/data-access/admin-api/spec';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
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
      <SectionTitle>Journal</SectionTitle>

      <SectionContent
        className="px-0 overflow-hidden pb-0 pt-0 bg-gray-50 "
        raised={true}
      >
        <div>
          <JournalV2
            invocationId={invocation?.id}
            timelineWidth={0}
            showApiError={false}
            withTimeline={false}
            className="[&>*:first-child]:mb-2 [&>*]:text-xs [&>*:first-child]:h-9 [&>*:first-child>*:last-child]:h-9 [&>*:first-child_[data-target]>*]:h-9 [&>*]:overflow-hidden [&>*]:rounded-[calc(0.75rem-0.125rem)] [&_.target]:[--rounded-radius:calc(0.75rem-0.125rem)] [&_.target]:rounded-r-[calc(0.75rem-0.125rem)] [&_.target]:[--rounded-right-radius:calc(0.75rem-0.125rem)] [&&&_.target>*:last-child>*]:[--rounded-radius-radius:calc(0.75rem-0.125rem)] [&&&_.target>*:last-child>*]:rounded-r-[calc(0.75rem-0.125rem)]"
          />
        </div>
      </SectionContent>
    </Section>
  );
}
