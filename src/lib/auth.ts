import type { UserIdentity } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type ProvedorOAuth = 'discord' | 'google'

/** Só aceita caminhos internos (evita open redirect via ?next=). */
export function caminhoSeguro(next: string | null | undefined, padrao = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return padrao
  return next
}

export async function entrarComProvedor(provedor: ProvedorOAuth, next = '/') {
  return supabase.auth.signInWithOAuth({
    provider: provedor,
    options: { redirectTo: `${window.location.origin}${caminhoSeguro(next)}` },
  })
}

/** Vincula o provedor à conta LOGADA. Exige "Allow manual linking" ligado no Supabase. */
export async function vincularProvedor(provedor: ProvedorOAuth) {
  return supabase.auth.linkIdentity({
    provider: provedor,
    options: { redirectTo: `${window.location.origin}/conta` },
  })
}

/** O Supabase só deixa desvincular se a conta tiver pelo menos 2 identidades. */
export async function desvincular(identidade: UserIdentity) {
  return supabase.auth.unlinkIdentity(identidade)
}

export function traduzirErroAuth(mensagem: string): string {
  const m = mensagem.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
  if (m.includes('manual linking is disabled')) return 'A vinculação de contas está desligada no Supabase (Allow manual linking).'
  if (m.includes('already linked') || m.includes('identity is already')) return 'Essa conta já está vinculada a outro usuário.'
  if (m.includes('password should be') || m.includes('weak')) return 'Senha fraca. Use ao menos 8 caracteres, misturando letras e números.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas. Aguarde alguns minutos.'
  if (m.includes('same password')) return 'A nova senha precisa ser diferente da atual.'
  return mensagem
}
