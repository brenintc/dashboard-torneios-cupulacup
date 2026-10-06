'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Torneio } from '@/lib/types'
import { TorneioCard } from '@/components/ui'

type Linha = Torneio & { tournament_registrations: { count: number }[] }

export default function CampeonatosAbertos() {
  const [lista, setLista] = useState<Linha[] | null>(null)

  useEffect(() => {
    supabase
      .from('tournaments')
      .select('*, tournament_registrations(count)')
      .eq('status', 'aberto')
      .order('id', { ascending: false })
      .limit(3)
      .then(({ data }) => setLista((data as unknown as Linha[]) || []))
  }, [])

  if (lista === null) return <p className="text-mute">Carregando campeonatos...</p>
  if (lista.length === 0)
    return <p className="text-mute">Nenhum campeonato com inscrições abertas agora. Volte em breve.</p>

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {lista.map((t) => (
        <TorneioCard key={t.id} t={t} inscritas={t.tournament_registrations?.[0]?.count ?? 0} />
      ))}
    </div>
  )
}
