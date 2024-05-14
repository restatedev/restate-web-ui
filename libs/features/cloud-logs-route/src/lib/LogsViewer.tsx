import { Form, useAsyncValue, useSearchParams } from '@remix-run/react';
import { getEnvironmentLogs } from '@restate/data-access/cloud/api-client';
import { Button } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { useLiveLogs } from './useLiveLogs';
import { useCallback } from 'react';
import { LOG_CONTAINER_ID } from './constants';
import {
  LOGS_GRANULARITY_QUERY_PARAM_NAME,
  LogsGranularity,
} from './LogsGranularity';

export function LogsViewer() {
  const logs = useAsyncValue() as Awaited<
    ReturnType<typeof getEnvironmentLogs>
  >;
  const onPull = useCallback(() => {
    const logsContainer = document.getElementById(LOG_CONTAINER_ID);

    if (logsContainer instanceof HTMLElement) {
      const distanceFromBottom =
        logsContainer.scrollHeight -
        logsContainer.scrollTop -
        logsContainer.clientHeight;
      const isAtBottom = distanceFromBottom < 50;

      isAtBottom &&
        requestAnimationFrame(() => {
          logsContainer.scrollTo(0, logsContainer.scrollHeight + 100);
        });
    }
  }, []);

  const liveLogLines = useLiveLogs({ onPull });
  const [searchParams] = useSearchParams();
  const isLiveLogsEnabled =
    searchParams.get(LOGS_GRANULARITY_QUERY_PARAM_NAME) ===
    LogsGranularity.Live;

  if (logs.error) {
    return (
      <div className="font-sans">
        <ErrorBanner errors={[new Error(`Failed to load logs.`)]}>
          <Form method="GET">
            <Button
              type="submit"
              variant="secondary"
              className="flex items-center px-3 py-1"
            >
              <Icon name={IconName.Retry} className="w-[1.125em]" /> Retry
            </Button>
          </Form>
        </ErrorBanner>
      </div>
    );
  }

  if (logs.data.lines.length === 0 && !isLiveLogsEnabled) {
    return <p className="p-3 text-sm text-gray-500">No logs found</p>;
  }

  return (
    <table className="w-full table-fixed">
      <tbody className="">
        {logs.data?.lines.map((line) => (
          <LogLine
            key={line.unixNanos}
            line={line.line}
            unixNanos={line.unixNanos}
          />
        ))}
        {liveLogLines.map((line, i) => (
          <LogLine
            key={line.unixNanos}
            line={line.line}
            unixNanos={line.unixNanos}
          />
        ))}
      </tbody>
    </table>
  );
}

function LogLine({ line, unixNanos }: { line: string; unixNanos: string }) {
  const { timestamp, level, ...logObject } = JSON.parse(line);

  return (
    <tr
      className={`bg-transparent border-none ${
        ['WARN', 'ERROR'].includes(level)
          ? 'text-red-600 font-semibold'
          : 'text-gray-800 font-normal'
      }`}
    >
      <th className="align-baseline font-normal text-gray-500 whitespace-nowrap w-[25ch]">
        {new Date(Number(BigInt(unixNanos) / BigInt(1000000))).toLocaleString(
          'default',
          {
            timeZoneName: 'short',
          }
        )}
      </th>
      <td className="pl-4 align-baseline pb-2 w-[10ch]">{level}</td>
      <td className="pl-4 align-baseline pb-2 break-all">
        <details className="group">
          <summary className="truncate">
            <span className="group-open:invisible group-open:[font-size:0px]">
              {logObject?.fields?.message ??
                logObject?.fields?.error ??
                JSON.stringify(logObject)}
            </span>
          </summary>
          <span className="px-2">{JSON.stringify(logObject, null, 2)}</span>
        </details>
      </td>
    </tr>
  );
}
