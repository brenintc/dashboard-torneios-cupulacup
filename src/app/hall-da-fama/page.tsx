'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Pagina } from '@/components/ui'

interface Campeao {
  tournament_id: number
  title: string
  edition: string | null
  prize: string | null
  played_at: string | null
  score_a: number | null
  score_b: number | null
  champion_id: number
  champion_name: string
  champion_tag: string
  runner_name: string | null
  runner_tag: string | null
}

export default function HallDaFama() {
  const [lista, setLista] = useState<Campeao[] | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('hall_da_fama')
      .select('*')
      .order('played_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro('Não foi possível carregar o Hall da Fama.')
        setLista((data as Campeao[]) || [])
      })
  }, [])

  const titulos = new Map<number, { nome: string; tag: string; total: number }>()
  for (const c of lista || []) {
    const atual = titulos.get(c.champion_id)
    if (atual) atual.total++
    else titulos.set(c.champion_id, { nome: c.champion_name, tag: c.champion_tag, total: 1 })
  }
  const ranking = Array.from(titulos.values()).sort((a, b) => b.total - a.total)

  return (
    <Pagina largura="max-w-4xl">
      <h1 className="text-4xl font-bold">Hall da Fama</h1>
      <p className="mt-2 text-silver">Os campeões de cada campeonato da Cúpula Cup.</p>

      {lista === null && <p className="mt-8 text-mute">Carregando...</p>}
      {erro && <p className="mt-8 text-red-400">{erro}</p>}
      {lista && lista.length === 0 && !erro && (
        <p className="mt-8 text-mute">Nenhum campeonato foi finalizado ainda. O primeiro campeão entra aqui.</p>
      )}

      {ranking.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">Maiores campeões</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {ranking.map((r, i) => (
              <li key={r.tag + r.nome} className="card flex items-center justify-between p-4">
                <span>
                  <span className="mr-3 font-display text-2xl font-bold text-brand-hi">{i + 1}</span>
                  <span className="font-semibold text-white">[{r.tag}] {r.nome}</span>
                </span>
                <span className="text-sm text-mute">{r.total} {r.total === 1 ? 'título' : 'títulos'}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {lista && lista.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Campeões por campeonato</h2>
          <ul className="mt-4 space-y-3">
            {lista.map((c) => (
              <li key={c.tournament_id} className="card p-5">
                <p className="text-sm text-mute">
                  {c.title}
                  {c.edition ? `, ${c.edition}` : ''}
                  {c.played_at ? `. ${new Date(c.played_at).toLocaleDateString('pt-BR')}` : ''}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-white">
                  [{c.champion_tag}] {c.champion_name}
                </p>
                <p className="mt-1 text-sm text-silver">
                  {c.runner_name ? `Vice: [${c.runner_tag}] ${c.runner_name}. ` : ''}
                  {c.prize ? `Prêmio: ${c.prize}.` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Pagina>
  )
}
