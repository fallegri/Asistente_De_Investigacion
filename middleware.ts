// middleware.ts
// Middleware de Next.js: se ejecuta en CADA request.
// Responsabilidades:
// 1. Refrescar la sesión de Supabase (mantiene el token activo)
// 2. Redirigir a /login si el usuario no está autenticado en rutas protegidas
// 3. Redirigir a /dashboard si ya está autenticado y visita login/register

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Rutas que NO requieren autenticación
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
]

// Rutas que solo son accesibles SIN sesión
// (si ya estás logueado, te redirige al dashboard)
const AUTH_ONLY_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Crear response mutable para que Supabase pueda setear cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Inicializar cliente Supabase SSR (refresca token automáticamente)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Obtener usuario (refresca el token JWT si es necesario)
  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute  = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  const isAuthRoute    = AUTH_ONLY_ROUTES.some(r => pathname.startsWith(r))
  const isApiRoute     = pathname.startsWith('/api/')
  const isStaticRoute  = pathname.startsWith('/_next/') || pathname.includes('.')

  // No tocar rutas de API ni archivos estáticos
  if (isApiRoute || isStaticRoute) {
    return response
  }

  // Ruta raíz → redirigir según estado
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(user ? '/dashboard' : '/login', request.url)
    )
  }

  // Usuario autenticado intentando acceder a login/register → dashboard
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Usuario NO autenticado en ruta protegida → login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    // Guardar la ruta intentada para redirigir después del login
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

// Configurar qué rutas disparan el middleware
export const config = {
  matcher: [
    /*
     * Excluir:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - archivos con extensión (.png, .jpg, .svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
