export function toStateParam({
  virtualObject,
  key,
  scope,
}: {
  virtualObject: string;
  key: string;
  scope?: string;
}) {
  return JSON.stringify({
    key,
    virtualObject,
    ...(scope !== undefined ? { scope } : {}),
  });
}
