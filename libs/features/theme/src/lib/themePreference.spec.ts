import {
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
  applyStoredTheme,
  getThemePreference,
  setThemePreference,
  subscribeToThemePreference,
} from './themePreference';

function mockSystemTheme(isDark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: isDark && query === '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('themePreference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    mockSystemTheme(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows the system theme without a stored preference', () => {
    mockSystemTheme(true);
    applyStoredTheme();
    expect(getThemePreference()).toBe('system');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('lets a stored preference win over the system theme', () => {
    mockSystemTheme(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    applyStoredTheme();
    expect(getThemePreference()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('stores, applies and announces a new preference', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToThemePreference(listener);

    setThemePreference('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(listener).toHaveBeenCalledTimes(1);

    setThemePreference('system');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setThemePreference('dark');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('applies the stored theme from the standalone inline script', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    new Function(THEME_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('falls back to light when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    applyStoredTheme();
    expect(getThemePreference()).toBe('system');
    expect(document.documentElement.dataset.theme).toBe('light');
    vi.restoreAllMocks();
  });
});
