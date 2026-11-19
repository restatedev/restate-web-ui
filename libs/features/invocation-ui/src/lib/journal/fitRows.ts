import { tv } from '@restate/util-styles';
import { useJournalEntriesContext } from './JournalContext';

export function useIsFit() {
  return Boolean(useJournalEntriesContext().isFit);
}

const FAILURE_SHRINK_LENGTH = 16;

const failureStyles = tv({
  base: 'text-2xs',
  variants: {
    fit: {
      none: '',
      long: 'min-w-32 flex-[0_1000000000000_auto]',
      short: 'shrink-0',
    },
  },
});

export function getFailureClassName(
  isFit: boolean,
  message = '',
  className?: string,
) {
  return failureStyles({
    fit: !isFit
      ? 'none'
      : message.length > FAILURE_SHRINK_LENGTH
        ? 'long'
        : 'short',
    className,
  });
}

const SERVICE_SHRINK_LENGTH = 10;
const KEY_SHRINK_LENGTH = 7;

export function getFitTargetSegments(service: string, serviceKey?: string) {
  return {
    service: service.length > SERVICE_SHRINK_LENGTH ? 'long' : 'short',
    serviceKey:
      (serviceKey?.length ?? 0) > KEY_SHRINK_LENGTH ? 'long' : 'short',
  } as const;
}
