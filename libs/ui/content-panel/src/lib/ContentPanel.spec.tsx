import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { ContentPanel, isTabStateParam } from './ContentPanel';

class ResizeObserverMock implements ResizeObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}

const STORAGE_PREFIX = 'restate:content-panel-tab-state:/service:tab';

function renderPanel(url: string, stateful = true) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ContentPanel
        tabs={{
          items: [
            { id: 'invocations', label: 'Invocations' },
            { id: 'runs', label: 'Runs' },
          ],
          defaultId: 'invocations',
          queryParam: 'tab',
          ...(stateful ? { stateParams: isTabStateParam } : {}),
        }}
      >
        <div />
      </ContentPanel>
    </MemoryRouter>,
  );
}

function hrefOf(name: string) {
  const link = screen
    .getAllByRole('tab', { name })
    .map((tab) => tab.closest('a') ?? tab)
    .find((element) => element.getAttribute('href'));
  return new URL(link?.getAttribute('href') ?? '', 'http://localhost');
}

describe('ContentPanel stateful tabs', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserverMock;
  });

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('stashes the active tab state and drops it from other tab links', () => {
    renderPanel('/service?tab=runs&filter_id=abc&sort=backlog&handler=run');

    const invocations = hrefOf('Invocations');
    expect(invocations.searchParams.get('filter_id')).toBeNull();
    expect(invocations.searchParams.get('sort')).toBeNull();
    expect(invocations.searchParams.get('handler')).toBe('run');
    expect(invocations.searchParams.get('tab')).toBeNull();
    expect(window.sessionStorage.getItem(`${STORAGE_PREFIX}:runs`)).toBe(
      'filter_id=abc&sort=backlog',
    );
  });

  it('restores a tab state stashed earlier in the session', () => {
    window.sessionStorage.setItem(
      `${STORAGE_PREFIX}:runs`,
      'filter_id=abc&unrelated=1',
    );
    renderPanel('/service?filter_status=running');

    const runs = hrefOf('Runs');
    expect(runs.searchParams.get('tab')).toBe('runs');
    expect(runs.searchParams.get('filter_id')).toBe('abc');
    expect(runs.searchParams.get('filter_status')).toBeNull();
    expect(runs.searchParams.get('unrelated')).toBeNull();
    expect(window.sessionStorage.getItem(`${STORAGE_PREFIX}:invocations`)).toBe(
      'filter_status=running',
    );
  });

  it('forgets a tab state once its filters are cleared', () => {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}:runs`, 'filter_id=abc');
    renderPanel('/service?tab=runs');

    expect(window.sessionStorage.getItem(`${STORAGE_PREFIX}:runs`)).toBeNull();
  });

  it('keeps params across tabs when not stateful', () => {
    renderPanel('/service?filter_status=running', false);

    expect(hrefOf('Runs').searchParams.get('filter_status')).toBe('running');
    expect(window.sessionStorage.length).toBe(0);
  });
});
