export class RestateError extends Error {
  constructor(message: string, public restate_code?: string) {
    super(message);
  }
}
