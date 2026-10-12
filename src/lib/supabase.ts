import { createBrowserClient } from '@supabase/ssr'

// Só a chave pública (publishable/anon). A sessão fica em cookies, assim o
// servidor consegue validar quem está logado antes de entregar a área de admin.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
