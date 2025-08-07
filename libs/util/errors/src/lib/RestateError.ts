export class RestateError extends Error {
  get restateCode() {
    return this.restate_code;
  }
  constructor(
    message: string,
    public restate_code?: string,
  ) {
    super(message);
  }
  toJSON() {
    return {
      message: this.message,
      restateCode: this.restate_code,
    };
  }
}
