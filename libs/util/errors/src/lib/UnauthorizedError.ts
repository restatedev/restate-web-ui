export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized Error');
    this.name = 'UnauthorizedError';
  }
}

export function isUnauthorizedError(error: Error): error is UnauthorizedError {
  return error.name === 'UnauthorizedError';
}
