import {
  ClientLoaderFunctionArgs,
  ShouldRevalidateFunction,
  defer,
  redirect,
} from '@remix-run/react';
import { getEnvironmentLogs } from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';
import {
  LOGS_GRANULARITY_QUERY_PARAM_NAME,
  LogsGranularity,
  isLogsGranularity,
  toStartEnd,
} from './LogsGranularity';

export const shouldRevalidate: ShouldRevalidateFunction = ({
  actionResult,
  currentParams,
  currentUrl,
  defaultShouldRevalidate,
  formAction,
  formData,
  formEncType,
  formMethod,
  nextParams,
  nextUrl,
}) => {
  const currentGranularity = currentUrl.searchParams.get(
    LOGS_GRANULARITY_QUERY_PARAM_NAME
  );
  const nextGranularity = nextUrl.searchParams.get(
    LOGS_GRANULARITY_QUERY_PARAM_NAME
  );

  return currentGranularity !== nextGranularity;
};

export const clientLoader = async ({
  request,
  params,
}: ClientLoaderFunctionArgs) => {
  const accountId = params.accountId;
  const environmentId = params.environmentId;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');
  const url = new URL(request.url);
  const logsGranularity = new URL(request.url).searchParams.get(
    LOGS_GRANULARITY_QUERY_PARAM_NAME
  );

  if (!isLogsGranularity(logsGranularity)) {
    url.searchParams.set(
      LOGS_GRANULARITY_QUERY_PARAM_NAME,
      LogsGranularity.PT5M
    );
    return redirect(`${url.pathname}${url.search}${url.hash}`);
  }

  const { start, end } = toStartEnd(logsGranularity);

  const logsPromise = getEnvironmentLogs({
    environmentId,
    accountId,
    start: start / 1000,
    end: end / 1000,
  });

  return defer({
    logsPromise,
    start,
    end,
  });
};
