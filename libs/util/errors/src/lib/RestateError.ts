export class RestateError extends Error {
  declare cause?: Error;

  get restateCode() {
    return this.restate_code;
  }
  constructor(
    message: string,
    public restate_code?: string,
    public isTransient?: boolean,
    stacktrace?: string,
    public status?: number,
    cause?: Error,
  ) {
    super(message);
    this.stack = stacktrace || '';
    if (cause) {
      this.cause = cause;
    }
  }
  toJSON() {
    return {
      message: this.message,
      restateCode: this.restate_code,
      isTransient: Boolean(this.isTransient),
      stack: this.stack,
      status: this.status,
    };
  }
}
