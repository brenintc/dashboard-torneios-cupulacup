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
  } | null
}

export default function DetalhesTorneio() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [torneio, setTorneio] = useState<Torneio | null>(null)
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelado = false

    async function carregarDadosDoTorneio() {
      const [torneioRes, inscricoesRes] = await Promise.all([
        supabase.from('tournaments').select('*').eq('id', id).single(),
        supabase
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
          .order('wins', { ascending: false }),
      ])

      if (cancelado) return

      if (torneioRes.error) {
        console.error('Erro ao buscar torneio:', torneioRes.error)
      } else {
        setTorneio(torneioRes.data as Torneio)
      }

      if (inscricoesRes.error) {
        console.error('Erro ao buscar inscrições:', inscricoesRes.error)
      } else {
        setInscricoes((inscricoesRes.data as unknown as Inscricao[]) || [])
      }

      setLoading(false)
    }

    carregarDadosDoTorneio()

    return () => {
      cancelado = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>A carregar torneio...</p>
      </div>
    )
  }

  if (!torneio) {
    return (
      <div className="p-8 text-center">
        <p>Torneio não encontrado.</p>
        <Link href="/" className="underline">
          Voltar ao início
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <Link href="/" className="text-sm underline">
        ← Voltar
      </Link>

      <h1 className="text-3xl font-bold mt-4">{torneio.title}</h1>
      <p className="text-gray-500">
        {torneio.game} · {torneio.status} · {inscricoes.length}/{torneio.max_teams} equipas
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-4">Equipas inscritas</h2>

      {inscricoes.length === 0 ? (
        <p>Ainda não há equipas inscritas.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Equipa</th>
              <th>V</th>
              <th>D</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {inscricoes.map((inscricao) => (
              <tr key={inscricao.id}>
                <td>
                  [{inscricao.teams?.tag}] {inscricao.teams?.name}
                </td>
                <td>{inscricao.wins}</td>
                <td>{inscricao.losses}</td>
                <td>{inscricao.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}