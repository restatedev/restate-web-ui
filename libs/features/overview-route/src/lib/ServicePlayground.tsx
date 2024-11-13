import { useSearchParams, useNavigate } from '@remix-run/react';
import { useServiceOpenApi } from '@restate/data-access/admin-api';
import { Button } from '@restate/ui/button';
import { QueryDialog, DialogContent, DialogClose } from '@restate/ui/dialog';
import { Icon, IconName } from '@restate/ui/icons';
import { usePopover } from '@restate/ui/popover';
import { API } from '@stoplight/elements';
import { SERVICE_PLAYGROUND_QUERY_PARAM } from './constants';
import { useMemo } from 'react';
import { useRestateContext } from '@restate/features/restate-context';

export function ServicePlaygroundTrigger({
  service,
  handler,
}: {
  service: string;
  handler?: string;
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { close } = usePopover();

  return (
    <Button
      onClick={() => {
        close();
        const searchParamsClone = new URLSearchParams(searchParams);
        searchParamsClone.set(SERVICE_PLAYGROUND_QUERY_PARAM, service);

        navigate({
          search: searchParamsClone.toString(),
          hash: handler ? `/operations/${service}-${handler}` : undefined,
        });
      }}
      variant="icon"
      className="px-1.5 py-0.5 text-xs text-gray-600 font-normal rounded-md flex items-center gap-1"
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
      <DialogContent variant="sheet">
        {apiSpec ? (
          <>
            <API apiDescriptionDocument={apiSpec} router="hash" hideExport />
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
