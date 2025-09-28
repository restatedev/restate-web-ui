export function addProtocol(url: string): string;
export function addProtocol(url?: undefined): undefined;
export function addProtocol(url?: string) {
  if (url && !url.startsWith('http:') && !url.startsWith('https:')) {
    return url.startsWith('localhost') ? `http://${url}` : `https://${url}`;
  }

  return url;
}
