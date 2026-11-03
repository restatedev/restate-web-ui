interface Env {
  VERSION: string;
  GIT_BRANCH: string;
  [key: string]: string & {};
}

declare var env: Env;
declare var batchOperationPromises:
  | undefined
  | Record<string, PromiseWithResolvers<boolean> | null>;

declare module '*.css';
