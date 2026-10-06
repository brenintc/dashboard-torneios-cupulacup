'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import type { Equipe, Membro, Msg } from '@/lib/types'
import { erroMsg } from '@/lib/utils'
import { Aviso, Pagina, StatusBadge } from '@/components/ui'

type Participacao = {
  id: number
  status: string
  tournaments: { id: number; title: string; status: string } | null
}

export default function PaginaEquipe() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isAdmin, loading: authLoading } = useAuth()

  const [equipe, setEquipe] = useState<Equipe | null>(null)
  const [membros, setMembros] = useState<Membro[]>([])
  const [participacoes, setParticipacoes] = useState<Participacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [nome, setNome] = useState('')
  const [discord, setDiscord] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<Msg>({ texto: '', tipo: '' })

  const podeGerenciar = !!user && !!equipe && (equipe.captain_user_id === user.id || isAdmin)

  const carregar = useCallback(async () => {
    const { data: t } = await supabase.from('teams').select('*').eq('id', id).single()
    setEquipe((t as Equipe) || null)

    const { data: p } = await supabase
      .from('tournament_registrations')
      .select('id, status, tournaments(id, title, status)')
      .eq('team_id', id)
    setParticipacoes((p as unknown as Participacao[]) || [])
    setCarregando(false)
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!podeGerenciar) {
      setMembros([])
      return
    }
    supabase
      .from('team_members')
      .select('*')
      .eq('team_id', id)
      .order('id')
      .then(({ data }) => setMembros((data as Membro[]) || []))
  }, [podeGerenciar, id])

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    const n = nome.trim()
    const d = discord.trim()
    if (!n || !d) {
      setMsg({ texto: 'Preencha o nome e o Discord do jogador.', tipo: 'erro' })
      return
    }
    setOcupado(true)
    setMsg({ texto: '', tipo: '' })
    const { data, error } = await supabase
      .from('team_members')
      .insert([{ team_id: Number(id), player_name: n, discord_id: d }])
      .select()
    if (error) {
      const jaExiste = error.code === '23505'
      setMsg({
        texto: jaExiste ? 'Esse Discord já está no elenco.' : `Erro ao adicionar jogador: ${erroMsg(error)}`,
        tipo: 'erro',
      })
    } else {
      setMembros((m) => [...m, ...((data as Membro[]) || [])])
      setNome('')
      setDiscord('')
      setMsg({ texto: 'Jogador adicionado.', tipo: 'sucesso' })
    }
    setOcupado(false)
  }

  async function remover(m: Membro) {
    if (!confirm(`Remover ${m.player_name} do elenco?`)) return
    const { error } = await supabase.from('team_members').delete().eq('id', m.id)
    if (error) setMsg({ texto: `Erro ao remover jogador: ${erroMsg(error)}`, tipo: 'erro' })
    else setMembros((lista) => lista.filter((x) => x.id !== m.id))
  }

  async function excluirEquipe() {
    if (!equipe || !confirm(`Excluir a equipe ${equipe.name}? Isso não pode ser desfeito.`)) return
    const { error } = await supabase.rpc('excluir_equipe', { p_team_id: equipe.id })
    if (error) setMsg({ texto: erroMsg(error), tipo: 'erro' })
    else router.push('/minhas-equipes')
  }

  if (carregando || authLoading) return <Pagina><p className="text-mute">Carregando equipe...</p></Pagina>

  if (!equipe)
    return (
      <Pagina>
        <p>Equipe não encontrada.</p>
        <Link href="/campeonatos" className="btn-ghost mt-4">
          Ver campeonatos
        </Link>
      </Pagina>
    )

  return (
    <Pagina largura="max-w-3xl">
      <h1 className="text-4xl font-bold">
        [{equipe.tag}] {equipe.name}
      </h1>

      <section className="mt-8">
        <h2 className="text-2xl font-bold">Campeonatos</h2>
        {participacoes.length === 0 ? (
          <p className="mt-3 text-mute">
            Esta equipe ainda não está em nenhum campeonato.
            {podeGerenciar && (
              <>
                {' '}
                <Link href="/campeonatos" className="text-brand-hi underline">
                  Escolher um campeonato
                </Link>
              </>
            )}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {participacoes.map((p) =>
              p.tournaments ? (
                <li key={p.id} className="card flex items-center justify-between gap-3 p-4">
                  <Link href={`/campeonatos/${p.tournaments.id}`} className="font-medium text-white hover:text-brand-hi">
                    {p.tournaments.title}
                  </Link>
                  <StatusBadge status={p.tournaments.status} />
                </li>
              ) : null
            )}
          </ul>
        )}
      </section>

      {podeGerenciar && (
        <>
          <section className="mt-10">
            <h2 className="text-2xl font-bold">Elenco ({membros.length})</h2>
            {membros.length === 0 ? (
              <p className="mt-3 text-mute">Nenhum jogador cadastrado. Adicione o elenco abaixo.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {membros.map((m) => (
                  <li key={m.id} className="card flex items-center justify-between gap-3 p-4">
                    <span>
                      <span className="font-medium text-white">{m.player_name}</span>
                      <span className="ml-2 text-sm text-mute">Discord: {m.discord_id}</span>
                    </span>
                    <button onClick={() => remover(m)} className="btn-danger">
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-bold">Adicionar jogador</h2>
            <form onSubmit={adicionar} className="card mt-4 space-y-4 p-5">
              <div>
                <label htmlFor="jogador" className="label">Nome do jogador</label>
                <input id="jogador" className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <label htmlFor="discord" className="label">ID do Discord</label>
                <input id="discord" className="input" value={discord} onChange={(e) => setDiscord(e.target.value)} />
              </div>
              <button type="submit" disabled={ocupado} className="btn-primary">
                {ocupado ? 'Adicionando...' : 'Adicionar jogador'}
              </button>
              <Aviso msg={msg} />
            </form>
          </section>

          <section className="mt-12 border-t border-edge pt-6">
            <button onClick={excluirEquipe} className="btn-danger">
              Excluir equipe
            </button>
          </section>
        </>
      )}
    </Pagina>
  )
}
