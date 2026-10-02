'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Torneio {
  id: number
  title: string
  game: string
  status: string
}

export default function Home() {
  const [torneios, setTorneios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarTorneios() {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, title, game, status')
        .order('id', { ascending: false })

      if (error) {
        console.error('Erro ao carregar torneios:', error)
      } else {
        setTorneios(data || [])
      }
      setLoading(false)
    }
    carregarTorneios()
  }, [])

  return (