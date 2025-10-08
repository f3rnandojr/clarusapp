import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from './lib/session';

const protectedRoutes = ['/dashboard', '/clean'];
const publicRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const session = await getSession();
  const path = request.nextUrl.pathname;
  
  // Extrai o código do local da URL, se presente
  const cleanPathMatch = path.match(/^\/clean\/(.+)$/);
  const locationCode = cleanPathMatch ? cleanPathMatch[1] : null;

  const isProtectedRoute = protectedRoutes.some((prefix) => path.startsWith(prefix));

  if (!session && isProtectedRoute) {
    // Se não há sessão e a rota é protegida, redireciona para o login.
    const loginUrl = new URL('/login', request.url);
    
    // Mantém o código do local na URL para o fluxo de QR code
    if (path.startsWith('/clean') && locationCode) {
      console.log(`[Middleware] Usuário não logado tentando acessar /clean/${locationCode}. Redirecionando para login.`);
      // A lógica de redirecionamento pós-login agora é mais simples.
      // O usuário será enviado para /dashboard, que lerá o código da URL inicial.
      // A rota /clean/[code] agora é protegida.
    } else {
       console.log(`[Middleware] Acesso não autorizado à rota protegida ${path}. Redirecionando para login.`);
    }

    return NextResponse.redirect(loginUrl);
  }
  
  if (session && path.startsWith('/login')) {
    // Se há sessão e o usuário tenta acessar /login, redireciona para o dashboard.
    console.log('[Middleware] Usuário logado tentando acessar /login. Redirecionando para /dashboard.');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Permite o acesso
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
