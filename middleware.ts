import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuth } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protéger la route /admin
  if (pathname.startsWith('/admin')) {
    const authResult = await verifyAuth(request);
    
    if (!authResult.user) {
      // Rediriger vers la page de connexion si non authentifié
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Vérifier que l'utilisateur est admin
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Seuls les administrateurs peuvent accéder à cette page.' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

