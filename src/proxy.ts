import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Primeira barreira da área de admin: ninguém recebe /admin sem ser admin.
 * (A barreira de verdade continua sendo o RLS e a checagem em cada Server Action.)
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of lista) response.cookies.set(name, value, options)
      },
    },
  })

  const { pathname } = request.nextUrl
  if (pathname === '/admin/login') return response

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const entrar = (erro?: string) => {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = erro ? `?erro=${erro}` : ''
    return NextResponse.redirect(url)
  }

  if (!user) return entrar()
  const { data: ehAdmin } = await supabase.rpc('is_admin')
  if (ehAdmin !== true) return entrar('permissao')

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
