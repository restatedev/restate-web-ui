export function addProtocol(url: string): string;
export function addProtocol(url?: undefined): undefined;
export function addProtocol(url?: string) {
  if (url && !url.startsWith('http:') && !url.startsWith('https:')) {
    return url.startsWith('localhost') ? `http://${url}` : `https://${url}`;
  }

  return url;
}

export function getTargetType(url?: string, tunnelName?: string) {
  if (!url && !tunnelName) {
    return undefined;
  }

  if (url) {
    if (url.startsWith('arn:')) {
      return 'lambda' as const;
    }
    try {
      const urlObject = new URL(addProtocol(url));
      if (urlObject.hostname.endsWith('deno.net')) {
        return 'deno' as const;
      }
      if (urlObject.hostname.endsWith('workers.dev')) {
        return 'cloudflare-worker' as const;
      }
      if (urlObject.hostname.endsWith('vercel.app')) {
        return 'vercel' as const;
      }
    } catch (error) {
      return undefined;
    }
  }
  if (tunnelName) {
    return 'tunnel' as const;
  }
  return undefined;
}

export const FIX_HTTP_ACTION = 'fix-http-1';
