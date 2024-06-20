let url: URL | null = null;
try {
  url = new URL(String(process.env.RESTATE_CLOUD_API_URL));
} catch (error) {
  console.warn(
    'Please provide a valid cloud API url via RESTATE_CLOUD_API_URL'
  );
}
export const CLOUD_API_BASE_URL =
  url?.href ?? process.env.RESTATE_CLOUD_API_URL ?? '';
