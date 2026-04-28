
import { NextResponse, type NextRequest } from 'next/server';
import { decryptJWT, encrypt, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from './lib/session';

const protectedRoutes = ['/dashboard'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === '/clean') {
    return NextResponse.redirect(new URL('/dashboard?scan=true', request.url));
  }

  const cleanPathMatch = path.match(/^\/clean\/(.+)$/);
  if (cleanPathMatch) {
    const locationCode = cleanPathMatch[1];
    const dashboardUrl = new URL('/dashboard', request.url);
    dashboardUrl.searchParams.set('startCleaning', locationCode);
    return NextResponse.redirect(dashboardUrl);
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = cookieValue ? await decryptJWT(cookieValue) : null;

  const isProtectedRoute = protectedRoutes.some((prefix) => path.startsWith(prefix));

  if (!session && isProtectedRoute) {
    if (cookieValue) {
      // Cookie exists but JWT is expired or tampered
      console.log(`[Session] JWT expired/invalid — redirecting to login (path: ${path})`);
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && path.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Sliding window: re-issue JWT with fresh 8h expiry on every protected page request
  if (session && isProtectedRoute) {
    const newToken = await encrypt({ user: session.user, sessionId: session.sessionId });
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE_NAME, newToken, {
      expires: new Date(Date.now() + SESSION_DURATION_MS),
      httpOnly: true,
      sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
