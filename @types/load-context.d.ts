import { type PlatformProxy } from 'wrangler';

// When using `wrangler.toml` to configure bindings,
// `wrangler types` will generate types for those bindings
// into the global `Env` interface.
// Need this empty interface so that typechecking passes
// even if no `wrangler.toml` exists.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Env {
  SLACK_TOKEN: string;
  SLACK_API_URL: string;
  RESTATE_AUTH_URL: string;
  RESTATE_AUTH_REDIRECT_URL: string;
  RESTATE_AUTH_CLIENT_ID: string;
  RESTATE_CLOUD_API_URL: string;
}

type Cloudflare = Omit<PlatformProxy<Env>, 'dispose'>;

declare module '@remix-run/cloudflare' {
  interface AppLoadContext {
    cloudflare: Cloudflare;
  }
}
