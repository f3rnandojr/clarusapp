import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('🔓 MIDDLEWARE DESABILITADO - Permitindo acesso livre');
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to fit your needs.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
