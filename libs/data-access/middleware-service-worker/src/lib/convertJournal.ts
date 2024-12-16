import type { JournalEntry } from '@restate/data-access/admin-api';
import { convertToUTC } from './convertToUTC';

export function convertJournal(journal: JournalEntry) {
  return {
    ...journal,
    sleep_wakeup_at: convertToUTC((journal as any).sleep_wakeup_at),
  };
}
