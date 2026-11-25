import {
  composeStories,
  setProjectAnnotations,
  type composeStory,
} from '@storybook/react-vite';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import preview from './.storybook/preview';

setProjectAnnotations(preview);

const PAGE_RULES = ['region'];
const OPEN_FINDINGS: Record<string, string[]> = {
  './src/data-display/Table.stories.tsx': ['empty-table-header'],
  './src/feedback/WaveAnimation.stories.tsx': ['empty-table-header'],
  './src/forms/Filters.stories.tsx': ['empty-table-header'],
  './src/forms/ListBox.stories.tsx': ['aria-toggle-field-name'],
  './src/layout/AppLayout.stories.tsx': ['landmark-unique'],
  './src/layout/ContentPanel.stories.tsx': [
    'aria-valid-attr-value',
    'empty-table-header',
  ],
  './src/overlays/Dropdown.stories.tsx': [
    'landmark-no-duplicate-banner',
    'landmark-unique',
  ],
};

const files = import.meta.glob<Parameters<typeof composeStories>[0]>(
  './src/**/*.stories.tsx',
  { eager: true },
);

describe.each(Object.entries(files))('%s', (path, file) => {
  const rules = Object.fromEntries(
    [...PAGE_RULES, ...(OPEN_FINDINGS[path] ?? [])].map((id) => [
      id,
      { enabled: false },
    ]),
  );
  const stories = Object.entries(
    composeStories(file) as Record<string, ReturnType<typeof composeStory>>,
  ).filter(([, Story]) => Story.tags.includes('test'));
  it.each(stories)('%s', async (_, Story) => {
    await Story.run();
    const { violations } = await axe.run(document.body, { rules });
    expect(
      violations.map(
        ({ id, help, nodes }) =>
          `${id}: ${help} (${nodes.map(({ target }) => target).join(', ')})`,
      ),
    ).toEqual([]);
  });
});
