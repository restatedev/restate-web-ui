import type { Invocation } from '@restate/data-access-admin-api-spec';
import { InvocationChain } from '@restate/features-invocation-ui';
import { Card, CardHeader } from '@restate/ui-card';
import { IconName } from '@restate/ui-icons';

export function InvocationChainCard({
  invocation,
  className,
}: {
  invocation?: Invocation;
  className?: string;
}) {
  if (!invocation?.invoked_by_id) return null;

  return (
    <Card intent="none" className={className}>
      <CardHeader title="Invoked by" icon={IconName.ListTree} />
      <InvocationChain invocation={invocation} className="px-3 py-2.5" />
    </Card>
  );
}
