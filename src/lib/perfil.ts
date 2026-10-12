import type { User, UserIdentity } from '@supabase/supabase-js'

export type Origem = 'discord' | 'google' | 'email'

export interface Perfil {
  origem: Origem
  foto: string | null
  titulo: string
  subtitulo: string | null
  iniciais: string
}

const txt = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * Identidade usada no login atual: a que tem o last_sign_in_at mais recente.
 * (app_metadata.provider guarda só o provedor do cadastro, que muda de significado
 * assim que a conta recebe outras identidades vinculadas.)
 */
export function identidadeAtiva(user: User): UserIdentity | null {
  const ids = user.identities ?? []
  if (ids.length === 0) return null
  return [...ids].sort(
    (a, b) => new Date(b.last_sign_in_at ?? 0).getTime() - new Date(a.last_sign_in_at ?? 0).getTime()
  )[0]
}

function iniciaisDe(texto: string): string {
  const base = texto.split('@')[0].replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const partes = base.split(' ').filter(Boolean)
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : base.slice(0, 2)
  return (letras || '?').toUpperCase()
}

export function perfilDoUsuario(user: User): Perfil {
  const ativa = identidadeAtiva(user)
  const provedor = ativa?.provider ?? (user.app_metadata?.provider as string | undefined) ?? 'email'
  const d = (ativa?.identity_data ?? user.user_metadata ?? {}) as Record<string, unknown>
  const email = txt(d.email) ?? user.email ?? null

  if (provedor === 'discord') {
    const claims = (d.custom_claims ?? {}) as Record<string, unknown>
    const nome = txt(d.full_name) ?? txt(d.name) ?? txt(claims.global_name) ?? 'Jogador'
    return {
      origem: 'discord',
      foto: txt(d.avatar_url) ?? txt(d.picture),
      titulo: nome,
      subtitulo: null,
      iniciais: iniciaisDe(nome),
    }
  }

  if (provedor === 'google') {
    const titulo = email ?? txt(d.full_name) ?? 'Conta Google'
    return {
      origem: 'google',
      foto: txt(d.picture) ?? txt(d.avatar_url),
      titulo,
      subtitulo: null,
      iniciais: iniciaisDe(txt(d.full_name) ?? titulo),
    }
  }

  const titulo = email ?? 'Conta'
  return { origem: 'email', foto: null, titulo, subtitulo: null, iniciais: iniciaisDe(titulo) }
}
