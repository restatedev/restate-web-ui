import { Invocation } from '@restate/data-access/admin-api-spec';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from '@restate/util/styles';
import { ServiceTarget } from '@restate/features/service-target';

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
        <ServiceTarget
          scope={invocation.scope}
          service={invocation.target_service_name}
          serviceKey={invocation.target_service_key}
          handler={invocation.target_handler_name}
          serviceType={invocation.target_service_ty}
          className="text-0.5xs font-normal"
        />
      </SectionContent>
    </Section>
  );
}
