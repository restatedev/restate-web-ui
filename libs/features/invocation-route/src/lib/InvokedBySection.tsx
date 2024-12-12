import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from 'tailwind-variants';
import { Target } from './Target';
import { InvocationId } from './InvocationId';

const styles = tv({ base: '' });
export function InvokedBySection({
  invocation,
  isPending,
  className,
}: {
  invocation?: Invocation;
  isPending?: boolean;
  className?: string;
}) {
  if (!invocation) {
    return null;
  }

  return (
    <Section className={styles({ className })}>
      <SectionTitle>Invoked by</SectionTitle>
      {invocation.invoked_by === 'ingress' && (
        <SectionContent className="p-0" raised={true}>
          <div className="text-code text-gray-500 font-medium pl-2.5 py-1">
            Ingress
          </div>
        </SectionContent>
      )}
      {invocation.invoked_by === 'service' && (
        <SectionContent className="px-2 py-2" raised={false}>
          <div className="relative">
            <InvocationId id={invocation.invoked_by_id!} className="text-xs " />
            <div className="absolute w-7 border-l border-b  border-black/20 border-dashed left-3 top-6 bottom-[0.65rem] rounded-b" />
            <Target
              target={invocation.invoked_by_target}
              className="text-code mt-1.5 ml-7 font-normal max-w-[calc(100%-1.75rem)]"
            />
          </div>
        </SectionContent>
      )}
    </Section>
  );
}
