'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const [torneios, setTorneios] = useState([])
  const [torneioId, setTorneioId] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamTag, setTeamTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' })

  // 1. Verificar se o utilizador já está logado via Discord
  useEffect(() => {
    async function verificarSessao() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
      }
    }
    verificarSessao()

    // Ouve alterações de autenticação em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
        setTorneios(data || [])
      }
    }
    carregarTorneiosAbertos()
  }, [])

  // 3. Função de Login com Discord
  const handleDiscordLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/inscrever`
      }
    })
  }

  // 4. Submeter a Inscrição da Equipa
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setMensagem({ texto: 'Precisa de fazer login com o Discord para inscrever uma equipa.', tipo: 'erro' })
      return
    }

    if (!torneioId || !teamName || !teamTag) {
      setMensagem({ texto: 'Por favor, preencha todos os campos.', tipo: 'erro' })
      return
    }

    setLoading(true)
    setMensagem({ texto: '', tipo: '' })

    try {
      // Capturar o ID do Discord do utilizador autenticado
      const discordId = user.user_metadata?.provider_id || user.id

      // 1. Criar a equipa na tabela 'teams' com o ID real do capitão
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([
          {
            name: teamName,
            tag: teamTag.toUpperCase(),
            captain_discord_id: discordId
          }
        ])
        .select()
        .single()

      if (teamError) throw teamError

      // 2. Inscrever a equipa no torneio escolhido
      const { error: regError } = await supabase
        .from('tournament_registrations')
        .insert([
          {
            tournament_id: Number(torneioId),
            team_id: teamData.id,
            status: 'inscrito',
            wins: 0,
            losses: 0
          }
        ])

      if (regError) throw regError

      setMensagem({ texto: 'Equipa inscrita com sucesso no torneio!', tipo: 'sucesso' })
      setTimeout(() => {
        router.push(`/torneio/${torneioId}`)
      }, 2000)

    } catch (error: any) {
      console.error('Erro ao processar inscrição:', error)
      setMensagem({ texto: `Erro ao inscrever equipa: ${error.message || 'Erro desconhecido'}`, tipo: 'erro' })
    } finally {
      setLoading(false)
    }
  }

  return (