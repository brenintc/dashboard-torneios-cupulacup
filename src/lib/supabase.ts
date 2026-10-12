import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !chave) {
  throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
}
if (chave.startsWith('sb_secret_')) {
  throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY recebeu uma chave SECRETA. Use a sb_publishable_...')
}

export const supabase = createBrowserClient(url, chave)