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
    async function carregar() {
      const { data } = await supabase
        .from('tournaments')
        .select('id, title, game, status')
        .order('id', { ascending: false })

      if (data) {
        setTorneios(data)
      }
      setLoading(false)
    }
    carregar()
  }, [])

  return (