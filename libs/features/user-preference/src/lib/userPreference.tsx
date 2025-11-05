export type UserPreferenceId =
  | 'skip-cancel-action-dialog'
  | 'skip-resume-action-dialog'
  | 'skip-restart-action-dialog'
  | 'skip-kill-action-dialog'
  | 'skip-purge-action-dialog'
  | 'skip-retry-action-dialog';

export function getUserPreference(id: UserPreferenceId) {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(id) === 'true';
}

export function setUserPreference(id: UserPreferenceId, value = false) {
  localStorage.setItem(id, String(value));
}
