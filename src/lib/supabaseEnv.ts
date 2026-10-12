export const SUPABASE_URL = 'https://okasvbcqbzmszjrohmnq.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_COLE_AQUI'

if (!SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_')) {
  throw new Error('Use a chave PUBLISHABLE (sb_publishable_...) aqui.')
}