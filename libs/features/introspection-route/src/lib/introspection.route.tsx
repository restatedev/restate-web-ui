import { useSqlQuery } from '@restate/data-access/admin-api';
import { lazy, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';

const SQLEditor = lazy(() =>
  import('./SQLEditor').then((m) => ({ default: m.SQLEditor }))
);

const QUERY_PARAM = 'query';
function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get(QUERY_PARAM) ?? '';
  const { isFetching, data } = useSqlQuery(query, { enabled: Boolean(query) });
  const [initialQuery] = useState(() => searchParams.get(QUERY_PARAM) ?? '');

  const setQuery = useCallback(
    (query: string) => {
      setSearchParams((old) => {
        const searchParams = new URLSearchParams(old);
        searchParams.set(QUERY_PARAM, query);
        return searchParams;
      });
    },
    [setSearchParams]
  );

  return (
    <div>
      {data && (
        <pre>
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      )}
      <SQLEditor
        setQuery={setQuery}
        isPending={isFetching}
        initialQuery={initialQuery}
      />
    </div>
  );
}

export const introspection = { Component };
