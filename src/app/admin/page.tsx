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

export default function AdminDashboard() {
  const [torneios, setTorneios] = useState([])
  const [title, setTitle] = useState('')
  const [game, setGame] = useState('')
  const [status, setStatus] = useState('aberto')
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' })

  const carregarTorneios = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('id, title, game, status')
      .order('id', { ascending: false })

    if (!error) {
      setTorneios(data || [])
    }
  }

  useEffect(() => {
    carregarTorneios()
  }, [])

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !game) {
      setMensagem({ texto: 'Preencha o título e o jogo do torneio.', tipo: 'erro' })
      return
    }

    setLoading(true)
    setMensagem({ texto: '', tipo: '' })

    try {
      const { error } = await supabase
        .from('tournaments')
        .insert([
          {
            title,
            game,
            status
          }
        ])

      if (error) throw error

      setMensagem({ texto: 'Torneio criado com sucesso!', tipo: 'sucesso' })
      setTitle('')
      setGame('')
      carregarTorneios()
    } catch (error: any) {
      setMensagem({ texto: `Erro ao criar torneio: ${error.message}`, tipo: 'erro' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: number, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: novoStatus })
        .eq('id', id)

      if (error) throw error
      carregarTorneios()
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  return (