export function toStateParam({
  virtualObject,
  key,
}: {
  virtualObject: string;
  key: string;
}) {
  return JSON.stringify({
    key,
    virtualObject,
  });
}
