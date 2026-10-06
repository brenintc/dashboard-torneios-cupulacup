'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Torneio } from '@/lib/types'
import { Pagina, TorneioCard } from '@/components/ui'

type Linha = Torneio & { tournament_registrations: { count: number }[] }

const STATUS = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'aberto', label: 'Inscrições abertas' },
  { valor: 'em_andamento', label: 'Em andamento' },
  { valor: 'finalizado', label: 'Finalizados' },
]

export default function Campeonatos() {
  const [lista, setLista] = useState<Linha[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [edicao, setEdicao] = useState('todas')
  const [status, setStatus] = useState('todos')

  useEffect(() => {
    supabase
      .from('tournaments')
      .select('*, tournament_registrations(count)')
      .order('id', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro('Não foi possível carregar os campeonatos. Tente recarregar a página.')
        else setLista((data as unknown as Linha[]) || [])
        setCarregando(false)
      })
  }, [])

  const edicoes = Array.from(new Set(lista.map((t) => t.edition).filter(Boolean))) as string[]
  const filtrada = lista.filter(
    (t) => (edicao === 'todas' || t.edition === edicao) && (status === 'todos' || t.status === status)
  )

  return (
    <Pagina>
      <h1 className="text-4xl font-bold">Campeonatos</h1>

      <div className="mt-6 flex flex-wrap gap-6">
        {edicoes.length > 0 && (
          <div role="group" aria-label="Edição" className="flex flex-wrap gap-2">
            {['todas', ...edicoes].map((e) => (
              <button
                key={e}
                onClick={() => setEdicao(e)}
                aria-pressed={edicao === e}
                className={edicao === e ? 'btn-primary' : 'btn-ghost'}
              >
                {e === 'todas' ? 'Todas as edições' : e}
              </button>
            ))}
          </div>
        )}
        <div role="group" aria-label="Status" className="flex flex-wrap gap-2">
          {STATUS.map((s) => (
            <button
              key={s.valor}
              onClick={() => setStatus(s.valor)}
              aria-pressed={status === s.valor}
              className={status === s.valor ? 'btn-primary' : 'btn-ghost'}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {carregando && <p className="text-mute">Carregando campeonatos...</p>}
        {erro && <p className="text-red-400">{erro}</p>}
        {!carregando && !erro && filtrada.length === 0 && (
          <p className="text-mute">Nenhum campeonato encontrado com esses filtros.</p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {filtrada.map((t) => (
            <TorneioCard key={t.id} t={t} inscritas={t.tournament_registrations?.[0]?.count ?? 0} />
          ))}
        </div>
      </div>
    </Pagina>
  )
}
