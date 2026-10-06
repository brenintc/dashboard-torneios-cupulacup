'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import type { Equipe, Inscricao, Msg, Partida, Torneio } from '@/lib/types'
import { PAGAMENTO_LABEL, SELECT_PARTIDA } from '@/lib/types'
import { erroMsg, fmtData, fmtMoeda } from '@/lib/utils'
import { Aviso, Pagina, StatusBadge } from '@/components/ui'
import { ChaveamentoView, GruposView } from '@/components/chaves'
import PixPagamento from '@/components/PixPagamento'

type Aba = 'equipes' | 'grupos' | 'chaveamento'

export default function CampeonatoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const { user, login } = useAuth()

  const [torneio, setTorneio] = useState<Torneio | null>(null)
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [minhas, setMinhas] = useState<Equipe[]>([])
  const [equipeSel, setEquipeSel] = useState('')
  const [aba, setAba] = useState<Aba>('equipes')
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [pagando, setPagando] = useState<number | null>(null)
  const [msg, setMsg] = useState<Msg>({ texto: '', tipo: '' })

  const carregar = useCallback(async () => {
    const [t, i, p] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase
        .from('tournament_registrations')
        .select('id, tournament_id, team_id, status, wins, losses, payment_status, group_name, teams(name, tag)')
        .eq('tournament_id', id),
      supabase
        .from('matches')
        .select(SELECT_PARTIDA)
        .eq('tournament_id', id)
        .order('round')
        .order('id'),
    ])
    if (!t.error) setTorneio(t.data as Torneio)
    if (!i.error) {
      const dados = (i.data as unknown as Inscricao[]) || []
      dados.sort((a, b) => b.wins - a.wins || a.losses - b.losses)
      setInscricoes(dados)
    }
    if (!p.error) setPartidas((p.data as unknown as Partida[]) || [])
    setCarregando(false)
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!user) {
      setMinhas([])
      return
    }
    supabase
      .from('teams')
      .select('*')
      .eq('captain_user_id', user.id)
      .order('name')
      .then(({ data }) => setMinhas((data as Equipe[]) || []))
  }, [user])

  const aoPagar = useCallback(() => {
    setPagando(null)
    setMsg({ texto: 'Pagamento confirmado. Vaga garantida.', tipo: 'sucesso' })
    carregar()
  }, [carregar])

  const porEquipe = new Map(inscricoes.map((i) => [i.team_id, i]))
  const jaInscritas = minhas.filter((e) => porEquipe.has(e.id))
  const disponiveis = minhas.filter((e) => !porEquipe.has(e.id))
  const temFase = partidas.length > 0
  const temMata = partidas.some((p) => p.stage === 'mata_mata')
  const taxa = Number(torneio?.entry_fee ?? 0)

  async function inscrever() {
    if (!equipeSel) {
      setMsg({ texto: 'Selecione uma equipe.', tipo: 'erro' })
      return
    }
    setOcupado(true)
    setMsg({ texto: '', tipo: '' })
    const { data, error } = await supabase.rpc('inscrever_equipe', {
      p_torneio_id: Number(id),
      p_team_id: Number(equipeSel),
    })
    if (error) setMsg({ texto: erroMsg(error), tipo: 'erro' })
    else {
      setEquipeSel('')
      await carregar()
      if (taxa > 0) setPagando(Number(data))
      else setMsg({ texto: 'Equipe inscrita com sucesso.', tipo: 'sucesso' })
    }
    setOcupado(false)
  }

  async function cancelar(teamId: number) {
    if (!confirm('Cancelar a inscrição desta equipe?')) return
    setOcupado(true)
    const { error } = await supabase.rpc('cancelar_inscricao', {
      p_torneio_id: Number(id),
      p_team_id: teamId,
    })
    if (error) setMsg({ texto: erroMsg(error), tipo: 'erro' })
    else {
      setMsg({ texto: 'Inscrição cancelada.', tipo: 'sucesso' })
      await carregar()
    }
    setOcupado(false)
  }

  if (carregando) return <Pagina><p className="text-mute">Carregando campeonato...</p></Pagina>

  if (!torneio)
    return (
      <Pagina>
        <p>Campeonato não encontrado.</p>
        <Link href="/campeonatos" className="btn-ghost mt-4">
          Ver todos os campeonatos
        </Link>
      </Pagina>
    )

  const lotado = torneio.max_teams !== null && inscricoes.length >= torneio.max_teams
  const abas: { id: Aba; label: string; mostrar: boolean }[] = [
    { id: 'equipes', label: 'Equipes', mostrar: true },
    { id: 'grupos', label: 'Grupos', mostrar: temFase },
    { id: 'chaveamento', label: 'Mata-mata', mostrar: temMata },
  ]

  return (
    <Pagina largura="max-w-4xl">
      {pagando !== null && (
        <PixPagamento registrationId={pagando} onPago={aoPagar} onFechar={() => { setPagando(null); carregar() }} />
      )}

      <Link href="/campeonatos" className="text-sm text-mute hover:text-white">
        Voltar para campeonatos
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-bold">{torneio.title}</h1>
        <StatusBadge status={torneio.status} />
      </div>
      <p className="mt-1 text-mute">
        {torneio.game}
        {torneio.edition ? `, ${torneio.edition}` : ''}
      </p>
      {torneio.description && <p className="mt-4 max-w-2xl whitespace-pre-line">{torneio.description}</p>}

      <dl className="card mt-6 grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-mute">Equipes</dt>
          <dd className="text-lg font-semibold text-white">
            {inscricoes.length}
            {torneio.max_teams ? `/${torneio.max_teams}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-mute">Inscrição</dt>
          <dd className="text-lg font-semibold text-white">{fmtMoeda(torneio.entry_fee)}</dd>
        </div>
        <div>
          <dt className="text-mute">Prêmio</dt>
          <dd className="text-lg font-semibold text-white">{torneio.prize || 'A definir'}</dd>
        </div>
        <div>
          <dt className="text-mute">Início</dt>
          <dd className="text-lg font-semibold text-white">{fmtData(torneio.starts_at)}</dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Inscrever minha equipe</h2>
        <div className="card mt-4 p-5">
          {torneio.status !== 'aberto' ? (
            <p className="text-mute">As inscrições deste campeonato estão encerradas.</p>
          ) : !user ? (
            <>
              <p className="mb-4">Entre com o Discord para inscrever sua equipe.</p>
              <button onClick={login} className="btn-primary">Entrar com Discord</button>
            </>
          ) : minhas.length === 0 ? (
            <>
              <p className="mb-4">Você ainda não tem uma equipe. Crie uma para se inscrever.</p>
              <Link href="/minhas-equipes" className="btn-primary">Criar equipe</Link>
            </>
          ) : lotado && disponiveis.length > 0 ? (
            <p className="text-mute">Este campeonato está lotado.</p>
          ) : disponiveis.length > 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                aria-label="Equipe"
                value={equipeSel}
                onChange={(e) => setEquipeSel(e.target.value)}
                className="input sm:max-w-xs"
              >
                <option value="">Escolha a equipe</option>
                {disponiveis.map((e) => (
                  <option key={e.id} value={e.id}>[{e.tag}] {e.name}</option>
                ))}
              </select>
              <button onClick={inscrever} disabled={ocupado} className="btn-primary">
                {ocupado ? 'Inscrevendo...' : taxa > 0 ? `Inscrever e pagar ${fmtMoeda(taxa)}` : 'Inscrever equipe'}
              </button>
            </div>
          ) : (
            <p className="text-mute">Todas as suas equipes já estão inscritas neste campeonato.</p>
          )}

          {jaInscritas.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-edge pt-4 text-sm">
              {jaInscritas.map((e) => {
                const reg = porEquipe.get(e.id)!
                return (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                      [{e.tag}] {e.name}: {PAGAMENTO_LABEL[reg.payment_status] ?? reg.payment_status}
                    </span>
                    <span className="flex gap-2">
                      {reg.payment_status === 'pendente' && (
                        <button onClick={() => setPagando(reg.id)} className="btn-primary">Pagar agora</button>
                      )}
                      {torneio.status === 'aberto' && reg.payment_status !== 'pago' && (
                        <button onClick={() => cancelar(e.id)} disabled={ocupado} className="btn-danger">
                          Cancelar inscrição
                        </button>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <Aviso msg={msg} />
        </div>
      </section>

      <section className="mt-10">
        <div role="tablist" className="flex gap-2 border-b border-edge pb-3">
          {abas
            .filter((a) => a.mostrar)
            .map((a) => (
              <button
                key={a.id}
                role="tab"
                aria-selected={aba === a.id}
                onClick={() => setAba(a.id)}
                className={aba === a.id ? 'btn-primary' : 'btn-ghost'}
              >
                {a.label}
              </button>
            ))}
        </div>

        <div className="mt-6">
          {aba === 'equipes' &&
            (inscricoes.length === 0 ? (
              <p className="text-mute">Nenhuma equipe inscrita ainda. Seja a primeira.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead>
                    <tr className="border-b border-edge">
                      <th className="th">#</th>
                      <th className="th">Equipe</th>
                      <th className="th">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inscricoes.map((r, i) => (
                      <tr key={r.id} className="border-b border-edge/60">
                        <td className="td text-mute">{i + 1}</td>
                        <td className="td font-medium text-white">
                          <Link href={`/equipe/${r.team_id}`} className="hover:text-brand-hi">
                            [{r.teams?.tag}] {r.teams?.name}
                          </Link>
                        </td>
                        <td className="td">{PAGAMENTO_LABEL[r.payment_status] ?? r.payment_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {aba === 'grupos' && (
            <GruposView inscricoes={inscricoes} partidas={partidas} classificam={torneio.advance_per_group ?? 2} />
          )}
          {aba === 'chaveamento' && <ChaveamentoView partidas={partidas} />}
        </div>
      </section>
    </Pagina>
  )
}
