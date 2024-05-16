import { Form, useAsyncValue, useSearchParams } from '@remix-run/react';
import {
  LogLine,
  getEnvironmentLogs,
} from '@restate/data-access/cloud/api-client';
import { Button, Spinner } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { useLiveLogs } from './useLiveLogs';
import { ReactNode, memo, useCallback, useState } from 'react';
import { LOG_CONTAINER_ID } from './constants';
import { GridList, GridListItem } from './GridList';
import {
  LOGS_GRANULARITY_QUERY_PARAM_NAME,
  LogsGranularity,
} from './LogsGranularity';
import { Key } from 'react-aria-components';
import { Link } from '@restate/ui/link';

function sortLogLine(a: LogLine, b: LogLine) {
  if (a.unixNanos > b.unixNanos) {
    return 1;
  }
  if (a.unixNanos < b.unixNanos) {
    return -1;
  }
  return 0;
}
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
  const hasAnyLogs = (logs.data?.lines ?? []).length + liveLogLines.length > 0;

  if (logs.error) {
    return (
      <div className="font-sans p-2">
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
      {hasAnyLogs && (
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
      )}
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
          renderEmptyState={() =>
            isLiveLogsEnabled ? null : (
              <p className="px-6 text-sm text-gray-500">No logs found</p>
            )
          }
        >
          {logs.data?.lines.sort(sortLogLine).map((line) => (
            <OptimizedLogLine
              key={line.unixNanos}
              line={line.line}
              unixNanos={line.unixNanos}
            />
          ))}
          {liveLogLines.sort(sortLogLine).map((line, i) => (
            <OptimizedLogLine
              key={line.unixNanos}
              line={line.line}
              unixNanos={line.unixNanos}
            />
          ))}
        </GridList>
        {isLiveLogsEnabled && (
          <p className="font-sans flex gap-2 px-8 py-2 items-center text-sm text-gray-400">
            <Spinner />
            Waiting for logs...
          </p>
        )}
      </div>
    </>
  );
}

const DOCS_REGEXP = /https:\/\/docs\.restate\.dev[^\s"]*/gm;
// TODO: refactor
function addDocLink(message: string): ReactNode {
  let element: ReactNode = message;
  if (typeof message === 'string') {
    const match = message.match(DOCS_REGEXP);
    if (match) {
      const [start, end] = message.split(match[0]);
      element = (
        <>
          {start}
          <Link href={match[0]} target="_blank" rel="noreferrer noopener">
            {match[0]}
          </Link>
          {end}
        </>
      );
    }
  }

  return element;
}

function LogLine({ line, unixNanos }: { line: string; unixNanos: string }) {
  const { timestamp, level, ...logObject } = JSON.parse(line);
  const stringifiedLog = JSON.stringify(logObject, null, 2);
  const hasMessageField = Boolean(logObject?.fields?.message);
  const hasErrorField = !hasMessageField && Boolean(logObject?.fields?.error);
  const allFields = { ...logObject?.fields, ...logObject?.span };

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
      <details className={`group flex-auto min-w-0`}>
        <summary className="">
          <span className="group-open:invisible group-open:[font-size:0px]">
            <span>
              {addDocLink(
                logObject?.fields?.message ??
                  logObject?.fields?.error ??
                  stringifiedLog
              )}
            </span>
            <br className="group-open:hidden" />
            <span>
              {Object.keys(allFields)
                .filter(
                  (key) =>
                    (hasMessageField && key !== 'message') ||
                    (hasErrorField && key !== 'error')
                )
                .map((key) => (
                  <span className="ml-4" key={key}>
                    {key}: {addDocLink(allFields[key])}
                    <br className="group-open:hidden" />
                  </span>
                ))}
            </span>
          </span>
        </summary>
        <span className="px-2">{addDocLink(stringifiedLog)}</span>
      </details>
    </GridListItem>
  );
}

const OptimizedLogLine = memo(LogLine);
