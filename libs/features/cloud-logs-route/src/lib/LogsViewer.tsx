import { Form, useAsyncValue, useSearchParams } from '@remix-run/react';
import {
  LogLine,
  getEnvironmentLogs,
} from '@restate/data-access/cloud/api-client';
import { Button, Spinner } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { useLiveLogs } from './useLiveLogs';
import { useCallback, useState } from 'react';
import { LOG_CONTAINER_ID } from './constants';
import { GridList, GridListItem } from './GridList';
import {
  LOGS_GRANULARITY_QUERY_PARAM_NAME,
  LogsGranularity,
} from './LogsGranularity';
import { Key } from 'react-aria-components';

export function LogsViewer() {
  const logs = useAsyncValue() as Awaited<
    ReturnType<typeof getEnvironmentLogs>
  >;
  const [isSelectionEnabled, setIsSelectionEnabled] = useState(false);
  const [searchParams] = useSearchParams();
  const isLiveLogsEnabled =
    searchParams.get(LOGS_GRANULARITY_QUERY_PARAM_NAME) ===
    LogsGranularity.Live;

  const onPull = useCallback(() => {
    const logsContainer = document.getElementById(LOG_CONTAINER_ID);
    // eslint-disable-next-line react-hooks/rules-of-hooks

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
  const [selectedKeys, setSelectedKeys] = useState<'all' | Set<Key>>(
    new Set<Key>()
  );

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

  return (
    <>
      <div className="absolute z-30 top-2 flex-col flex items-end  right-2">
        {!isSelectionEnabled && (
          <Button
            variant="secondary"
            className="px-2"
            onClick={() => setIsSelectionEnabled(true)}
          >
            <Icon name={IconName.SquareCheckBig} />
          </Button>
        )}
        {isSelectionEnabled && (
          <Button
            variant="secondary"
            className="px-2"
            onClick={() => {
              setIsSelectionEnabled(false);
              setSelectedKeys(new Set());
              if (selectedKeys instanceof Set) {
                const selectedLogs = [
                  ...(logs.data?.lines ?? []),
                  ...(isLiveLogsEnabled ? liveLogLines : []),
                ]
                  .filter(({ unixNanos }) => selectedKeys.has(unixNanos))
                  .map(({ line }) => JSON.stringify(line));
                navigator.clipboard.writeText(selectedLogs.join('\n'));
              }
            }}
          >
            <Icon name={IconName.Copy} />
          </Button>
        )}
      </div>
      <div
        className="py-6 absolute inset-0 overflow-auto"
        id={LOG_CONTAINER_ID}
      >
        <GridList<LogLine>
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          aria-label="Logs"
          selectionMode={isSelectionEnabled ? 'multiple' : 'none'}
          className="w-full"
          renderEmptyState={() => (
            <p className="p-3 text-sm text-gray-500">No logs found</p>
          )}
        >
          {logs.data?.lines.map((line) => (
            <LogLine
              key={line.unixNanos}
              line={line.line}
              unixNanos={line.unixNanos}
              isSelectable={isSelectionEnabled}
            />
          ))}
          {liveLogLines.map((line, i) => (
            <LogLine
              key={line.unixNanos}
              line={line.line}
              unixNanos={line.unixNanos}
              isSelectable={isSelectionEnabled}
            />
          ))}
        </GridList>
        {isLiveLogsEnabled && (
          <p className="font-sans flex gap-2 px-8 items-center text-sm py-4 text-gray-400">
            <Spinner />
            Waiting for logs...
          </p>
        )}
      </div>
    </>
  );
}

function LogLine({
  line,
  unixNanos,
  isSelectable,
}: {
  line: string;
  unixNanos: string;
  isSelectable?: boolean;
}) {
  const { timestamp, level, ...logObject } = JSON.parse(line);

  return (
    <GridListItem
      value={{ unixNanos, line }}
      id={unixNanos}
      className={`text-xs border-none ${
        ['WARN', 'ERROR'].includes(level)
          ? 'text-red-600 font-semibold'
          : 'text-gray-800 font-normal'
      }`}
    >
      <div className="flex-shrink-0 flex-grow-0 basis-[25ch] text-gray-500 font-normal">
        {new Date(Number(BigInt(unixNanos) / BigInt(1000000))).toLocaleString(
          'default',
          {
            timeZoneName: 'short',
          }
        )}
      </div>
      <div className="flex-shrink-0 flex-grow-0 basis-[7ch]">{level}</div>
      <details
        className={`group flex-auto min-w-0 ${
          isSelectable ? 'pointer-events-none2' : ''
        }`}
      >
        <summary className="truncate">
          <span className="group-open:invisible group-open:[font-size:0px]">
            {logObject?.fields?.message ??
              logObject?.fields?.error ??
              JSON.stringify(logObject)}
          </span>
        </summary>
        <span className="px-2">{JSON.stringify(logObject, null, 2)}</span>
      </details>
    </GridListItem>
  );
}
