function query(query: string, { baseUrl }: { baseUrl: string }) {
  return fetch(`${baseUrl}/query`, {
    method: 'POST',
    body: JSON.stringify({ query }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
}

function listInvocations(baseUrl: string) {
  return query('SELECT * FROM sys_invocation', { baseUrl });
}

export function queryMiddlerWare(req: Request) {
  const { url, method } = req;
  if (url.endsWith('/query/invocations') && method.toUpperCase() === 'GET') {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return listInvocations(baseUrl);
  }
}
