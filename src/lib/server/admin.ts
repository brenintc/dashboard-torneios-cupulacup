import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let servico: SupabaseClient | null = null

/**
 * Cliente com a chave secreta (service_role / sb_secret_...). Ignora o RLS.
 * Uso permitido: webhook do PIX, interações do Discord e gravação de pagamentos.
 * NUNCA use para decidir se alguém é admin e nunca importe em componente de cliente.
 */
export function getAdmin(): SupabaseClient {
  if (!servico) {
    servico = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return servico
}

/** Cliente "como o usuário": usa o JWT dos cookies, então o RLS continua valendo. */
export async function supabaseServidor() {
  const store = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) store.set(name, value, options)
        } catch {
          // Em Server Components os cookies são somente leitura; o proxy.ts já renova a sessão.
        }
      },
    },
  })
}

/** Usuário logado, validado no servidor de autenticação (não confia só no cookie). */
export async function usuarioDaRequisicao(req?: Request) {
  const sb = await supabaseServidor()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (user) return user

  const token = req?.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await sb.auth.getUser(token)
  return data.user ?? null
}

export class SemPermissao extends Error {}

/**
 * Porta de entrada de TODA ação privilegiada de admin.
 * 1) valida o usuário no Auth; 2) pergunta ao banco se ele é admin (is_admin()
 *    exige sessão por senha). Devolve o cliente do próprio usuário, então o RLS
 *    ainda barra qualquer coisa fora da permissão.
 */
export async function exigirAdmin() {
  const sb = await supabaseServidor()
  const {
    data: { user },
    error,
  } = await sb.auth.getUser()
  if (error || !user) throw new SemPermissao('Sessão expirada. Entre novamente.')

  const { data, error: erroAdmin } = await sb.rpc('is_admin')
  if (erroAdmin || data !== true) throw new SemPermissao('Sem permissão de administrador.')

  return { sb, user }
}
