import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from '@restate/util/styles';
import { InvocationDeployment } from './InvocationDeployment';
import { SDK } from '@restate/features/overview-route';

const styles = tv({ base: '' });
export function DeploymentSection({
  invocation,
  isPending,
  className,
  raised = false,
}: {
  invocation?: Invocation;
  isPending?: boolean;
  className?: string;
  raised?: boolean;
}) {
  const deployment =
    invocation?.last_attempt_deployment_id ?? invocation?.pinned_deployment_id;
  const title = invocation?.last_attempt_deployment_id
    ? 'Last attempt deployment'
    : invocation?.pinned_deployment_id
      ? 'Pinned deployment'
      : undefined;
  if (!deployment) {
    return null;
  }

  return (
    <Section className={styles({ className })}>
      <SectionTitle>{title}</SectionTitle>
      <SectionContent className="p-0" raised={raised}>
        <InvocationDeployment
          invocation={invocation!}
          className="items-stretch text-0.5xs"
          showSdk={true}
        />
      </SectionContent>
    </Section>
  );
}
