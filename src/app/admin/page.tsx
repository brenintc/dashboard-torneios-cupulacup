'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import type { Equipe, Inscricao, Membro, Msg, Partida, Torneio } from '@/lib/types'
import { SELECT_PARTIDA } from '@/lib/types'
import { chamarApi } from '@/lib/api'
import { erroMsg, fmtData } from '@/lib/utils'
import { Aviso, Pagina, StatusBadge } from '@/components/ui'

type Aba = 'campeonatos' | 'equipes' | 'inscricoes' | 'chaves'

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
    { id: 'chaves', label: 'Grupos e mata-mata' },
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
        {aba === 'chaves' && <AbaChaves />}
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
    group_size: '4',
    advance_per_group: '2',
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
        group_size: Number(f.group_size) || 4,
        advance_per_group: Number(f.advance_per_group) || 2,
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="c-gs" className="label">Equipes por grupo</label>
              <input id="c-gs" type="number" min={2} className="input" value={f.group_size} onChange={campo('group_size')} />
            </div>
            <div>
              <label htmlFor="c-adv" className="label">Avançam por grupo</label>
              <input id="c-adv" type="number" min={1} className="input" value={f.advance_per_group} onChange={campo('advance_per_group')} />
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
      .select('id, tournament_id, team_id, status, wins, losses, payment_status, group_name, teams(name, tag)')
      .eq('tournament_id', torneioId)
      .order('wins', { ascending: false })
    setInscricoes((data as unknown as Inscricao[]) || [])
  }, [torneioId])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvar(r: Inscricao, campos: Partial<Pick<Inscricao, 'status' | 'wins' | 'losses' | 'payment_status'>>) {
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
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-edge">
                <th className="th">Equipe</th>
                <th className="th">Situação</th>
                <th className="th">Pagamento</th>
                <th className="th">V</th>
                <th className="th">D</th>
                <th className="th"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {inscricoes.map((r) => (
                <LinhaInscricao key={`${r.id}-${r.wins}-${r.losses}-${r.status}-${r.payment_status}`} r={r} salvar={salvar} remover={remover} />
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
  salvar: (r: Inscricao, c: Partial<Pick<Inscricao, 'status' | 'wins' | 'losses' | 'payment_status'>>) => void
  remover: (r: Inscricao) => void
}) {
  const [wins, setWins] = useState(String(r.wins))
  const [losses, setLosses] = useState(String(r.losses))
  const [status, setStatus] = useState(r.status)
  const [pag, setPag] = useState(r.payment_status)
  const mudou =
    Number(wins) !== r.wins || Number(losses) !== r.losses || status !== r.status || pag !== r.payment_status

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
        <select aria-label="Pagamento" className="input" value={pag} onChange={(e) => setPag(e.target.value)}>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="isento">Isento</option>
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
            onClick={() => salvar(r, { status, payment_status: pag, wins: Number(wins) || 0, losses: Number(losses) || 0 })}
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


/* ---------------------------- Grupos e mata-mata -------------------------- */

function paraInputLocal(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function AbaChaves() {
  const [torneios, setTorneios] = useState<Torneio[]>([])
  const [torneioId, setTorneioId] = useState('')
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [ocupado, setOcupado] = useState(false)
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
      .from('matches')
      .select(SELECT_PARTIDA)
      .eq('tournament_id', torneioId)
      .order('stage')
      .order('round')
      .order('id')
    setPartidas((data as unknown as Partida[]) || [])
  }, [torneioId])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function executar(fn: 'sortear_grupos' | 'gerar_mata_mata', pergunta: string, ok: string) {
    if (!confirm(pergunta)) return
    setOcupado(true)
    setMsg({ texto: '', tipo: '' })
    const { error } = await supabase.rpc(fn, { p_torneio_id: Number(torneioId) })
    if (error) setMsg({ texto: erroMsg(error), tipo: 'erro' })
    else {
      setMsg({ texto: ok, tipo: 'sucesso' })
      await carregar()
    }
    setOcupado(false)
  }

  const grupos = partidas.filter((p) => p.stage === 'grupos')
  const mata = partidas.filter((p) => p.stage === 'mata_mata')

  return (
    <section>
      <h2 className="text-2xl font-bold">Grupos e mata-mata</h2>
      <div className="mt-4 max-w-sm">
        <label htmlFor="g-torneio" className="label">Campeonato</label>
        <select id="g-torneio" className="input" value={torneioId} onChange={(e) => setTorneioId(e.target.value)}>
          {torneios.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          disabled={ocupado || !torneioId || mata.length > 0}
          onClick={() =>
            executar(
              'sortear_grupos',
              'Sortear os grupos agora? Só entram equipes com inscrição paga ou isenta. O sorteio anterior será refeito.',
              'Grupos sorteados e jogos criados.'
            )
          }
          className="btn-primary"
        >
          {grupos.length > 0 ? 'Sortear grupos de novo' : 'Sortear grupos'}
        </button>
        <button
          disabled={ocupado || grupos.length === 0 || mata.length > 0}
          onClick={() =>
            executar(
              'gerar_mata_mata',
              'Gerar o mata-mata com os classificados? Todos os jogos da fase de grupos precisam ter resultado.',
              'Mata-mata gerado.'
            )
          }
          className="btn-primary"
        >
          Gerar mata-mata
        </button>
      </div>
      <Aviso msg={msg} />

      {partidas.length === 0 ? (
        <p className="mt-8 text-mute">Nenhum jogo ainda. Feche as inscrições e sorteie os grupos.</p>
      ) : (
        <>
          {grupos.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold">Fase de grupos ({grupos.length} jogos)</h3>
              <ul className="mt-3 space-y-3">
                {grupos.map((p) => (
                  <PartidaAdmin key={`${p.id}-${p.score_a}-${p.score_b}-${p.discord_channel_id}-${p.ready_a}-${p.ready_b}`} p={p} aoMudar={carregar} />
                ))}
              </ul>
            </div>
          )}
          {mata.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold">Mata-mata ({mata.length} jogos)</h3>
              <ul className="mt-3 space-y-3">
                {mata.map((p) => (
                  <PartidaAdmin key={`${p.id}-${p.score_a}-${p.score_b}-${p.team_a_id}-${p.team_b_id}-${p.discord_channel_id}-${p.ready_a}-${p.ready_b}`} p={p} aoMudar={carregar} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function PartidaAdmin({ p, aoMudar }: { p: Partida; aoMudar: () => void }) {
  const [a, setA] = useState(p.score_a === null ? '' : String(p.score_a))
  const [b, setB] = useState(p.score_b === null ? '' : String(p.score_b))
  const [quando, setQuando] = useState(paraInputLocal(p.scheduled_at))
  const [msg, setMsg] = useState<Msg>({ texto: '', tipo: '' })
  const [ocupado, setOcupado] = useState(false)

  const definido = p.team_a_id !== null && p.team_b_id !== null
  const nome = (t: { name: string; tag: string } | null) => (t ? `[${t.tag}] ${t.name}` : 'A definir')
  const rotulo = p.stage === 'grupos' ? `Grupo ${p.group_name}, rodada ${p.round}` : `Mata-mata, rodada ${p.round}`

  async function salvarResultado() {
    if (a === '' || b === '') {
      setMsg({ texto: 'Informe os dois placares.', tipo: 'erro' })
      return
    }
    setOcupado(true)
    const { error } = await supabase.rpc('registrar_resultado', {
      p_match_id: p.id,
      p_a: Number(a),
      p_b: Number(b),
    })
    setOcupado(false)
    if (error) setMsg({ texto: erroMsg(error), tipo: 'erro' })
    else aoMudar()
  }

  async function salvarHorario() {
    setOcupado(true)
    const { error } = await supabase
      .from('matches')
      .update({ scheduled_at: quando ? new Date(quando).toISOString() : null })
      .eq('id', p.id)
    setOcupado(false)
    if (error) setMsg({ texto: erroMsg(error), tipo: 'erro' })
    else setMsg({ texto: 'Horário salvo.', tipo: 'sucesso' })
  }

  async function discord() {
    setOcupado(true)
    setMsg({ texto: '', tipo: '' })
    try {
      await chamarApi('/api/discord/confronto', { match_id: p.id, acao: p.discord_channel_id ? 'encerrar' : 'criar' })
      aoMudar()
    } catch (e) {
      setMsg({ texto: erroMsg(e), tipo: 'erro' })
    }
    setOcupado(false)
  }

  return (
    <li className="card p-4">
      <p className="text-xs text-mute">{rotulo}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 text-right font-medium text-white">{nome(p.team_a)}</span>
        <input aria-label="Placar da equipe A" type="number" min={0} disabled={!definido} className="input w-16 text-center" value={a} onChange={(e) => setA(e.target.value)} />
        <span>x</span>
        <input aria-label="Placar da equipe B" type="number" min={0} disabled={!definido} className="input w-16 text-center" value={b} onChange={(e) => setB(e.target.value)} />
        <span className="min-w-0 flex-1 font-medium text-white">{nome(p.team_b)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={salvarResultado} disabled={ocupado || !definido} className="btn-primary">
          {p.status === 'finalizada' ? 'Corrigir resultado' : 'Salvar resultado'}
        </button>
        <input aria-label="Data e hora" type="datetime-local" className="input w-auto" value={quando} onChange={(e) => setQuando(e.target.value)} />
        <button onClick={salvarHorario} disabled={ocupado} className="btn-ghost">Salvar horário</button>
        <button onClick={discord} disabled={ocupado || !definido} className="btn-ghost">
          {p.discord_channel_id ? 'Encerrar canal no Discord' : 'Criar canal no Discord'}
        </button>
        {p.discord_channel_id && (
          <span className="text-xs text-mute">
            Ready-check: {p.team_a?.tag} {p.ready_a ? 'pronto' : 'aguardando'}, {p.team_b?.tag} {p.ready_b ? 'pronto' : 'aguardando'}
          </span>
        )}
      </div>
      <Aviso msg={msg} />
    </li>
  )
}
