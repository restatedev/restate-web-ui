import { API } from '@restate/ui/api';
import { ErrorBanner } from '@restate/ui/error';
import { Spinner } from '@restate/ui/loading';
import { HANDLER_QUERY_PARAM } from '@restate/util/panel';
import { tv } from '@restate/util/styles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApiSpec } from './ServicePlayground';

const OPERATION_HASH_PREFIX = '#/operations/';

const styles = tv({
  base: '@container mx-4 mt-px mb-4 h-[calc(100dvh-var(--cp-content-top,0px)-1rem-1px)] min-h-[32rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs [&_.HttpOperation_h1]:hidden! @max-[56rem]:[&_.sl-elements-api>*:first-child]:hidden! @max-[56rem]:[&_.sl-elements-api>*:nth-child(2)]:px-4! @max-[56rem]:[&_.sl-elements-api>*:nth-child(2)>*]:pt-4! @max-[56rem]:[&_.sl-elements-api>*:nth-child(2)>*>*>*:last-child]:flex-col-reverse! @max-[56rem]:[&_.sl-elements-api>*:nth-child(2)>*>*>*>*]:mx-0! @max-[56rem]:[&_.sl-elements-api>*:nth-child(2)>*>*>*>*]:w-full! @max-[56rem]:[&_.sl-ml-16]:ml-0! @max-[56rem]:[&_.sl-ml-16]:w-full! @max-[56rem]:[&_.sl-ml-16]:max-w-none! [&_.sl-py-16]:py-8! @max-[56rem]:[&_.sl-stack--8]:gap-6!',
});

function operationFromHash() {
  const hash = window.location.hash;
  return hash.startsWith(OPERATION_HASH_PREFIX)
    ? hash.slice(OPERATION_HASH_PREFIX.length).split('#').at(0)
    : undefined;
}

export function ServicePlaygroundEmbed({
  service,
  handler,
  className,
}: {
  service: string;
  handler?: string | null;
  className?: string;
}) {
  const { apiSpec, handlers, error, isFetching, tryItFetcher } =
    useApiSpec(service);
  const navigate = useNavigate();
  const [mountKey, setMountKey] = useState<number>();
  const handlerRef = useRef(handler);
  const containerRef = useRef<HTMLDivElement>(null);
  handlerRef.current = handler;

  const handlerByOperation = useMemo(() => {
    const operations = Array.from(handlers.values()).flat();
    const names = operations
      .filter(({ id, name }) => id === name)
      .map(({ name }) => name)
      .sort((a, b) => b.length - a.length);
    return new Map(
      operations.flatMap(({ id }) => {
        const name = names.find((candidate) => id.startsWith(candidate));
        return name ? [[id, name] as const] : [];
      }),
    );
  }, [handlers]);

  useEffect(() => {
    const current = operationFromHash();
    const currentHandler = current
      ? handlerByOperation.get(current)
      : undefined;
    if (handler && currentHandler !== handler) {
      window.location.hash = `${OPERATION_HASH_PREFIX}${handler}`;
      setMountKey((key) => (key ?? 0) + 1);
    } else {
      setMountKey((key) => key ?? 0);
    }
  }, [handler, handlerByOperation]);

  useEffect(() => {
    const onHashChange = () => {
      const operation = operationFromHash();
      const name = operation ? handlerByOperation.get(operation) : undefined;
      if (!name || name === handlerRef.current) {
        return;
      }
      const next = new URLSearchParams(window.location.search);
      next.set(HANDLER_QUERY_PARAM, name);
      navigate(
        { search: `?${next.toString()}`, hash: window.location.hash },
        { replace: true, preventScrollReset: true },
      );
    };
    const onClick = () => window.setTimeout(onHashChange, 0);
    const container = containerRef.current;
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);
    container?.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
      container?.removeEventListener('click', onClick);
    };
  }, [handlerByOperation, navigate]);

  return (
    <div ref={containerRef} className={styles({ className })}>
      {error && <ErrorBanner errors={[error]} />}
      {apiSpec && mountKey !== undefined ? (
        <API
          apiDescriptionDocument={apiSpec}
          key={mountKey}
          layout="sidebar"
          tryItFetcher={tryItFetcher}
        />
      ) : isFetching || mountKey === undefined ? (
        <div className="flex h-full items-center justify-center gap-2.5 text-sm text-zinc-500">
          <Spinner className="h-5 w-5" />
          Loading…
        </div>
      ) : null}
    </div>
  );
}
