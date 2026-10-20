import {
  getThemeVersion,
  resolveColor,
  resolveColorsDeep,
  subscribeToTheme,
} from './resolveColor';

describe('resolveColor', () => {
  it('returns the input when the color cannot be computed', () => {
    expect(resolveColor('var(--text-color-muted)')).toBe(
      'var(--text-color-muted)',
    );
  });

  it('only resolves strings that use variables and keeps functions', () => {
    const formatter = () => 'label';
    const option = {
      color: 'var(--background-color-accent)',
      axis: { label: 'Duration', formatter },
      stops: [{ offset: 0, color: 'var(--background-color-highlight)' }],
      data: ['var(--untouched)'],
    };
    const resolved = resolveColorsDeep(option, ['data']);
    expect(resolved.axis.formatter).toBe(formatter);
    expect(resolved.axis.label).toBe('Duration');
    expect(resolved.data).toBe(option.data);
    expect(resolved).not.toBe(option);
  });

  it('notifies subscribers when the theme attribute changes', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToTheme(listener);
    const before = getThemeVersion();
    document.documentElement.setAttribute('data-theme', 'dark');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(listener).toHaveBeenCalled();
    expect(getThemeVersion()).toBeGreaterThan(before);
    unsubscribe();
    document.documentElement.removeAttribute('data-theme');
  });
});
