import { redirect } from 'next/navigation'
import { supabaseServidor } from '@/lib/server/admin'
import Painel from './painel'

export const dynamic = 'force-dynamic'

// Server Component: a decisão acontece no servidor, antes de qualquer HTML do painel sair.
export default async function AdminPage() {
  const sb = await supabaseServidor()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: ehAdmin } = await sb.rpc('is_admin')
  if (ehAdmin !== true) redirect('/admin/login?erro=permissao')

  return <Painel email={user.email ?? ''} />
}
