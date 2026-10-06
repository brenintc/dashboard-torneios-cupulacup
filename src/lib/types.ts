export interface Torneio {
  id: number
  title: string
  game: string
  edition: string | null
  status: string
  max_teams: number | null
  prize: string | null
  entry_fee: number | null
  starts_at: string | null
  description: string | null
  group_size?: number | null
  advance_per_group?: number | null
}

export interface Equipe {
  id: number
  name: string
  tag: string
  captain_discord_id: string | null
  captain_user_id: string | null
}

export interface Membro {
  id: number
  team_id: number
  player_name: string
  discord_id: string
}

export interface Inscricao {
  id: number
  tournament_id: number
  team_id: number
  status: string
  wins: number
  losses: number
  payment_status: string
  group_name: string | null
  teams: { name: string; tag: string } | null
}

export interface Partida {
  id: number
  tournament_id: number
  stage: 'grupos' | 'mata_mata'
  round: number
  bracket_pos: number | null
  group_name: string | null
  team_a_id: number | null
  team_b_id: number | null
  score_a: number | null
  score_b: number | null
  status: string
  winner_team_id: number | null
  scheduled_at: string | null
  next_match_id: number | null
  discord_channel_id: string | null
  ready_a: boolean
  ready_b: boolean
  team_a: { name: string; tag: string } | null
  team_b: { name: string; tag: string } | null
}

export const SELECT_PARTIDA =
  '*, team_a:teams!team_a_id(name, tag), team_b:teams!team_b_id(name, tag)'

export const PAGAMENTO_LABEL: Record<string, string> = {
  pendente: 'Aguardando pagamento',
  pago: 'Confirmada',
  isento: 'Confirmada',
}

export type Msg = { texto: string; tipo: '' | 'erro' | 'sucesso' }

export const STATUS_TORNEIO: Record<string, string> = {
  aberto: 'Inscrições abertas',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
}
