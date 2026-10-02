'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [torneios, setTorneios] = useState([])

  useEffect(() => {
    async function carregarTorneios() {
      const { data, error } = await supabase.from('torneios').select('*')
      if (error) {
        console.error('Erro ao buscar torneios:', error)
      } else {
        setTorneios(data)
      }
    }
    carregarTorneios()
  }, [])

  return (