export const LOGS_GRANULARITY_QUERY_PARAM_NAME = 'logsGranularity';
export const enum LogsGranularity {
  Live = 'Live',
  PT5M = 'PT5M',
  PT30M = 'PT30M',
  PT1H = 'PT1H',
}

export function isLogsGranularity(
  param: string | null
): param is LogsGranularity {
  return (
    !!param &&
    (
      [
        LogsGranularity.Live,
        LogsGranularity.PT1H,
        LogsGranularity.PT30M,
        LogsGranularity.PT5M,
      ] as string[]
    ).includes(param)
  );
}

export function toStartEnd(param: LogsGranularity) {
  const end = Math.floor(Date.now() / 1000);
  switch (param) {
    case LogsGranularity.PT1H:
      return { end, start: end - 60 * 60 };
    case LogsGranularity.PT30M:
      return { end, start: end - 30 * 60 };
    case LogsGranularity.Live:
    case LogsGranularity.PT5M:
      return { end, start: end - 5 * 60 };
  }
}
