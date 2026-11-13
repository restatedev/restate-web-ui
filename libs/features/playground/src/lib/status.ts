const STATUS_TEXT: Record<string, string> = {
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '204': 'No content',
  '400': 'Bad request',
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not found',
  '405': 'Method not allowed',
  '408': 'Timeout',
  '409': 'Conflict',
  '413': 'Too large',
  '415': 'Unsupported media type',
  '429': 'Too many requests',
  '470': 'Not ready',
  '500': 'Internal error',
  '502': 'Bad gateway',
  '503': 'Unavailable',
  '504': 'Gateway timeout',
};

export function statusText(status: number | string, serverText?: string) {
  return (
    STATUS_TEXT[String(status)] ??
    (serverText && serverText !== '<none>' ? serverText : '')
  );
}

export const NOT_READY_STATUS = 470;
