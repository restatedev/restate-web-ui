declare module 'process' {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        [key: string]: string | undefined;
        RESTATE_AUTH_URL: string;
        RESTATE_AUTH_CLIENT_ID: string;
      }
    }
  }
}
