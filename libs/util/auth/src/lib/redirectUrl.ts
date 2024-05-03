const REDIRECT_KEY = 'rd';

export function getRedirectUrl() {
  return sessionStorage.getItem(REDIRECT_KEY);
}

export function removeRedirectUrl() {
  return sessionStorage.removeItem(REDIRECT_KEY);
}

export function setRedirectUrl() {
  const redirectUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  sessionStorage.setItem(REDIRECT_KEY, redirectUrl);
}
