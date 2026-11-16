import { Heading } from 'react-aria-components';
import { useServiceDetails } from '@restate/data-access-admin-api-hooks';
import { isPublicService } from '@restate/data-access-admin-api-spec';
import { Button } from '@restate/ui-button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui-dialog';
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
  base: 'relative inline-flex shrink-0 items-center px-1 py-1 align-middle text-subtle',
});

const PRIVATE_PLAY_NOTE = 'Private: only other services can call it';

export function privateTargetNote(target: 'service' | 'handler') {
  return `Only other services can call this ${target}`;
}

function privateServiceMessage(service: string) {
  return `${service} is private: only other services can call it.`;
}

export function PrivatePlayButton({ className }: { className?: string }) {
  return (
    <HoverTooltip
      content={PRIVATE_PLAY_NOTE}
      contentClassName="max-w-64 break-normal"
    >
      <span
        role="img"
        aria-label={PRIVATE_PLAY_NOTE}
        className={markStyles({ className })}
      >
        <Icon name={IconName.PlayOff} className="ml-px h-3 w-3" />
      </span>
    </HoverTooltip>
  );
}

export function useIsPrivateService(service?: string | null) {
  const enabled = typeof service === 'string' && Boolean(service);
  const { data } = useServiceDetails(String(service), {
    enabled,
    refetchOnMount: false,
  });
  return enabled && Boolean(data) && !isPublicService(data);
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
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted">
        <Icon name={IconName.EyeOff} className="h-5 w-5 text-subtle" />
        {privateServiceMessage(String(service))}
      </div>
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
