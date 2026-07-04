import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PRIVATE_ROUTES = ['/private']
const ADMIN_ROUTES   = ['/admin']
const AUTH_ROUTES    = ['/auth/login', '/auth/register']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()              { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isPrivate = PRIVATE_ROUTES.some(r => pathname.startsWith(r))
  const isAdmin   = ADMIN_ROUTES.some(r => pathname.startsWith(r))

  // Non connecté → login
  if ((isPrivate || isAdmin) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (user) {
    // Récupérer le profil (rôle + accès privé)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, private_access')
      .eq('id', user.id)
      .single()

    // Admin check
    if (isAdmin && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Accès privé — doit être admin OU avoir private_access = true
    if (isPrivate) {
      const hasAccess = profile?.role === 'admin' || profile?.private_access === true
      if (!hasAccess) {
        // Rediriger vers la page d'abonnement
        const url = request.nextUrl.clone()
        url.pathname = '/public/pricing'
        url.searchParams.set('reason', 'subscription_required')
        return NextResponse.redirect(url)
      }
    }

    // Déjà connecté → pas la peine d'aller sur login/register
    if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/private/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
