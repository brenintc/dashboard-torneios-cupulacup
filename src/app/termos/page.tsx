import { Pagina } from '@/components/ui'

// ATENÇÃO: texto-modelo. Preencha os campos entre colchetes e peça a revisão de um advogado
// antes de publicar, principalmente as partes de pagamento, reembolso e premiação.
const RESPONSAVEL = '[Nome ou razão social e CPF/CNPJ do organizador]'
const CONTATO = '[contato@seudominio.com.br]'

const SECOES = [
  {
    t: '1. Quem somos e o que é a plataforma',
    p: `A Cúpula Cup é uma plataforma de campeonatos de EA FC Pro Clubs operada por ${RESPONSAVEL}. É um projeto independente, sem vínculo com a EA Sports. Ao usar o site, você concorda com estes termos.`,
  },
  {
    t: '2. Conta e capitão',
    p: 'O acesso é feito com a conta do Discord. A pessoa que cria a equipe é o capitão e responde pelas informações da equipe, pelo elenco cadastrado e pelas inscrições. O capitão declara ter autorização dos jogadores para cadastrar seus dados.',
  },
  {
    t: '3. Inscrição e pagamento',
    p: 'Quando o campeonato tem taxa, o pagamento é feito por PIX, processado pelo Mercado Pago. A vaga só é garantida após a confirmação do pagamento. O QR Code vale por 30 minutos; depois disso a vaga é liberada. A taxa e o valor da premiação de cada campeonato constam na página dele.',
  },
  {
    t: '4. Cancelamento e reembolso',
    p: '[Defina a política: prazo para cancelar, em que casos há reembolso e em quanto tempo ele é feito. Exemplo: reembolso integral até X dias antes do início do campeonato.]',
  },
  {
    t: '5. Premiação',
    p: '[Defina como o prêmio é formado e pago: origem do valor, prazo de pagamento após o fim do campeonato, forma de pagamento e eventuais tributos a cargo do premiado.]',
  },
  {
    t: '6. Conduta',
    p: 'Não é permitido ofender outros participantes, usar bugs ou programas de trapaça, combinar resultados ou criar contas falsas. A organização pode advertir, eliminar a equipe, negar reembolso quando cabível e banir participantes que descumprirem as regras.',
  },
  {
    t: '7. Resultados e disputas',
    p: 'Os resultados são registrados pela organização e, em caso de divergência, a decisão da organização é final, após análise das provas enviadas pelas equipes.',
  },
  {
    t: '8. Responsabilidade',
    p: 'Fazemos o possível para manter a plataforma disponível, mas ela pode ficar indisponível por falhas de internet, do Discord, do Mercado Pago ou do EA FC. Não nos responsabilizamos por perdas decorrentes dessas falhas fora do nosso controle.',
  },
  {
    t: '9. Alterações',
    p: 'Podemos atualizar estes termos. A versão em vigor é a publicada nesta página.',
  },
  {
    t: '10. Contato e foro',
    p: `Dúvidas: ${CONTATO}. Fica eleito o foro da comarca de [cidade/UF] para resolver eventuais conflitos, sem prejuízo dos direitos do consumidor.`,
  },
]

export default function Termos() {
  return (
    <Pagina largura="max-w-3xl">
      <h1 className="text-4xl font-bold">Termos de Uso</h1>
      <div className="mt-8 space-y-6">
        {SECOES.map((s) => (
          <section key={s.t}>
            <h2 className="text-xl font-semibold">{s.t}</h2>
            <p className="mt-2 text-silver">{s.p}</p>
          </section>
        ))}
      </div>
    </Pagina>
  )
}
