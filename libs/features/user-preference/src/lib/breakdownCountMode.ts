const USER_BREAKDOWN_MODE_KEY = 'invocations-count-mode';

export type BreakdownCountMode = 'estimate' | 'exact';

export function getUserBreakdownCountMode(): BreakdownCountMode {
  if (typeof localStorage === 'undefined') return 'estimate';
  try {
    const parsed = JSON.parse(
      localStorage.getItem(USER_BREAKDOWN_MODE_KEY) ?? 'null',
    ) as BreakdownCountMode | null;
    return parsed === 'exact' ? 'exact' : 'estimate';
  } catch {
    return 'estimate';
  }
}

export function setUserBreakdownCountMode(mode: BreakdownCountMode) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(USER_BREAKDOWN_MODE_KEY, JSON.stringify(mode));
}
