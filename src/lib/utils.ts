export function erroMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message)
  }
  return 'Erro desconhecido'
}

export function fmtData(s?: string | null): string {
  if (!s) return 'A definir'
  return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function fmtMoeda(n?: number | null): string {
  if (!n) return 'Grátis'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
