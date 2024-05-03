let url: URL | null = null;
try {
  url = new URL(process.env.RESTATE_CLOUD_LOGIN_URL);
} catch (error) {
  throw new Error(
    'Please provide a valid login url via RESTATE_CLOUD_LOGIN_URL'
  );
}
export const LOGIN_URL = url.href;
