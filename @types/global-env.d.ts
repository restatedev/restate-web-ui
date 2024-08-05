interface Env {
  RESTATE_AUTH_URL: string;
  RESTATE_AUTH_REDIRECT_URL: string;
  RESTATE_AUTH_CLIENT_ID: string;
  RESTATE_CLOUD_API_URL: string;
  SLACK_API_URL: string;
  VERSION: string;
}

declare module globalThis {
  var env: Env;
}
