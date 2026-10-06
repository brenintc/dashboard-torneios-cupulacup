import Image from 'next/image'
import Link from 'next/link'
import CampeonatosAbertos from '@/components/CampeonatosAbertos'

const PILARES = [
  {
    titulo: 'Login com Discord',
    texto: 'Entre com sua conta do Discord. Sem senha nova e sem cadastro longo.',
  },
  {
    titulo: 'Sua equipe, seu elenco',
    texto: 'Crie a equipe, cadastre os jogadores e gerencie tudo em um só lugar.',
  },
  {
    titulo: 'Inscrição em um clique',
    texto: 'Escolha o campeonato, selecione a equipe e pronto. A vaga é confirmada na hora.',
  },
  {
    titulo: 'Classificação ao vivo',
    texto: 'Acompanhe vitórias, derrotas e a tabela de cada campeonato sem depender de print.',
  },
]

const PASSOS = [
  { titulo: 'Crie sua equipe', texto: 'Entre com o Discord, escolha nome e TAG e cadastre seus jogadores.' },
  { titulo: 'Inscreva-se', texto: 'Escolha um campeonato com inscrições abertas e selecione sua equipe.' },
  { titulo: 'Jogue e acompanhe', texto: 'Veja os resultados e a classificação atualizados na página do campeonato.' },
]

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-5xl items-center gap-8 px-5 pb-10 pt-12 md:grid-cols-2 md:pt-20">
        <div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] sm:text-6xl">
            Monte a equipe.
            <br />
            Dispute a Cúpula.
          </h1>
          <p className="mt-6 max-w-md text-lg text-silver">
            Campeonatos de EA FC Pro Clubs com inscrição pelo Discord, grupos e classificação
            sempre atualizada.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/campeonatos" className="btn-primary">
              Ver campeonatos
            </Link>
            <Link href="/minhas-equipes" className="btn-ghost">
              Criar minha equipe
            </Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-brand/30 blur-[90px]"
          />
          <Image
            src="/logo.jpg"
            alt="Logo da Cúpula Cup: bola de futebol sob uma coroa de lâminas azuis"
            width={900}
            height={900}
            priority
            className="h-auto w-full mix-blend-screen"
          />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pt-10">
        <h2 className="text-3xl font-bold">Campeonatos com inscrições abertas</h2>
        <div className="mt-6">
          <CampeonatosAbertos />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pt-20">
        <h2 className="text-3xl font-bold">Feito para levar o Pro Clubs a sério</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PILARES.map((p) => (
            <div key={p.titulo} className="card p-6">
              <h3 className="text-lg font-semibold">{p.titulo}</h3>
              <p className="mt-2 text-sm text-silver">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pt-20">
        <h2 className="text-3xl font-bold">Do cadastro ao apito inicial</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="border-l-2 border-brand pl-5">
              <span className="font-display text-4xl font-bold text-brand-hi">{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{p.titulo}</h3>
              <p className="mt-1 text-sm text-silver">{p.texto}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <Link href="/campeonatos" className="btn-primary">
            Quero competir
          </Link>
        </div>
      </section>
    </>
  )
}
