import type { Partida } from './types'

export interface LinhaTabela {
  id: number
  name: string
  tag: string
  j: number
  v: number
  e: number
  d: number
  gp: number
  gc: number
  sg: number
  pts: number
}

/** Tabela de um grupo: 3 pontos por vitória, 1 por empate. Desempate: saldo, gols pró, id. */
export function tabelaGrupo(
  equipes: { id: number; name: string; tag: string }[],
  partidas: Partida[]
): LinhaTabela[] {
  const mapa = new Map<number, LinhaTabela>()
  for (const e of equipes) {
    mapa.set(e.id, { ...e, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 })
  }

  for (const p of partidas) {
    if (p.status !== 'finalizada' || p.team_a_id == null || p.team_b_id == null) continue
    const a = mapa.get(p.team_a_id)
    const b = mapa.get(p.team_b_id)
    if (!a || !b) continue
    const sa = p.score_a ?? 0
    const sb = p.score_b ?? 0
    a.j++; b.j++
    a.gp += sa; a.gc += sb
    b.gp += sb; b.gc += sa
    if (sa > sb) { a.v++; b.d++; a.pts += 3 }
    else if (sa < sb) { b.v++; a.d++; b.pts += 3 }
    else { a.e++; b.e++; a.pts++; b.pts++ }
  }

  const linhas = Array.from(mapa.values())
  for (const l of linhas) l.sg = l.gp - l.gc
  return linhas.sort((x, y) => y.pts - x.pts || y.sg - x.sg || y.gp - x.gp || x.id - y.id)
}
