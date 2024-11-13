import { useSearchParams, useNavigate } from '@remix-run/react';
import { useServiceOpenApi } from '@restate/data-access/admin-api';
import { Button } from '@restate/ui/button';
import { QueryDialog, DialogContent, DialogClose } from '@restate/ui/dialog';
import { Icon, IconName } from '@restate/ui/icons';
import { SERVICE_PLAYGROUND_QUERY_PARAM } from './constants';
import { ComponentProps, useMemo } from 'react';
import { useRestateContext } from '@restate/features/restate-context';
import { tv } from 'tailwind-variants';
import { API } from './StopLight';

const styles = tv({
  base: 'px-1.5 py-0.5 text-xs text-gray-600 font-normal font-sans rounded-md flex items-center gap-1',
});
export function ServicePlaygroundTrigger({
  service,
  handler,
  onClick,
  className,
  variant = 'icon',
}: {
  service: string;
  handler?: string;
  className?: string;
  onClick?: VoidFunction;
  variant?: ComponentProps<typeof Button>['variant'];
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data } = useServiceOpenApi(service);

  if (!data) {
    return null;
  }

  return (
    <Button
      onClick={() => {
        onClick?.();
        const searchParamsClone = new URLSearchParams(searchParams);
        searchParamsClone.set(SERVICE_PLAYGROUND_QUERY_PARAM, service);

        navigate({
          search: searchParamsClone.toString(),
          hash: handler ? `/operations/${service}-${handler}` : undefined,
        });
      }}
      variant={variant}
      className={styles({ className })}
      onHover={() => import('@stoplight/elements')}
    >
      Playground
      <Icon name={IconName.ExternalLink} className="w-3 h-3" />
    </Button>
  );
}

export function ServicePlayground() {
  const [searchParams] = useSearchParams();
  const service = searchParams.get(SERVICE_PLAYGROUND_QUERY_PARAM);
  const enabled = typeof service === 'string';
  const { data } = useServiceOpenApi(String(service), { enabled });
  const { ingressUrl } = useRestateContext();

  const apiSpec = useMemo(() => {
    return data
      ? JSON.stringify({
          servers: [{ url: ingressUrl }],
          ...data,
        })
      : undefined;
  }, [data, ingressUrl]);

  return (
    <QueryDialog query={SERVICE_PLAYGROUND_QUERY_PARAM}>
      <DialogContent
        variant="sheet"
        className='[&_*:has(>[data-test="mobile-top-nav"])]:w-[calc(100vw-1rem)] [&_*:has(>[data-test="mobile-top-nav"])]:rounded-t-[0.7rem]'
      >
        {apiSpec ? (
          <>
            <API
              apiDescriptionDocument={apiSpec}
              router="hash"
              hideExport
              layout="responsive"
            />
            <DialogClose>
              <Button variant="icon" className="absolute right-3 top-3">
                <Icon name={IconName.X} className="w-5 h-5" />
              </Button>
            </DialogClose>
          </>
        ) : null}
      </DialogContent>
    </QueryDialog>
  );
}
