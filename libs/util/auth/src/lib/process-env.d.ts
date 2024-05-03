declare module 'process' {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        [key: string]: string | undefined;
        RESTATE_LOGIN_URL: string;
      }
    }
  }
}
