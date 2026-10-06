import { Pagina } from '@/components/ui'

// ATENÇÃO: texto-modelo baseado na LGPD (Lei 13.709/2018). Preencha os campos entre colchetes
// e peça a revisão de um advogado antes de publicar.
const CONTROLADOR = '[Nome ou razão social e CPF/CNPJ do organizador]'
const CONTATO = '[privacidade@seudominio.com.br]'

const SECOES = [
  {
    t: '1. Quem é o responsável',
    p: `Os dados são tratados por ${CONTROLADOR}, que organiza a Cúpula Cup. Contato para assuntos de privacidade: ${CONTATO}.`,
  },
  {
    t: '2. Quais dados coletamos',
    p: 'Da sua conta do Discord: ID, nome de usuário, foto e e-mail (quando o Discord informa). Da equipe: nome, TAG, elenco (nome e ID do Discord dos jogadores) e inscrições. Do pagamento: valor, status e identificador da transação. Não guardamos dados bancários.',
  },
  {
    t: '3. Para que usamos',
    p: 'Para identificar você, criar e gerenciar equipes, inscrever em campeonatos, confirmar pagamentos, organizar partidas (inclusive criando canais no Discord com os capitães), exibir classificação e Hall da Fama e prevenir fraudes.',
  },
  {
    t: '4. Base legal',
    p: 'Execução do serviço que você solicitou (art. 7º, V, da LGPD), cumprimento de obrigações legais e legítimo interesse para segurança e prevenção a fraudes.',
  },
  {
    t: '5. Com quem compartilhamos',
    p: 'Com os serviços que fazem o site funcionar: Supabase (banco de dados e login), Vercel (hospedagem), Discord (login e canais das partidas) e Mercado Pago (pagamento por PIX). Nome e TAG da equipe, resultados e classificação são públicos no site. O elenco só aparece para o capitão e para a organização.',
  },
  {
    t: '6. Jogadores cadastrados pelo capitão',
    p: 'O capitão declara ter autorização dos jogadores para informar o nome e o ID do Discord deles. Qualquer jogador pode pedir a remoção dos seus dados da equipe pelo contato acima.',
  },
  {
    t: '7. Por quanto tempo guardamos',
    p: 'Enquanto sua conta existir e pelo prazo necessário para cumprir obrigações legais e fiscais sobre pagamentos. Resultados de campeonatos finalizados e o Hall da Fama podem ser mantidos como histórico.',
  },
  {
    t: '8. Seus direitos',
    p: `Você pode pedir confirmação do tratamento, acesso, correção, anonimização ou exclusão dos dados, portabilidade e informações sobre compartilhamento, a qualquer momento, pelo e-mail ${CONTATO}.`,
  },
  {
    t: '9. Cookies e armazenamento',
    p: 'Usamos o armazenamento do navegador apenas para manter você logado. Não usamos cookies de publicidade.',
  },
  {
    t: '10. Segurança e alterações',
    p: 'Adotamos medidas técnicas para proteger os dados, como controle de acesso por usuário no banco de dados. Esta política pode ser atualizada, e a versão em vigor é a desta página.',
  },
]

export default function Privacidade() {
  return (
    <Pagina largura="max-w-3xl">
      <h1 className="text-4xl font-bold">Política de Privacidade</h1>
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
