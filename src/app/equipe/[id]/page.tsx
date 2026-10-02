'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Member {
  id: number
  player_name: string
  discord_id: string
}

interface Team {
  id: number
  name: string
  tag: string
  captain_discord_id: string
}

export default function GestaoEquipa() {
  const params = useParams()
  const teamId = params.id

  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [playerName, setPlayerName] = useState('')
  const [playerDiscord, setPlayerDiscord] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' })

  useEffect(() => {
    if (!teamId) return

    async function carregarDadosEquipa() {
      // Buscar dados da equipa
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      if (teamError) {
        console.error('Erro ao carregar equipa:', teamError)
      } else {
        setTeam(teamData)
      }

      // Buscar membros da equipa
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)

      if (!membersError) {
        setMembers(membersData || [])
      }
    }

    carregarDadosEquipa()
  }, [teamId])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName || !playerDiscord) {
      setMensagem({ texto: 'Preencha o nome e o Discord do jogador.', tipo: 'erro' })
      return
    }

    setLoading(true)
    setMensagem({ texto: '', tipo: '' })

    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert([
          {
            team_id: Number(teamId),
            player_name: playerName,
            discord_id: playerDiscord
          }
        ])
        .select()

      if (error) throw error

      setMembers([...members, ...(data || [])])
      setPlayerName('')
      setPlayerDiscord('')
      setMensagem({ texto: 'Jogador adicionado com sucesso!', tipo: 'sucesso' })
    } catch (error: any) {
      setMensagem({ texto: `Erro ao adicionar jogador: ${error.message}`, tipo: 'erro' })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: number) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setMembers(members.filter((m) => m.id !== memberId))
    } catch (error: any) {
      console.error('Erro ao remover membro:', error)
    }
  }

  if (!team) {
    return