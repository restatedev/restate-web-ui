import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from '@restate/util/styles';
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
          <div className="py-1 pl-2.5 text-code font-medium text-gray-500">
            Ingress
          </div>
        </SectionContent>
      )}
      {invocation.invoked_by === 'service' && (
        <SectionContent className="px-2 py-2" raised={false}>
          <div className="relative">
            <InvocationId id={invocation.invoked_by_id!} className="text-xs" />
            <div className="absolute top-6 bottom-[0.65rem] left-3 w-7 rounded-b border-b border-l border-dashed border-black/20" />
            <Target
              target={invocation.invoked_by_target}
              className="mt-1.5 ml-7 max-w-[calc(100%-1.75rem)] text-code font-normal"
            />
          </div>
        </SectionContent>
      )}
    </Section>
  );
}
