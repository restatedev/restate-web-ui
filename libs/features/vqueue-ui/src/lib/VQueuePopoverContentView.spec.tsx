import type { VqueueSnapshot } from '@restate/data-access/admin-api-spec';
import { render, screen } from '@testing-library/react';
import { VQueuePopoverContent } from './VQueuePopoverContent';

const snapshot: VqueueSnapshot = {
  identity: {
    service: 'ExampleService',
    isPaused: false,
    vqueueId: 'vq_example',
  },
  status: {
    blocked: false,
  },
  counts: {
    inbox: 0,
    running: 2,
    suspended: 0,
    paused: 3,
    finished: 0,
  },
  stageAvg: {
    running: 'PT8S',
    suspended: 'PT6S',
  },
  events: {},
  head: {
    totalBlocks: [],
    nowBlocks: [],
    avgBlocks: [],
  },
};

describe('VQueuePopoverContent', () => {
  it('does not highlight a stale row stage without a fresh focused entry', () => {
    render(<VQueuePopoverContent data={snapshot} focusStage="running" />);

    const running = screen.getByRole('listitem', { name: /Running/ });

    expect(running.className).not.toContain('shadow-xs');
    expect(running.className).not.toContain('border-black/10');
  });
});
