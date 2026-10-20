import { InvocationId } from '@restate/features-invocation-route';
import { Target } from '@restate/features-service-target';
import { Deployment } from '@restate/features-deployment';
import { Cell } from '@restate/ui-table';
import { DateTooltip, TruncateWithTooltip } from '@restate/ui-tooltip';
import { formatDurations, formatNumber } from '@restate/util-intl';
import { useDurationSinceLastSnapshot } from '@restate/util-snapshot-time';
import { createContext, use } from 'react';

const iso8601UTCPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function isISODateString(str: string) {
  return iso8601UTCPattern.test(str);
}

type IntrospectionValueType = string | number | boolean | undefined | null;
type IntrospectionRow = Record<string, IntrospectionValueType>;

export const IntrospectionServicesContext = createContext<ReadonlySet<string>>(
  new Set(),
);

function isServiceColumn(col: string) {
  return col.includes('service_name') || col === 'name';
}

export function renderIntrospectionCell(col: string, row: IntrospectionRow) {
  if (col === '__actions__') {
    return <Cell key={col} />;
  }

  const value = row[col];
  const className =
    typeof value === 'string' &&
    (value.startsWith('inv_') || value.startsWith('dp_'))
      ? undefined
      : typeof value === 'string' && isServiceColumn(col)
        ? 'pr-2'
        : typeof value === 'string' && isISODateString(value)
          ? undefined
          : 'min-h-6';

  return (
    <Cell key={col} className={className}>
      <IntrospectionValue col={col} value={value} />
    </Cell>
  );
}

function IntrospectionValue({
  col,
  value,
}: {
  col: string;
  value: IntrospectionValueType | IntrospectionValueType[];
}) {
  const services = use(IntrospectionServicesContext);
  if (typeof value === 'string' && value.startsWith('inv_')) {
    return <InvocationId id={value} />;
  }

  if (typeof value === 'string' && value.startsWith('dp_')) {
    return (
      <Deployment
        deploymentId={value}
        className="m-0 max-w-full p-0 pr-0.5 text-inherit [&_a:before]:rounded-md"
        showEndpoint={false}
      />
    );
  }

  if (
    typeof value === 'string' &&
    isServiceColumn(col) &&
    services.has(value)
  ) {
    return <Target target={value} showHandler={false} />;
  }

  if (typeof value === 'string' && isISODateString(value)) {
    return <DateValue col={col} value={value} />;
  }

  const _formattedValue = Array.isArray(value)
    ? value.map((item) => formattedValue(item)).join(', \n')
    : value !== undefined
      ? formattedValue(String(value))
      : undefined;

  return (
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
  );
}

function DateValue({ col, value }: { col: string; value: string }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const date = new Date(value);
  const { isPast, ...parts } = durationSinceLastSnapshot(date);
  const duration = formatDurations(parts);

  return (
    <>
      <span className="font-normal text-muted">{!isPast && 'in '}</span>
      <DateTooltip date={date} title={col}>
        {duration}
      </DateTooltip>
      <span className="font-normal text-muted">{isPast && ' ago'}</span>
    </>
  );
}

function formattedValue(value?: IntrospectionValueType) {
  if (typeof value === 'string') {
    try {
      if (value.length < 10000) {
        const parsed = JSON.parse(value);
        if (parsed === Infinity) {
          throw new Error('cannot parse');
        }
        return JSON.stringify(parsed, null, 2);
      }
      return (
        value.slice(0, 10000) +
        ` … ${formatNumber(value.length - 10000, true)} more characters`
      );
    } catch (e) {
      return value;
    }
  }
  return value;
}
