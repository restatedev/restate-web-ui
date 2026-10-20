import { useEffect, useSyncExternalStore } from 'react';
import {
  applyStoredTheme,
  getThemePreference,
  setThemePreference,
  subscribeToThemePreference,
  type ThemePreference,
} from './themePreference';

const getServerPreference = (): ThemePreference => 'system';

export function useThemePreference() {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    getThemePreference,
    getServerPreference,
  );

  useEffect(() => {
    if (preference !== 'system') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', applyStoredTheme);
    return () => media.removeEventListener('change', applyStoredTheme);
  }, [preference]);

  return [preference, setThemePreference] as const;
}
