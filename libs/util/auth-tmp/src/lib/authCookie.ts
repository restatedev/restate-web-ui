import { createCookie } from '@remix-run/cloudflare';

const authCookie = createCookie('auth', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: true,
  maxAge: 3600 * 12,
});

export async function getAuthCookie(request: Request) {
  const cookieHeader = request.headers.get('Cookie');
  const cookie = (await authCookie.parse(cookieHeader)) || {};

  return typeof cookie === 'string' ? cookie : null;
}

export async function setAuthCookie(token: string, secure = true) {
  return {
    'Set-Cookie': await authCookie.serialize(token, { secure }),
  };
}

export async function clearAuthCookie(secure = true) {
  return {
    'Set-Cookie': await authCookie.serialize('', {
      expires: new Date(0),
      maxAge: undefined,
      secure,
    }),
  };
}
