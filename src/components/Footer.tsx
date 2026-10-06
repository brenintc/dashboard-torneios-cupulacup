import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-edge">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <p className="font-display text-lg font-bold text-white">Cúpula Cup</p>
          <p className="mt-2 text-sm text-mute">
            Campeonatos de EA FC Pro Clubs com inscrição de equipes, grupos e classificação.
          </p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm">
          <Link href="/campeonatos" className="hover:text-white">
            Campeonatos
          </Link>
          <Link href="/hall-da-fama" className="hover:text-white">
            Hall da Fama
          </Link>
          <Link href="/minhas-equipes" className="hover:text-white">
            Minhas equipes
          </Link>
          <Link href="/regras" className="hover:text-white">
            Regras
          </Link>
        </nav>
        <nav aria-label="Institucional" className="flex flex-col gap-2 text-sm">
          <Link href="/termos" className="hover:text-white">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="hover:text-white">
            Privacidade
          </Link>
        </nav>
      </div>
      <p className="border-t border-edge px-5 py-4 text-center text-xs text-mute">
        © {new Date().getFullYear()} Cúpula Cup. Projeto independente, não afiliado à EA Sports.
      </p>
    </footer>
  )
}
