import Link from 'next/link'
import type { Msg, Torneio } from '@/lib/types'
import { STATUS_TORNEIO } from '@/lib/types'
import { fmtData, fmtMoeda } from '@/lib/utils'

export function StatusBadge({ status }: { status: string }) {
  const cor =
    status === 'aberto'
      ? 'bg-emerald-500/15 text-emerald-300'
      : status === 'em_andamento'
        ? 'bg-brand/20 text-brand-hi'
        : 'bg-white/10 text-mute'
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${cor}`}>
      {STATUS_TORNEIO[status] ?? status}
    </span>
  )
}

export function Aviso({ msg }: { msg: Msg }) {
  if (!msg.texto) return null
  const cor = msg.tipo === 'erro' ? 'text-red-400' : 'text-emerald-400'
  return (
    <p role="status" className={`mt-4 text-sm ${cor}`}>
      {msg.texto}
    </p>
  )
}

export function Pagina({ children, largura = 'max-w-5xl' }: { children: React.ReactNode; largura?: string }) {
  return <main className={`mx-auto w-full ${largura} px-5 py-10`}>{children}</main>
}

export function TorneioCard({ t, inscritas }: { t: Torneio; inscritas: number }) {
  return (
    <Link href={`/campeonatos/${t.id}`} className="card card-link p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold">{t.title}</h3>
        <StatusBadge status={t.status} />
      </div>
      <p className="mt-1 text-sm text-mute">
        {t.game}
        {t.edition ? `, ${t.edition}` : ''}
      </p>
      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-mute">Equipes</dt>
          <dd className="font-semibold text-white">
            {inscritas}
            {t.max_teams ? `/${t.max_teams}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-mute">Inscrição</dt>
          <dd className="font-semibold text-white">{fmtMoeda(t.entry_fee)}</dd>
        </div>
        <div>
          <dt className="text-mute">Prêmio</dt>
          <dd className="font-semibold text-white">{t.prize || 'A definir'}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-mute">Início: {fmtData(t.starts_at)}</p>
    </Link>
  )
}
