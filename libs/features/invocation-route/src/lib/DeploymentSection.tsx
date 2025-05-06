import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from 'tailwind-variants';
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
      <SectionContent className="px-2 py-2" raised={raised}>
        <div className="relative">
          <InvocationDeployment
            invocation={invocation!}
            className="items-stretch text-code"
            showSdk={false}
          />
          {invocation?.last_attempt_server && (
            <>
              <div className="absolute w-6 rounded-br-none border-l border-b  border-black/20 border-dashed left-3 top-6 bottom-[0.825rem] rounded-b" />
              <SDK
                lastAttemptServer={invocation?.last_attempt_server}
                className="mt-1.5 text-xs font-normal text-zinc-500 gap-2 ml-7"
              />
            </>
          )}
        </div>
      </SectionContent>
    </Section>
  );
}
