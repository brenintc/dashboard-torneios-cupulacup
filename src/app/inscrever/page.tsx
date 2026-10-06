'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Torneio {
  id: number
  title: string
  game: string
  status: string
}

export default function InscreverEquipa() {
  const router = useRouter()
  const [torneios, setTorneios] = useState<Torneio[]>([])
  const [torneioId, setTorneioId] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamTag, setTeamTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: '' | 'erro' | 'sucesso' }>({
    texto: '',
    tipo: '',
  })

  // 1. Verificar se o utilizador já está logado via Discord
  useEffect(() => {
    async function verificarSessao() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
      }
    }
    verificarSessao()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. Carregar torneios abertos
  useEffect(() => {
    async function carregarTorneiosAbertos() {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, title, game, status')
        .eq('status', 'aberto')

      if (error) {
        console.error('Erro ao carregar torneios:', error)
      } else {
        setTorneios((data as Torneio[]) || [])
      }
    }
    carregarTorneiosAbertos()
  }, [])

  // 3. Login com Discord
  const handleDiscordLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `https://dashboard-cupulacup.vercel.app/inscrever`,
      },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // 4. Submeter a inscrição da equipa
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setMensagem({
        texto: 'Precisa de fazer login com o Discord para inscrever uma equipa.',
        tipo: 'erro',
      })
      return
    }

    const nome = teamName.trim()
    const tag = teamTag.trim()

    if (!torneioId || !nome || !tag) {
      setMensagem({ texto: 'Por favor, preencha todos os campos.', tipo: 'erro' })
      return
    }

    setLoading(true)
    setMensagem({ texto: '', tipo: '' })

    try {
      const discordId = user.user_metadata?.provider_id || user.id

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([
          {
            name: nome,
            tag: tag.toUpperCase(),
            captain_discord_id: discordId,
          },
        ])
        .select()
        .single()

      if (teamError) throw teamError

      const { error: regError } = await supabase.from('tournament_registrations').insert([
        {
          tournament_id: Number(torneioId),
          team_id: teamData.id,
          status: 'inscrito',
          wins: 0,
          losses: 0,
        },
      ])

      if (regError) throw regError

      setMensagem({ texto: 'Equipa inscrita com sucesso no torneio!', tipo: 'sucesso' })
      setTimeout(() => {
        router.push(`/torneio/${torneioId}`)
      }, 2000)
    } catch (error: any) {
      console.error('Erro ao processar inscrição:', error)
      setMensagem({
        texto: `Erro ao inscrever equipa: ${error.message || 'Erro desconhecido'}`,
        tipo: 'erro',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-xl mx-auto p-8">
      <Link href="/" className="text-sm underline">
        ← Voltar
      </Link>

      <h1 className="text-3xl font-bold mt-4 mb-8">Inscrever equipa</h1>

      {!user ? (
        <div className="border rounded-lg p-6 text-center">
          <p className="mb-4">Faça login com o Discord para inscrever a sua equipa.</p>
          <button
            onClick={handleDiscordLogin}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Entrar com Discord
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6 text-sm">
            <span className="text-gray-500">
              Sessão iniciada como{' '}
              {user.user_metadata?.full_name || user.user_metadata?.name || user.email || user.id}
            </span>
            <button onClick={handleLogout} className="underline">
              Sair
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              value={torneioId}
              onChange={(e) => setTorneioId(e.target.value)}
              className="w-full border rounded p-2 bg-transparent"
            >
              <option value="" className="text-black">
                Escolha um torneio
              </option>
              {torneios.map((t) => (
                <option key={t.id} value={t.id} className="text-black">
                  {t.title} ({t.game})
                </option>
              ))}
            </select>

            {torneios.length === 0 && (
              <p className="text-sm text-gray-500">Não há torneios abertos neste momento.</p>
            )}

            <input
              type="text"
              placeholder="Nome da equipa"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full border rounded p-2 bg-transparent"
            />
            <input
              type="text"
              placeholder="TAG (ex: ABC)"
              maxLength={5}
              value={teamTag}
              onChange={(e) => setTeamTag(e.target.value)}
              className="w-full border rounded p-2 bg-transparent uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'A inscrever...' : 'Inscrever equipa'}
            </button>
          </form>
        </>
      )}

      {mensagem.texto && (
        <p className={`mt-4 ${mensagem.tipo === 'erro' ? 'text-red-600' : 'text-green-600'}`}>
          {mensagem.texto}
        </p>
      )}
    </main>
  )
}