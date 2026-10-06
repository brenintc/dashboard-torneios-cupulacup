'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import type { Equipe, Inscricao, Membro, Msg, Torneio } from '@/lib/types'
import { erroMsg, fmtData } from '@/lib/utils'
import { Aviso, Pagina, StatusBadge } from '@/components/ui'

type Aba = 'campeonatos' | 'equipes' | 'inscricoes'

const STATUS = [
  { valor: 'aberto', label: 'Inscrições abertas' },
  { valor: 'em_andamento', label: 'Em andamento' },
  { valor: 'finalizado', label: 'Finalizado' },
]

export default function Admin() {
  const { user, isAdmin, loading, login } = useAuth()
  const [aba, setAba] = useState<Aba>('campeonatos')

  if (loading) return <Pagina><p className="text-mute">Verificando acesso...</p></Pagina>

  if (!user)
    return (
      <Pagina largura="max-w-xl">
        <h1 className="text-4xl font-bold">Administração</h1>
        <div className="card mt-6 p-6">
          <p className="mb-4">Entre com o Discord para acessar o painel.</p>
          <button onClick={login} className="btn-primary">Entrar com Discord</button>
        </div>
      </Pagina>
    )

  if (!isAdmin)
    return (
      <Pagina largura="max-w-xl">
        <h1 className="text-4xl font-bold">Sem permissão</h1>
        <div className="card mt-6 p-6 text-sm">
          <p>Sua conta não é administradora. Para liberar o acesso, rode no SQL Editor do Supabase:</p>
          <pre className="mt-3 overflow-x-auto rounded bg-ink p-3 text-xs text-brand-hi">
            {`insert into admins (user_id) values ('${user.id}');`}
          </pre>
        </div>
      </Pagina>
    )

  const abas: { id: Aba; label: string }[] = [
    { id: 'campeonatos', label: 'Campeonatos' },
    { id: 'equipes', label: 'Equipes' },
    { id: 'inscricoes', label: 'Inscrições' },
  ]

  return (
    <Pagina>
      <h1 className="text-4xl font-bold">Painel de administração</h1>
      <div role="tablist" className="mt-6 flex gap-2 border-b border-edge pb-3">
        {abas.map((a) => (
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
      <div className="mt-8">
        {aba === 'campeonatos' && <AbaCampeonatos />}
        {aba === 'equipes' && <AbaEquipes />}
        {aba === 'inscricoes' && <AbaInscricoes />}
      </div>
    </Pagina>
  )
}

/* ------------------------------ Campeonatos ------------------------------ */

function AbaCampeonatos() {
  const [lista, setLista] = useState<Torneio[]>([])
  const [msg, setMsg] = useState<Msg>({ texto: '', tipo: '' })
  const [ocupado, setOcupado] = useState(false)
  const [f, setF] = useState({
    title: '',
    game: 'EA FC Pro Clubs',
    edition: 'FC 26',
    status: 'aberto',
    max_teams: '16',
    prize: '',
    entry_fee: '0',
    starts_at: '',
    description: '',
  })

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('tournaments').select('*').order('id', { ascending: false })
    setLista((data as Torneio[]) || [])
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const campo = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (!f.title.trim()) {
      setMsg({ texto: 'Informe o título do campeonato.', tipo: 'erro' })
      return
    }
    setOcupado(true)
    const { error } = await supabase.from('tournaments').insert([
      {
        title: f.title.trim(),
        game: f.game.trim() || 'EA FC Pro Clubs',
        edition: f.edition.trim() || null,
        status: f.status,
        max_teams: f.max_teams ? Number(f.max_teams) : null,
        prize: f.prize.trim() || null,
        entry_fee: f.entry_fee ? Number(f.entry_fee) : 0,
        starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
        description: f.description.trim() || null,
      },
    ])
    if (error) setMsg({ texto: `Erro ao criar campeonato: ${erroMsg(error)}`, tipo: 'erro' })
    else {
      setMsg({ texto: 'Campeonato criado.', tipo: 'sucesso' })
      setF({ ...f, title: '', prize: '', description: '', starts_at: '' })
      carregar()
    }
    setOcupado(false)
  }

  async function mudarStatus(id: number, status: string) {
    const { error } = await supabase.from('tournaments').update({ status }).eq('id', id)
    if (error) setMsg({ texto: `Erro ao atualizar: ${erroMsg(error)}`, tipo: 'erro' })
    else carregar()
  }

  async function excluir(t: Torneio) {
    if (!confirm(`Excluir "${t.title}" e todas as inscrições dele?`)) return
    await supabase.from('tournament_registrations').delete().eq('tournament_id', t.id)
    const { error } = await supabase.from('tournaments').delete().eq('id', t.id)
    if (error) setMsg({ texto: `Erro ao excluir: ${erroMsg(error)}`, tipo: 'erro' })
    else carregar()
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section>
        <h2 className="text-2xl font-bold">Criar campeonato</h2>
        <form onSubmit={criar} className="card mt-4 space-y-3 p-5">
          <div>
            <label htmlFor="c-title" className="label">Título</label>
            <input id="c-title" className="input" value={f.title} onChange={campo('title')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="c-game" className="label">Jogo</label>
              <input id="c-game" className="input" value={f.game} onChange={campo('game')} />
            </div>
            <div>
              <label htmlFor="c-ed" className="label">Edição</label>
              <input id="c-ed" className="input" value={f.edition} onChange={campo('edition')} />
            </div>
            <div>
              <label htmlFor="c-max" className="label">Máximo de equipes</label>
              <input id="c-max" type="number" min={2} className="input" value={f.max_teams} onChange={campo('max_teams')} />
            </div>
            <div>
              <label htmlFor="c-fee" className="label">Inscrição (R$)</label>
              <input id="c-fee" type="number" min={0} step="0.01" className="input" value={f.entry_fee} onChange={campo('entry_fee')} />
            </div>
          </div>
          <div>
            <label htmlFor="c-prize" className="label">Prêmio</label>
            <input id="c-prize" className="input" placeholder="Ex.: R$ 1.000" value={f.prize} onChange={campo('prize')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="c-start" className="label">Início</label>
              <input id="c-start" type="datetime-local" className="input" value={f.starts_at} onChange={campo('starts_at')} />
            </div>
            <div>
              <label htmlFor="c-status" className="label">Status</label>
              <select id="c-status" className="input" value={f.status} onChange={campo('status')}>
                {STATUS.map((s) => (
                  <option key={s.valor} value={s.valor}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="c-desc" className="label">Descrição</label>
            <textarea id="c-desc" rows={3} className="input" value={f.description} onChange={campo('description')} />
          </div>
          <button type="submit" disabled={ocupado} className="btn-primary">
            {ocupado ? 'Criando...' : 'Criar campeonato'}
          </button>
          <Aviso msg={msg} />
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Campeonatos ({lista.length})</h2>
        {lista.length === 0 ? (
          <p className="mt-4 text-mute">Nenhum campeonato criado ainda.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {lista.map((t) => (
              <li key={t.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/campeonatos/${t.id}`} className="text-lg font-semibold text-white hover:text-brand-hi">
                    {t.title}
                  </Link>
                  <StatusBadge status={t.status} />
                </div>
                <p className="mt-1 text-sm text-mute">
                  {t.game}, {t.edition || 'sem edição'}. Início: {fmtData(t.starts_at)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    aria-label={`Status de ${t.title}`}
                    value={t.status}
                    onChange={(e) => mudarStatus(t.id, e.target.value)}
                    className="input max-w-48"
                  >
                    {STATUS.map((s) => (
                      <option key={s.valor} value={s.valor}>{s.label}</option>
                    ))}
                  </select>
                  <button onClick={() => excluir(t)} className="btn-danger">Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* -------------------------------- Equipes -------------------------------- */

type EquipeLinha = Equipe & {
  team_members: { count: number }[]
  tournament_registrations: { count: number }[]
}

function AbaEquipes() {
  const [equipes, setEquipes] = useState<EquipeLinha[]>([])
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState<number | null>(null)
  const [membros, setMembros] = useState<Membro[]>([])
  const [msg, setMsg] = useState<Msg>({ texto: '', tipo: '' })

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('teams')
      .select('*, team_members(count), tournament_registrations(count)')
      .order('name')
    setEquipes((data as unknown as EquipeLinha[]) || [])
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function alternar(id: number) {
    if (aberta === id) return setAberta(null)
    setAberta(id)
    const { data } = await supabase.from('team_members').select('*').eq('team_id', id).order('id')
    setMembros((data as Membro[]) || [])
  }

  async function excluir(e: Equipe) {
    if (!confirm(`Excluir a equipe ${e.name} com elenco e inscrições?`)) return
    const { error } = await supabase.rpc('excluir_equipe', { p_team_id: e.id })
    if (error) setMsg({ texto: erroMsg(error), tipo: 'erro' })
    else {
      setMsg({ texto: 'Equipe excluída.', tipo: 'sucesso' })
      carregar()
    }
  }

  const q = busca.trim().toLowerCase()
  const filtradas = equipes.filter(
    (e) => !q || e.name.toLowerCase().includes(q) || e.tag.toLowerCase().includes(q)
  )

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Equipes ({equipes.length})</h2>
        <input
          aria-label="Buscar equipe"
          className="input max-w-xs"
          placeholder="Buscar por nome ou TAG"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      <Aviso msg={msg} />
      {filtradas.length === 0 ? (
        <p className="mt-4 text-mute">Nenhuma equipe encontrada.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtradas.map((e) => (
            <li key={e.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/equipe/${e.id}`} className="text-lg font-semibold text-white hover:text-brand-hi">
                    [{e.tag}] {e.name}
                  </Link>
                  <p className="text-sm text-mute">
                    Capitão (Discord): {e.captain_discord_id || 'não informado'}.{' '}
                    {e.team_members?.[0]?.count ?? 0} jogadores, {e.tournament_registrations?.[0]?.count ?? 0} inscrições.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => alternar(e.id)} aria-expanded={aberta === e.id} className="btn-ghost">
                    {aberta === e.id ? 'Ocultar elenco' : 'Ver elenco'}
                  </button>
                  <button onClick={() => excluir(e)} className="btn-danger">Excluir</button>
                </div>
              </div>
              {aberta === e.id && (
                <ul className="mt-3 space-y-1 border-t border-edge pt-3 text-sm">
                  {membros.length === 0 ? (
                    <li className="text-mute">Elenco vazio.</li>
                  ) : (
                    membros.map((m) => (
                      <li key={m.id}>
                        <span className="text-white">{m.player_name}</span>
                        <span className="ml-2 text-mute">Discord: {m.discord_id}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------- Inscrições ------------------------------ */

function AbaInscricoes() {
  const [torneios, setTorneios] = useState<Torneio[]>([])
  const [torneioId, setTorneioId] = useState('')
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [msg, setMsg] = useState<Msg>({ texto: '', tipo: '' })

  useEffect(() => {
    supabase
      .from('tournaments')
      .select('*')
      .order('id', { ascending: false })
      .then(({ data }) => {
        const lista = (data as Torneio[]) || []
        setTorneios(lista)
        if (lista[0]) setTorneioId(String(lista[0].id))
      })
  }, [])

  const carregar = useCallback(async () => {
    if (!torneioId) return
    const { data } = await supabase
      .from('tournament_registrations')
      .select('id, tournament_id, team_id, status, wins, losses, teams(name, tag)')
      .eq('tournament_id', torneioId)
      .order('wins', { ascending: false })
    setInscricoes((data as unknown as Inscricao[]) || [])
  }, [torneioId])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvar(r: Inscricao, campos: Partial<Pick<Inscricao, 'status' | 'wins' | 'losses'>>) {
    const { error } = await supabase.from('tournament_registrations').update(campos).eq('id', r.id)
    if (error) setMsg({ texto: `Erro ao salvar: ${erroMsg(error)}`, tipo: 'erro' })
    else {
      setMsg({ texto: 'Alterações salvas.', tipo: 'sucesso' })
      carregar()
    }
  }

  async function remover(r: Inscricao) {
    if (!confirm(`Remover ${r.teams?.name} deste campeonato?`)) return
    const { error } = await supabase.from('tournament_registrations').delete().eq('id', r.id)
    if (error) setMsg({ texto: `Erro ao remover: ${erroMsg(error)}`, tipo: 'erro' })
    else carregar()
  }

  return (
    <section>
      <h2 className="text-2xl font-bold">Inscrições por campeonato</h2>
      <div className="mt-4 max-w-sm">
        <label htmlFor="i-torneio" className="label">Campeonato</label>
        <select id="i-torneio" className="input" value={torneioId} onChange={(e) => setTorneioId(e.target.value)}>
          {torneios.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>
      <Aviso msg={msg} />

      {torneios.length === 0 ? (
        <p className="mt-6 text-mute">Crie um campeonato na aba Campeonatos primeiro.</p>
      ) : inscricoes.length === 0 ? (
        <p className="mt-6 text-mute">Nenhuma equipe inscrita neste campeonato.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-edge">
                <th className="th">Equipe</th>
                <th className="th">Situação</th>
                <th className="th">V</th>
                <th className="th">D</th>
                <th className="th"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {inscricoes.map((r) => (
                <LinhaInscricao key={`${r.id}-${r.wins}-${r.losses}-${r.status}`} r={r} salvar={salvar} remover={remover} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function LinhaInscricao({
  r,
  salvar,
  remover,
}: {
  r: Inscricao
  salvar: (r: Inscricao, c: Partial<Pick<Inscricao, 'status' | 'wins' | 'losses'>>) => void
  remover: (r: Inscricao) => void
}) {
  const [wins, setWins] = useState(String(r.wins))
  const [losses, setLosses] = useState(String(r.losses))
  const [status, setStatus] = useState(r.status)
  const mudou = Number(wins) !== r.wins || Number(losses) !== r.losses || status !== r.status

  return (
    <tr className="border-b border-edge/60">
      <td className="td font-medium text-white">[{r.teams?.tag}] {r.teams?.name}</td>
      <td className="td">
        <select aria-label="Situação" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="inscrito">Inscrito</option>
          <option value="confirmado">Confirmado</option>
          <option value="eliminado">Eliminado</option>
        </select>
      </td>
      <td className="td">
        <input aria-label="Vitórias" type="number" min={0} className="input w-20" value={wins} onChange={(e) => setWins(e.target.value)} />
      </td>
      <td className="td">
        <input aria-label="Derrotas" type="number" min={0} className="input w-20" value={losses} onChange={(e) => setLosses(e.target.value)} />
      </td>
      <td className="td">
        <div className="flex gap-2">
          <button
            disabled={!mudou}
            onClick={() => salvar(r, { status, wins: Number(wins) || 0, losses: Number(losses) || 0 })}
            className="btn-primary"
          >
            Salvar
          </button>
          <button onClick={() => remover(r)} className="btn-danger">Remover</button>
        </div>
      </td>
    </tr>
  )
}
