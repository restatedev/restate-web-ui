import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import { InvocationId, Target } from '@restate/features/invocation-route';
import { Deployment } from '@restate/features/deployment';
import { Cell } from '@restate/ui/table';
import { DateTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { formatDurations, formatNumber } from '@restate/util/intl';
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
          className="m-0 max-w-full p-0 pr-0.5 text-inherit [&_a:before]:rounded-md"
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
  if (Array.isArray(value)) {
    const _formattedValue = value
      .map((item) => formattedValue(item))
      .join(', \n');
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
  if (value !== null && value !== undefined) {
    try {
      return value.length < 10000
        ? JSON.stringify(JSON.parse(value), null, 2)
        : value.slice(0, 10000) +
            ` … ${formatNumber(value.length - 10000, true)} more characters`;
    } catch (_) {
      return value;
    }
  }
  return value;
}
