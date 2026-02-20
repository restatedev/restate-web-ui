interface Env {
  VERSION: string;
  [key: string]: string & {};
}

declare module globalThis {
  var env: Env;
  var batchOperationPromises:
    | undefined
    | Record<string, PromiseWithResolvers<boolean> | null>;
}
