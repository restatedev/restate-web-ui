declare module 'process' {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        [key: string]: string | undefined;
        RESTATE_CLOUD_API_URL: string;
      }
    }
  }
}
