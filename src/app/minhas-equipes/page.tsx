'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import type { Equipe, Msg } from '@/lib/types'
import { erroMsg } from '@/lib/utils'
import { Aviso, Pagina } from '@/components/ui'

type Linha = Equipe & { team_members: { count: number }[] }

export default function MinhasEquipes() {
  const router = useRouter()
  const { user, loading, login } = useAuth()
  const [equipes, setEquipes] = useState<Linha[]>([])
  const [nome, setNome] = useState('')
  const [tag, setTag] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<Msg>({ texto: '', tipo: '' })

  const carregar = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('teams')
      .select('*, team_members(count)')
      .eq('captain_user_id', user.id)
      .order('name')
    setEquipes((data as unknown as Linha[]) || [])
  }, [user])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !tag.trim()) {
      setMsg({ texto: 'Preencha o nome e a TAG da equipe.', tipo: 'erro' })
      return
    }
    setOcupado(true)
    setMsg({ texto: '', tipo: '' })
    const { data, error } = await supabase.rpc('criar_equipe', {
      p_nome: nome,
      p_tag: tag,
    })
    setOcupado(false)
    if (error) {
      setMsg({ texto: erroMsg(error), tipo: 'erro' })
      return
    }
    router.push(`/equipe/${data}`)
  }

  if (loading) return <Pagina><p className="text-mute">Carregando...</p></Pagina>

  if (!user)
    return (
      <Pagina largura="max-w-xl">
        <h1 className="text-4xl font-bold">Minhas equipes</h1>
        <div className="card mt-6 p-6">
          <p className="mb-4">Entre com o Discord para criar e gerenciar suas equipes.</p>
          <button onClick={login} className="btn-primary">
            Entrar com Discord
          </button>
        </div>
      </Pagina>
    )

  return (
    <Pagina largura="max-w-3xl">
      <h1 className="text-4xl font-bold">Minhas equipes</h1>

      <section className="mt-8">
        {equipes.length === 0 ? (
          <p className="text-mute">Você ainda não tem nenhuma equipe. Crie a primeira abaixo.</p>
        ) : (
          <ul className="grid gap-3">
            {equipes.map((e) => (
              <li key={e.id}>
                <Link href={`/equipe/${e.id}`} className="card card-link flex items-center justify-between p-4">
                  <span className="text-lg font-semibold text-white">
                    [{e.tag}] {e.name}
                  </span>
                  <span className="text-sm text-mute">
                    {e.team_members?.[0]?.count ?? 0} jogadores
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Criar equipe</h2>
        <form onSubmit={criar} className="card mt-4 space-y-4 p-5">
          <div>
            <label htmlFor="nome" className="label">Nome da equipe</label>
            <input id="nome" className="input" maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label htmlFor="tag" className="label">TAG (2 a 5 letras)</label>
            <input
              id="tag"
              className="input uppercase sm:max-w-32"
              maxLength={5}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
          </div>
          <button type="submit" disabled={ocupado} className="btn-primary">
            {ocupado ? 'Criando...' : 'Criar equipe'}
          </button>
          <Aviso msg={msg} />
        </form>
      </section>
    </Pagina>
  )
}
