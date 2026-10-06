import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cliente: SupabaseClient | null = null

/** Cliente com service_role. Use SOMENTE em rotas /api (servidor). */
export function getAdmin(): SupabaseClient {
  if (!cliente) {
    cliente = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
  }
  return cliente
}

export async function usuarioDaRequisicao(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await getAdmin().auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export async function ehAdmin(userId: string): Promise<boolean> {
  const { data } = await getAdmin().from('admins').select('user_id').eq('user_id', userId).maybeSingle()
  return !!data
}
