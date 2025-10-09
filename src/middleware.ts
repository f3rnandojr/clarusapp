
import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from './lib/session';

const protectedRoutes = ['/dashboard'];
const publicRoutes = ['/login'];

export async function middleware(request: NextRequest) {
  const session = await getSession();
  const path = request.nextUrl.pathname;
  
  // Rota especial para iniciar o scanner no dispositivo
  if (path === '/clean') {
    // Para um dispositivo móvel, idealmente isso abriria uma câmera.
    // Como não podemos forçar isso, simplesmente redirecionamos para
    // uma URL que o middleware pode interceptar.
    // Neste caso, vamos apenas permitir a passagem para ser tratada no cliente
    // ou redirecionar para o dashboard. Por simplicidade, redirecionamos.
    return NextResponse.redirect(new URL('/dashboard?scan=true', request.url));
  }

  const cleanPathMatch = path.match(/^\/clean\/(.+)$/);
  if (cleanPathMatch) {
    const locationCode = cleanPathMatch[1];
    
    // Independente de estar logado ou não, o destino é o dashboard com o parâmetro.
    // O dashboard em si é uma rota protegida, então se não estiver logado,
    // o próximo passo do middleware cuidará do redirecionamento para o login.
    const dashboardUrl = new URL('/dashboard', request.url);
    dashboardUrl.searchParams.set('startCleaning', locationCode);
    return NextResponse.redirect(dashboardUrl);
  }

  const isProtectedRoute = protectedRoutes.some((prefix) => path.startsWith(prefix));
  
  // Se tentando acessar rota protegida sem sessão, redireciona para login
  if (!session && isProtectedRoute) {
    console.log(`[Middleware] Acesso não autorizado à rota protegida ${path}. Redirecionando para login.`);
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Se logado e tentando acessar /login, redireciona para o dashboard
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
