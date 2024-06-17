declare module 'process' {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        [key: string]: string | undefined;
        SLACK_API_URL: string;
      }
    }
  }
}
