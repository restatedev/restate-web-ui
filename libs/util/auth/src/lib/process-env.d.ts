declare module 'process' {
  global {
    namespace NodeJS {
      // TODO: remove process.env
      interface ProcessEnv {
        [key: string]: string | undefined;
        RESTATE_AUTH_URL: string;
        RESTATE_AUTH_REDIRECT_URL: string;
        RESTATE_AUTH_CLIENT_ID: string;
      }
    }
  }
}
