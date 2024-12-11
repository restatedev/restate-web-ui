import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from 'tailwind-variants';
import { Target } from './Target';
import { Badge } from '@restate/ui/badge';
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
        <SectionContent className="px-2 py-1 pb-2" raised={false}>
          <Badge className="">Ingress</Badge>
        </SectionContent>
      )}
      {invocation.invoked_by === 'service' && (
        <SectionContent className="px-2 py-2" raised={false}>
          <div className="relative">
            <Target
              target={invocation.invoked_by_target}
              className="text-code mt-1"
            />
            <div className="absolute w-5 border-l border-b  border-black/20 border-dashed left-3.5 top-7 bottom-[0.65rem] rounded-b" />
            <InvocationId
              id={invocation.invoked_by_id!}
              className="text-xs mt-1.5 ml-5"
            />
          </div>
        </SectionContent>
      )}
    </Section>
  );
}
