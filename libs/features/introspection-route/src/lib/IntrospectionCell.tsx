import { useListDeployments } from '@restate/data-access/admin-api';
import { InvocationId, Target } from '@restate/features/invocation-route';
import { Deployment } from '@restate/features/overview-route';
import { Cell } from '@restate/ui/table';
import { DateTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { formatDurations } from '@restate/util/intl';
import { useDurationSinceLastSnapshot } from '@restate/util/snapshot-time';

const iso8601UTCPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function isISODateString(str: string) {
  return iso8601UTCPattern.test(str);
}

export function IntrospectionCell({
  col,
  row,
}: {
  col: string;
  row: Record<string, string>;
}) {
  const { data } = useListDeployments({ refetchOnMount: false });
  const services = Array.from(data?.services.keys() ?? []);
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

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
          showEndpoint={false}
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

  if (typeof value === 'string' && isISODateString(value)) {
    const date = new Date(value);
    const { isPast, ...parts } = durationSinceLastSnapshot(date);
    const duration = formatDurations(parts);

    return (
      <Cell>
        <span className="font-normal text-zinc-500">{!isPast && 'in '}</span>
        <DateTooltip date={date} title={col}>
          {duration}
        </DateTooltip>
        <span className="font-normal text-zinc-500">{isPast && ' ago'}</span>
      </Cell>
    );
  }
  const _formattedValue = formattedValue(value);
  return (
    <Cell className="min-h-6">
      {
        <TruncateWithTooltip
          size={
            typeof _formattedValue === 'string' &&
            (_formattedValue.length > 100 || _formattedValue.includes('\n'))
              ? 'lg'
              : 'sm'
          }
        >
          {_formattedValue ?? <br />}
        </TruncateWithTooltip>
      }
    </Cell>
  );
}

function formattedValue(value?: string) {
  if (value) {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch (_) {
      return value;
    }
  }
  return value;
}
