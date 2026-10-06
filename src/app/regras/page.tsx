import { Pagina } from '@/components/ui'

const REGRAS = [
  {
    titulo: 'Equipes e elenco',
    texto:
      'Cada equipe tem um capitão responsável pela inscrição e pelo elenco. Todos os jogadores precisam estar cadastrados na equipe antes do início do campeonato.',
  },
  {
    titulo: 'Inscrição',
    texto:
      'A vaga é garantida quando a equipe aparece na lista do campeonato. Inscrições podem ser canceladas apenas enquanto estiverem abertas.',
  },
  {
    titulo: 'Partidas',
    texto:
      'Os horários são combinados pela organização no Discord. Atrasos superiores ao limite do regulamento podem resultar em derrota por W.O.',
  },
  {
    titulo: 'Resultados',
    texto:
      'O resultado é registrado pela organização. Em caso de divergência, as equipes devem enviar as provas ao suporte no Discord.',
  },
  {
    titulo: 'Conduta',
    texto:
      'Ofensas, uso de bugs ou qualquer forma de trapaça podem levar à eliminação da equipe e ao banimento dos campeonatos.',
  },
]

export default function Regras() {
  return (
    <Pagina largura="max-w-3xl">
      <h1 className="text-4xl font-bold">Regras</h1>
      <p className="mt-3 text-mute">Texto de exemplo. Edite este arquivo com o regulamento oficial da Cúpula Cup.</p>
      <div className="mt-8 space-y-4">
        {REGRAS.map((r) => (
          <section key={r.titulo} className="card p-5">
            <h2 className="text-xl font-semibold">{r.titulo}</h2>
            <p className="mt-2 text-silver">{r.texto}</p>
          </section>
        ))}
      </div>
    </Pagina>
  )
}
