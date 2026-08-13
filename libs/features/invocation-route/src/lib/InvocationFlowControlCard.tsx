import type {
  JournalEntryV2,
  VqueueSnapshot,
} from '@restate/data-access/admin-api-spec';
import { InvocationJourneyCard } from './InvocationJourneyCard';
import {
  type InvocationJourneySource,
  useInvocationJourneyModel,
} from './useInvocationJourneyModel';

export interface InvocationFlowControlCardProps {
  invocation: InvocationJourneySource;
  data?: VqueueSnapshot;
  journalEntries?: JournalEntryV2[];
}

export function InvocationFlowControlCard(
  props: InvocationFlowControlCardProps,
) {
  const model = useInvocationJourneyModel(props);
  return model ? <InvocationJourneyCard model={model} /> : null;
}
