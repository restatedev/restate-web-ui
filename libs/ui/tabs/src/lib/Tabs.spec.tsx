import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from './Tabs';

afterEach(cleanup);

function renderTabs(
  selectedTab: string | null,
  onTabChange = vi.fn(),
  disabledFirstTab = false,
) {
  render(
    <>
      <button type="button">Before</button>
      <Tabs selectedTab={selectedTab} onTabChange={onTabChange}>
        <TabList aria-label="Lifecycle">
          <Tab id="all" disabled={disabledFirstTab}>
            All
          </Tab>
          <Tab id="open">Open</Tab>
          <Tab id="done">Done</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="all">All panel</TabPanel>
          <TabPanel id="open">Open panel</TabPanel>
          <TabPanel id="done">Done panel</TabPanel>
        </TabPanels>
      </Tabs>
    </>,
  );
  return onTabChange;
}

describe('Tabs', () => {
  it('selects the controlled tab', async () => {
    renderTabs('open');
    await act(() => Promise.resolve());

    expect(screen.getByRole('tab', { selected: true }).textContent).toBe(
      'Open',
    );
    expect(screen.getByRole('tabpanel').textContent).toBe('Open panel');
  });

  it('selects no tab and shows no panel when the selected tab is null', async () => {
    const onTabChange = renderTabs(null);
    await act(() => Promise.resolve());

    expect(screen.queryByRole('tab', { selected: true })).toBeNull();
    expect(screen.queryByRole('tabpanel')).toBeNull();
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('keeps tabs reachable by keyboard when no tab is selected', async () => {
    const onTabChange = renderTabs(null);

    await userEvent.click(screen.getByRole('button', { name: 'Before' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('tab', { name: 'All' }),
    );
    expect(onTabChange).not.toHaveBeenCalled();

    await userEvent.keyboard('{ArrowRight}');
    expect(onTabChange).toHaveBeenCalledWith('open');
  });

  it('skips a disabled first tab when no tab is selected', async () => {
    renderTabs(null, vi.fn(), true);

    await userEvent.click(screen.getByRole('button', { name: 'Before' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('tab', { name: 'Open' }),
    );
  });

  it('reports a click on a tab when no tab is selected', async () => {
    const onTabChange = renderTabs(null);

    await userEvent.click(screen.getByRole('tab', { name: 'Done' }));
    expect(onTabChange).toHaveBeenCalledWith('done');
  });
});
