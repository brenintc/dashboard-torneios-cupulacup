'use server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { exigirAdmin, SemPermissao } from '@/lib/server/admin'

/**
 * Todas as escritas de admin passam por aqui, no servidor.
 * Cada ação: 1) exigirAdmin() valida o login e is_admin() no banco; 2) valida a entrada;
 * 3) executa com o cliente DO USUÁRIO, então o RLS ainda barra se algo escapar.
 * Nenhuma ação usa a chave secreta (service_role).
 */

const STATUS = ['aberto', 'em_andamento', 'finalizado']
const SITUACAO = ['inscrito', 'confirmado', 'eliminado']
const PAGAMENTO = ['pendente', 'pago', 'isento']

const ID = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v > 0
const INT = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
const TXT = (v: unknown, max: number) => typeof v === 'string' && v.length <= max

type Resultado = { ok: true } | { ok: false; erro: string }
type Erro = { message: string } | null

async function executar(fn: (sb: SupabaseClient) => PromiseLike<{ error: Erro }>): Promise<Resultado> {
  try {
    const { sb } = await exigirAdmin()
    const { error } = await fn(sb)
    return error ? { ok: false, erro: error.message } : { ok: true }
  } catch (e) {
    if (e instanceof SemPermissao) return { ok: false, erro: e.message }
    console.error('Erro em ação de admin:', e)
    return { ok: false, erro: 'Erro inesperado.' }
  }
}

const invalido = (): Resultado => ({ ok: false, erro: 'Dados inválidos.' })

export async function criarCampeonato(d: {
  title: string
  game: string
  edition: string | null
  status: string
  max_teams: number | null
  group_size: number
  advance_per_group: number
  prize: string | null
  entry_fee: number
  starts_at: string | null
  description: string | null
}): Promise<Resultado> {
  if (!TXT(d?.title, 120) || !d.title.trim()) return invalido()
  if (!TXT(d.game, 80) || !(d.edition === null || TXT(d.edition, 40))) return invalido()
  if (!STATUS.includes(d.status)) return invalido()
  if (!(d.max_teams === null || INT(d.max_teams, 2, 256))) return invalido()
  if (!INT(d.group_size, 2, 16) || !INT(d.advance_per_group, 1, d.group_size)) return invalido()
  if (!(d.prize === null || TXT(d.prize, 120)) || !(d.description === null || TXT(d.description, 2000))) return invalido()
  if (typeof d.entry_fee !== 'number' || !(d.entry_fee >= 0 && d.entry_fee <= 10000)) return invalido()
  if (d.starts_at !== null && Number.isNaN(Date.parse(d.starts_at))) return invalido()

  return executar((sb) =>
    sb.from('tournaments').insert([
      {
        title: d.title.trim(),
        game: d.game.trim() || 'EA FC Pro Clubs',
        edition: d.edition,
        status: d.status,
        max_teams: d.max_teams,
        group_size: d.group_size,
        advance_per_group: d.advance_per_group,
        prize: d.prize,
        entry_fee: d.entry_fee,
        starts_at: d.starts_at,
        description: d.description,
      },
    ])
  )
}

export async function mudarStatusCampeonato(id: number, status: string): Promise<Resultado> {
  if (!ID(id) || !STATUS.includes(status)) return invalido()
  return executar((sb) => sb.from('tournaments').update({ status }).eq('id', id))
}

export async function excluirCampeonato(id: number): Promise<Resultado> {
  if (!ID(id)) return invalido()
  return executar(async (sb) => {
    const r = await sb.from('tournament_registrations').delete().eq('tournament_id', id)
    if (r.error) return r
    return sb.from('tournaments').delete().eq('id', id)
  })
}

export async function excluirEquipe(id: number): Promise<Resultado> {
  if (!ID(id)) return invalido()
  return executar((sb) => sb.rpc('excluir_equipe', { p_team_id: id }))
}

export async function salvarInscricao(
  id: number,
  campos: { status: string; payment_status: string; wins: number; losses: number }
): Promise<Resultado> {
  if (!ID(id)) return invalido()
  if (!SITUACAO.includes(campos?.status) || !PAGAMENTO.includes(campos.payment_status)) return invalido()
  if (!INT(campos.wins, 0, 999) || !INT(campos.losses, 0, 999)) return invalido()
  return executar((sb) =>
    sb
      .from('tournament_registrations')
      .update({
        status: campos.status,
        payment_status: campos.payment_status,
        wins: campos.wins,
        losses: campos.losses,
      })
      .eq('id', id)
  )
}

export async function removerInscricao(id: number): Promise<Resultado> {
  if (!ID(id)) return invalido()
  return executar((sb) => sb.from('tournament_registrations').delete().eq('id', id))
}

export async function sortearGrupos(torneioId: number): Promise<Resultado> {
  if (!ID(torneioId)) return invalido()
  return executar((sb) => sb.rpc('sortear_grupos', { p_torneio_id: torneioId }))
}

export async function gerarMataMata(torneioId: number): Promise<Resultado> {
  if (!ID(torneioId)) return invalido()
  return executar((sb) => sb.rpc('gerar_mata_mata', { p_torneio_id: torneioId }))
}

export async function registrarResultado(matchId: number, a: number, b: number): Promise<Resultado> {
  if (!ID(matchId) || !INT(a, 0, 99) || !INT(b, 0, 99)) return invalido()
  return executar((sb) => sb.rpc('registrar_resultado', { p_match_id: matchId, p_a: a, p_b: b }))
}

export async function salvarHorario(matchId: number, quando: string | null): Promise<Resultado> {
  if (!ID(matchId)) return invalido()
  if (quando !== null && Number.isNaN(Date.parse(quando))) return invalido()
  return executar((sb) => sb.from('matches').update({ scheduled_at: quando }).eq('id', matchId))
}
