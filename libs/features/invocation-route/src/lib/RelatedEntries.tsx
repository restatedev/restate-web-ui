import type { JournalEntryV2 } from '@restate/data-access/admin-api';
import { ActionPortal } from './Portals';
import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';
import { isRestateAsNewSupported } from './actions/Actions';
import { useJournalContext } from './JournalContext';
import { Link } from '@restate/ui/link';
import {
  RESTART_AS_NEW_INVOCATION_FROM_QUERY_PARAM,
  RESTART_AS_NEW_INVOCATION_QUERY_PARAM,
} from './actions/RestartInvocation';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';

export function RestartAction({
  invocation,
  entry,
  depth = 0,
}: {
  invocation?: ReturnType<
    typeof useGetInvocationJournalWithInvocationV2
  >['data'];
  entry?: JournalEntryV2;
  depth?: number;
}) {
  const { firstPendingCommandIndex } = useJournalContext();
  if (
    depth === 0 &&
    invocation &&
    isRestateAsNewSupported(invocation) &&
    entry?.category === 'command' &&
    entry?.type !== 'Output' &&
    entry
  ) {
    if (
      typeof firstPendingCommandIndex === 'number' &&
      typeof entry.index === 'number' &&
      entry.index >= firstPendingCommandIndex
    ) {
      return null;
    }

    return (
      <ActionPortal invocationId={String(invocation?.id)} entry={entry}>
        <HoverTooltip
          content={`Restart as new from ${entry.commandIndex}`}
          size="sm"
        >
          <Link
            href={`?${RESTART_AS_NEW_INVOCATION_QUERY_PARAM}=${invocation.id}&${RESTART_AS_NEW_INVOCATION_FROM_QUERY_PARAM}=${entry.index}`}
            variant="secondary-button"
            className="m-1 flex items-center justify-center rounded-md px-0.5 py-1 text-blue-500"
          >
            <Icon name={IconName.Restart} className="h-4 w-4" />
          </Link>
        </HoverTooltip>
      </ActionPortal>
    );
  }
  return null;
}
