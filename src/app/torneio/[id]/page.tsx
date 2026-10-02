'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Torneio {
  id: number
  title: string
  game: string
  status: string
  max_teams: number
}

interface Inscricao {
  id: number
  wins: number
  losses: number
  status: string
  teams: {
    name: string
    tag: string
  }
}

export default function DetalhesTorneio() {
  const params = useParams()
  const id = params?.id

  const [torneio, setTorneio] = useState(null)
  const [inscricoes, setInscricoes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    async function carregarDadosDoTorneio() {
      // 1. Buscar detalhes do torneio
      const { data: torneioData, error: torneioError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()

      if (torneioError) {
        console.error('Erro ao buscar torneio:', torneioError)
      } else {
        setTorneio(torneioData)
      }

      // 2. Buscar equipas inscritas neste torneio usando o relacionamento
      const { data: inscricoesData, error: inscricoesError } = await supabase
        .from('tournament_registrations')
        .select(`
          id,
          wins,
          losses,
          status,
          teams (
            name,
            tag
          )
        `)
        .eq('tournament_id', id)

      if (inscricoesError) {
        console.error('Erro ao buscar inscrições:', inscricoesError)
      } else {
        setInscricoes(inscricoesData || [])
      }

      setLoading(false)
    }

    carregarDadosDoTorneio()
  }, [id])

  if (loading) {
    return