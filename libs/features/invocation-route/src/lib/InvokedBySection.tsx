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
      {invocation.invoked_by === 'ingress' && (
        <>
          <SectionTitle>Invoked by</SectionTitle>
          <SectionContent className="px-2 py-1 pb-2" raised={false}>
            <Badge>Ingress</Badge>
          </SectionContent>
        </>
      )}
      {invocation.invoked_by === 'service' && (
        <>
          <SectionTitle>Invoked by Id</SectionTitle>
          <SectionContent className="px-2 py-1" raised={false}>
            <InvocationId id={invocation.invoked_by_id!} />
          </SectionContent>
          <SectionTitle>Invoked by target</SectionTitle>
          <SectionContent className="px-2 py-1 pb-2" raised={false}>
            <Target target={invocation.invoked_by_target} />
          </SectionContent>
        </>
      )}
    </Section>
  );
}
