import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from 'tailwind-variants';
import { ServiceHandler } from './Target';

const styles = tv({ base: '' });
export function ServiceHandlerSection({
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
      <SectionTitle>Service / Handler</SectionTitle>
      <SectionContent className="px-2 pt-2" raised={false}>
        <ServiceHandler
          service={invocation.target_service_name}
          handler={invocation.target_handler_name}
        />
      </SectionContent>
    </Section>
  );
}
