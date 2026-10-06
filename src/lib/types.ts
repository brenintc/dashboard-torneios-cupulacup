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
  teams: { name: string; tag: string } | null
}

export type Msg = { texto: string; tipo: '' | 'erro' | 'sucesso' }

export const STATUS_TORNEIO: Record<string, string> = {
  aberto: 'Inscrições abertas',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
}
