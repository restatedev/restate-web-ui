export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'restate-theme';

const listeners = new Set<() => void>();

export function applyStoredTheme() {
  let isDark = false;
  try {
    const preference = window.localStorage.getItem('restate-theme');
    isDark =
      preference === 'dark' ||
      (preference !== 'light' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch {
    isDark = false;
  }
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
}

export const THEME_SCRIPT = `(${applyStoredTheme.toString()})()`;

export function getThemePreference(): ThemePreference {
  try {
    const preference = window.localStorage.getItem(THEME_STORAGE_KEY);
    return preference === 'light' || preference === 'dark'
      ? preference
      : 'system';
  } catch {
    return 'system';
  }
}

function storeThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    return;
  }
}

export function setThemePreference(preference: ThemePreference) {
  storeThemePreference(preference);
  applyStoredTheme();
  listeners.forEach((listener) => listener());
}

export function subscribeToThemePreference(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      applyStoredTheme();
      listener();
    }
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
