import { createCookie } from '@remix-run/cloudflare';

export const adminUrlCookie = createCookie('adminUrl', {
  path: '/',
  sameSite: 'lax',
});

export async function getAdminUrl(request: Request) {
  const cookieHeader = request.headers.get('Cookie');
  const cookie = (await adminUrlCookie.parse(cookieHeader)) || {};

  return typeof cookie === 'string' ? cookie : null;
}
