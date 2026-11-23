import { Heading } from 'react-aria-components';
import {
  useServiceCatalog,
  useServiceDetails,
} from '@restate/data-access-admin-api-hooks';
import { isPublicService } from '@restate/data-access-admin-api-spec';
import { Button } from '@restate/ui-button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui-dialog';
import { EmptyState } from '@restate/ui-empty-state';
import { Icon, IconName } from '@restate/ui-icons';
import {
  ComplementaryClose,
  ComplementaryHeader,
  useParamValue,
} from '@restate/ui-layout';
import { HoverTooltip } from '@restate/ui-tooltip';
import {
  clearPlaygroundHandler,
  SERVICE_PLAYGROUND_QUERY_PARAM,
} from '@restate/util-panel';
import { tv } from '@restate/util-styles';
import { HeaderButton } from './NextServicePlayground';

const markStyles = tv({
  base: 'relative inline-flex shrink-0 items-center rounded-md px-1 py-1 align-middle text-subtle hover:bg-transparent pressed:bg-transparent',
});

const PRIVATE_PLAY_NOTE = 'Private: only other services can call it';

export function privateTargetNote(target: 'service' | 'handler') {
  return `Only other services can call this ${target}`;
}

function privateServiceMessage(service: string) {
  return `Only other services can call ${service}.`;
}

export function PrivatePlayButton({ className }: { className?: string }) {
  return (
    <HoverTooltip
      content={PRIVATE_PLAY_NOTE}
      contentClassName="max-w-64 break-normal"
    >
      <Button
        variant="icon"
        aria-label={PRIVATE_PLAY_NOTE}
        className={markStyles({ className })}
      >
        <Icon name={IconName.PlayOff} size="xs" className="ml-px" />
      </Button>
    </HoverTooltip>
  );
}

export function useIsPrivateService(service?: string | null) {
  const enabled = typeof service === 'string' && Boolean(service);
  const { data } = useServiceDetails(String(service), {
    enabled,
    refetchOnMount: false,
  });
  const { data: catalog } = useServiceCatalog();
  const known = data ?? catalog.get(String(service));
  return enabled && Boolean(known) && !isPublicService(known);
}

export function PrivatePlaygroundPanel() {
  const service = useParamValue();
  return (
    <>
      <ComplementaryHeader>
        <ComplementaryClose>
          <HeaderButton label="Close" icon={IconName.X} />
        </ComplementaryClose>
      </ComplementaryHeader>
      <EmptyState
        icon={IconName.PlayOff}
        title="No playground"
        description={privateServiceMessage(String(service))}
      />
    </>
  );
}

export function PrivatePlaygroundSheet({ service }: { service: string }) {
  return (
    <QueryDialog
      query={SERVICE_PLAYGROUND_QUERY_PARAM}
      onCloseQueryParam={clearPlaygroundHandler}
    >
      <DialogContent className="max-w-lg">
        <div className="flex flex-col gap-2">
          <Heading
            slot="title"
            level={3}
            className="text-lg leading-6 font-medium text-primary"
          >
            No playground
          </Heading>
          <p className="text-sm text-muted">{privateServiceMessage(service)}</p>
          <DialogFooter>
            <DialogClose>
              <Button variant="secondary" className="w-full">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </QueryDialog>
  );
}
