export function getFeatures(headers: Headers): Set<string> {
  const raw = headers.get('x-restate-features');
  return new Set(raw ? raw.split(',').filter(Boolean) : []);
}
