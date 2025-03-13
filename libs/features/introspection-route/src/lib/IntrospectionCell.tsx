import { useListDeployments } from '@restate/data-access/admin-api';
import { InvocationId, Target } from '@restate/features/invocation-route';
import { Deployment } from '@restate/features/overview-route';
import { Cell } from '@restate/ui/table';

export function IntrospectionCell({
  col,
  row,
}: {
  col: string;
  row: Record<string, string>;
}) {
  const { data } = useListDeployments({ refetchOnMount: false });
  const services = Array.from(data?.services.keys() ?? []);

  if (col === '__actions__') {
    return <Cell />;
  }

  const value = row[col];
  if (typeof value === 'string' && value.startsWith('inv_')) {
    return (
      <Cell>
        <InvocationId id={value} />
      </Cell>
    );
  }

  if (typeof value === 'string' && value.startsWith('dp_')) {
    return (
      <Cell>
        <Deployment
          deploymentId={value}
          className="text-inherit p-0 pr-0.5 m-0 [&_a:before]:rounded-md max-w-full"
          highlightSelection={false}
        />
      </Cell>
    );
  }

  if (
    (col.includes('service_name') || col === 'name') &&
    typeof value === 'string' &&
    services.includes(value)
  ) {
    return (
      <Cell>
        <Target target={value} showHandler={false} />
      </Cell>
    );
  }
  return <Cell className="min-h-6 whitespace-pre-line">{value ?? <br />}</Cell>;
}
