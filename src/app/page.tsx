'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Definimos a interface para o formato do Torneio
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
      // Ajustado para consultar a tabela 'tournaments' que criámos no Supabase
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