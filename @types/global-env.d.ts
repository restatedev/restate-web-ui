interface Env {
  VERSION: string;
  [key: string]: string & {};
}

declare module globalThis {
  var env: Env;
  var queryFetch:
    | undefined
    | ((
        input: string | URL | globalThis.Request,
        init?: RequestInit
      ) => Promise<Response>);
}
