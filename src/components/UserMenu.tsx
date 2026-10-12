'use client'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { perfilDoUsuario } from '@/lib/perfil'

export function Avatar({ foto, iniciais, tamanho = 32 }: { foto: string | null; iniciais: string; tamanho?: number }) {
  const estilo = { width: tamanho, height: tamanho }
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt=""
        referrerPolicy="no-referrer"
        style={estilo}
        className="shrink-0 rounded-full border border-edge object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden
      style={{ ...estilo, fontSize: tamanho * 0.4 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand/25 font-display font-bold text-brand-hi"
    >
      {iniciais}
    </span>
  )
}

const ORIGEM: Record<string, string> = { discord: 'Discord', google: 'Google', email: 'E-mail' }

export default function UserMenu({ user, onSair }: { user: User; onSair: () => void }) {
  const p = perfilDoUsuario(user)
  return (
    <div className="flex items-center gap-3">
      <Link href="/conta" className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-brand/10" aria-label={`Minha conta (${ORIGEM[p.origem]})`}>
        <Avatar foto={p.foto} iniciais={p.iniciais} />
        <span className="max-w-40 truncate text-sm text-white">{p.titulo}</span>
      </Link>
      <button onClick={onSair} className="btn-ghost">
        Sair
      </button>
    </div>
  )
}
