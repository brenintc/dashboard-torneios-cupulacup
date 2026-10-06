import type { Inscricao, Partida } from '@/lib/types'
import { tabelaGrupo } from '@/lib/classificacao'
import { fmtData } from '@/lib/utils'

type TimeRef = { name: string; tag: string } | null
const nome = (t: TimeRef) => (t ? `[${t.tag}] ${t.name}` : 'A definir')

export function LinhaPartida({ p }: { p: Partida }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-edge/60 py-3 text-sm">
      <span className="min-w-0 flex-1 text-right text-white">{nome(p.team_a)}</span>
      <span className="w-16 text-center font-display text-lg font-bold text-white">
        {p.status === 'finalizada' ? `${p.score_a} x ${p.score_b}` : 'x'}
      </span>
      <span className="min-w-0 flex-1 text-white">{nome(p.team_b)}</span>
      {p.scheduled_at && <span className="w-full text-center text-xs text-mute sm:w-auto">{fmtData(p.scheduled_at)}</span>}
    </li>
  )
}

export function GruposView({
  inscricoes,
  partidas,
  classificam,
}: {
  inscricoes: Inscricao[]
  partidas: Partida[]
  classificam: number
}) {
  const grupos = Array.from(new Set(inscricoes.map((i) => i.group_name).filter(Boolean))).sort() as string[]
  if (grupos.length === 0) return <p className="text-mute">Os grupos ainda não foram sorteados.</p>

  return (
    <div className="grid gap-6">
      {grupos.map((g) => {
        const times = inscricoes
          .filter((i) => i.group_name === g && i.teams)
          .map((i) => ({ id: i.team_id, name: i.teams!.name, tag: i.teams!.tag }))
        const jogos = partidas.filter((p) => p.stage === 'grupos' && p.group_name === g)
        const tabela = tabelaGrupo(times, jogos)
        const rodadas = Array.from(new Set(jogos.map((p) => p.round))).sort((a, b) => a - b)

        return (
          <section key={g} className="card p-5">
            <h3 className="text-xl font-semibold">Grupo {g}</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[460px]">
                <thead>
                  <tr className="border-b border-edge">
                    <th className="th">#</th>
                    <th className="th">Equipe</th>
                    <th className="th" title="Pontos">P</th>
                    <th className="th" title="Jogos">J</th>
                    <th className="th" title="Vitórias">V</th>
                    <th className="th" title="Empates">E</th>
                    <th className="th" title="Derrotas">D</th>
                    <th className="th" title="Saldo de gols">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {tabela.map((l, i) => (
                    <tr key={l.id} className={`border-b border-edge/60 ${i < classificam ? 'bg-brand/10' : ''}`}>
                      <td className="td text-mute">{i + 1}</td>
                      <td className="td font-medium text-white">[{l.tag}] {l.name}</td>
                      <td className="td font-semibold text-white">{l.pts}</td>
                      <td className="td">{l.j}</td>
                      <td className="td">{l.v}</td>
                      <td className="td">{l.e}</td>
                      <td className="td">{l.d}</td>
                      <td className="td">{l.sg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-mute">As {classificam} primeiras equipes avançam para o mata-mata.</p>

            {rodadas.map((r) => (
              <div key={r} className="mt-5">
                <h4 className="text-sm font-medium text-mute">Rodada {r}</h4>
                <ul>
                  {jogos.filter((p) => p.round === r).map((p) => (
                    <LinhaPartida key={p.id} p={p} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

export function nomeRodada(r: number, ultima: number) {
  const falta = ultima - r
  if (falta === 0) return 'Final'
  if (falta === 1) return 'Semifinal'
  if (falta === 2) return 'Quartas de final'
  if (falta === 3) return 'Oitavas de final'
  return `Rodada ${r}`
}

export function ChaveamentoView({ partidas }: { partidas: Partida[] }) {
  const jogos = partidas.filter((p) => p.stage === 'mata_mata')
  if (jogos.length === 0) return <p className="text-mute">O mata-mata começa depois da fase de grupos.</p>

  const rodadas = Array.from(new Set(jogos.map((p) => p.round))).sort((a, b) => a - b)
  const ultima = rodadas[rodadas.length - 1]

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rodadas.map((r) => (
        <div key={r} className="flex w-64 shrink-0 flex-col justify-around gap-4">
          <h3 className="text-lg font-semibold">{nomeRodada(r, ultima)}</h3>
          {jogos
            .filter((p) => p.round === r)
            .sort((a, b) => (a.bracket_pos ?? 0) - (b.bracket_pos ?? 0))
            .map((p) => {
              const fim = p.status === 'finalizada'
              const linha = (t: TimeRef, id: number | null, placar: number | null) => (
                <div
                  className={`flex items-center justify-between gap-2 px-3 py-2 text-sm ${
                    fim && p.winner_team_id === id && id !== null ? 'font-semibold text-white' : 'text-silver'
                  }`}
                >
                  <span className="truncate">{nome(t)}</span>
                  <span>{fim ? placar : ''}</span>
                </div>
              )
              return (
                <div key={p.id} className="card divide-y divide-edge">
                  {linha(p.team_a, p.team_a_id, p.score_a)}
                  {linha(p.team_b, p.team_b_id, p.score_b)}
                  {p.scheduled_at && <p className="px-3 py-1 text-xs text-mute">{fmtData(p.scheduled_at)}</p>}
                </div>
              )
            })}
        </div>
      ))}
    </div>
  )
}
