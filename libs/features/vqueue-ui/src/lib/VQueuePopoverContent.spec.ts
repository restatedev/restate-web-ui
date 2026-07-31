import { inboxOrderItems } from './VQueuePopoverContent';

describe('inboxOrderItems', () => {
  it('renders literal neighboring entries and a gap after a focus near the head', () => {
    expect(inboxOrderItems(998, 2)).toEqual([
      { type: 'entry', index: 0 },
      { type: 'entry', index: 1 },
      { type: 'entry', index: 2 },
      { type: 'entry', index: 3 },
      { type: 'entry', index: 4 },
      { type: 'gap', count: 993, position: 'after' },
    ]);
  });

  it('uses explicit gaps around a focused window deep in the Inbox', () => {
    expect(inboxOrderItems(998, 247)).toEqual([
      { type: 'gap', count: 245, position: 'before' },
      { type: 'entry', index: 245 },
      { type: 'entry', index: 246 },
      { type: 'entry', index: 247 },
      { type: 'entry', index: 248 },
      { type: 'entry', index: 249 },
      { type: 'gap', count: 748, position: 'after' },
    ]);
  });

  it('shows literal entries from the head when no entry is focused', () => {
    expect(inboxOrderItems(8)).toEqual([
      { type: 'entry', index: 0 },
      { type: 'entry', index: 1 },
      { type: 'entry', index: 2 },
      { type: 'entry', index: 3 },
      { type: 'entry', index: 4 },
      { type: 'entry', index: 5 },
      { type: 'gap', count: 2, position: 'after' },
    ]);
  });
});
