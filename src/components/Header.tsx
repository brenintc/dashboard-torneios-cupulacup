'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'

const LINKS = [
  { href: '/campeonatos', label: 'Campeonatos' },
  { href: '/minhas-equipes', label: 'Minhas equipes' },
  { href: '/regras', label: 'Regras' },
]

export default function Header() {
  const pathname = usePathname()
  const { user, isAdmin, loading, login, logout } = useAuth()
  const [aberto, setAberto] = useState(false)

  const links = isAdmin ? [...LINKS, { href: '/admin', label: 'Admin' }] : LINKS
  const nome =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Conta'
  const avatar = user?.user_metadata?.avatar_url as string | undefined

  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex items-center gap-3" aria-label="Cúpula Cup, página inicial">
          <Image
            src="/logo.jpg"
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 object-contain mix-blend-screen"
          />
          <span className="font-display text-lg font-bold text-white">Cúpula Cup</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {links.map((l) => {
            const ativo = pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-2 text-sm transition ${
                  ativo ? 'bg-brand/15 text-white' : 'text-silver hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {loading ? null : user ? (
            <>
              {avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="h-8 w-8 rounded-full" />
              )}
              <span className="max-w-32 truncate text-sm">{nome}</span>
              <button onClick={logout} className="btn-ghost">
                Sair
              </button>
            </>
          ) : (
            <button onClick={login} className="btn-primary">
              Entrar com Discord
            </button>
          )}
        </div>

        <button
          className="btn-ghost md:hidden"
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          aria-controls="menu-mobile"
        >
          Menu
        </button>
      </div>

      {aberto && (
        <div id="menu-mobile" className="border-t border-edge px-5 py-3 md:hidden">
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
              <button onClick={logout} className="btn-ghost w-full">
                Sair ({nome})
              </button>
            ) : (
              <button onClick={login} className="btn-primary w-full">
                Entrar com Discord
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
