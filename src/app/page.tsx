'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Torneio {
  id: number
  title: string
  game: string
  status: string
  max_teams: number
}

export default function Home() {
  const [torneios, setTorneios] = useState([])

  useEffect(() => {
    async function carregarTorneios() {
      const { data, error } = await supabase.from('tournaments').select('*')
      if (error) {
        console.error('Erro ao buscar torneios:', error)
      } else {
        setTorneios(data || [])
      }
    }
    carregarTorneios()
  }, [])

  return (