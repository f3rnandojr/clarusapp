import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from './lib/session';

const protectedRoutes = ['/dashboard'];
const publicRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const session = await getSession();
  const path = request.nextUrl.pathname;
  
  const isProtectedRoute = protectedRoutes.some((prefix) => path.startsWith(prefix));
  
  // Novo: Lógica para QR Code no início do middleware
  const cleanPathMatch = path.match(/^\/clean\/(.+)$/);
  if (cleanPathMatch) {
    const locationCode = cleanPathMatch[1];
    
    if (session) {
      // Usuário está logado, redireciona para o dashboard com o parâmetro
      console.log(`[Middleware] Usuário logado escaneou QR para ${locationCode}. Redirecionando para dashboard.`);
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('startCleaning', locationCode);
      return NextResponse.redirect(dashboardUrl);
    } else {
      // Usuário não está logado, redireciona para o login
      console.log(`[Middleware] Usuário não logado escaneou QR para ${locationCode}. Redirecionando para login.`);
      const loginUrl = new URL('/login', request.url);
      // O fluxo de login levará ao dashboard, que lidará com o parâmetro se ele for passado.
      // O ideal é o dashboard sempre checar os parâmetros.
      return NextResponse.redirect(loginUrl);
    }
  }

  // Lógica para outras rotas protegidas
  if (!session && isProtectedRoute) {
    console.log(`[Middleware] Acesso não autorizado à rota protegida ${path}. Redirecionando para login.`);
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (session && path.startsWith('/login')) {
    console.log('[Middleware] Usuário logado tentando acessar /login. Redirecionando para /dashboard.');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
