'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import UserMenu from '@/components/UserMenu'

const LINKS = [
  { href: '/campeonatos', label: 'Campeonatos' },
  { href: '/hall-da-fama', label: 'Hall da Fama' },
  { href: '/minhas-equipes', label: 'Minhas equipes' },
  { href: '/regras', label: 'Regras' },
]

export default function Header() {
  const pathname = usePathname()
  const { user, isAdmin, loading, login, logout } = useAuth()
  const [aberto, setAberto] = useState(false)

  const links = isAdmin ? [...LINKS, { href: '/admin', label: 'Admin' }] : LINKS

  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-3" aria-label="Cúpula Cup, página inicial">
          <Image src="/logo.jpg" alt="" width={44} height={44} className="h-11 w-11 object-contain mix-blend-screen" />
          <span className="font-display text-lg font-bold text-white">Cúpula Cup</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-2 text-sm transition ${
                pathname.startsWith(l.href) ? 'bg-brand/15 text-white' : 'text-silver hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          {loading ? null : user ? (
            <UserMenu user={user} onSair={logout} />
          ) : (
            <button onClick={login} className="btn-primary">
              Entrar
            </button>
          )}
        </div>

        <button
          className="btn-ghost lg:hidden"
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          aria-controls="menu-mobile"
        >
          Menu
        </button>
      </div>

      {aberto && (
        <div id="menu-mobile" className="border-t border-edge px-5 py-3 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Principal">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setAberto(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-brand/15"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3">
            {user ? (
              <UserMenu user={user} onSair={logout} />
            ) : (
              <button onClick={login} className="btn-primary w-full">
                Entrar
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
