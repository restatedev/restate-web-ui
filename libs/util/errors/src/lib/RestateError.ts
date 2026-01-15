export class RestateError extends Error {
  get restateCode() {
    return this.restate_code;
  }
  constructor(
    message: string,
    public restate_code?: string,
    public isTransient?: boolean,
    stacktrace?: string,
  ) {
    super(message);
    this.stack = stacktrace || '';
  }
  toJSON() {
    return {
      message: this.message,
      restateCode: this.restate_code,
      isTransient: Boolean(this.isTransient),
      stack: this.stack,
    };
  }
}
