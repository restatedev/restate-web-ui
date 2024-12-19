export class RestateError extends Error {
  constructor(message: string, public restate_code?: string) {
    super(message);
  }
  toJSON() {
    return {
      message: this.message,
      restate_code: this.restate_code,
    };
  }
}
