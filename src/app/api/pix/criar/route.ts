import { NextResponse } from 'next/server'
import { getAdmin, usuarioDaRequisicao } from '@/lib/server/admin'

export const runtime = 'nodejs'

interface Reg {
  id: number
  payment_status: string
  teams: { captain_user_id: string | null; name: string } | null
  tournaments: { title: string; entry_fee: number | null } | null
}

export async function POST(req: Request) {
  const user = await usuarioDaRequisicao(req)
  if (!user) return NextResponse.json({ erro: 'Faça login primeiro' }, { status: 401 })

  const { registration_id } = await req.json().catch(() => ({}))
  if (!registration_id) return NextResponse.json({ erro: 'Inscrição não informada' }, { status: 400 })

  const db = getAdmin()
  const { data } = await db
    .from('tournament_registrations')
    .select('id, payment_status, teams(captain_user_id, name), tournaments(title, entry_fee)')
    .eq('id', registration_id)
    .maybeSingle()

  const reg = data as unknown as Reg | null
  if (!reg || !reg.teams || !reg.tournaments) {
    return NextResponse.json({ erro: 'Inscrição não encontrada ou expirada' }, { status: 404 })
  }
  if (reg.teams.captain_user_id !== user.id) {
    return NextResponse.json({ erro: 'Apenas o capitão pode pagar a inscrição' }, { status: 403 })
  }
  if (reg.payment_status !== 'pendente') {
    return NextResponse.json({ pago: true })
  }

  const valor = Number(reg.tournaments.entry_fee ?? 0)
  if (valor <= 0) return NextResponse.json({ erro: 'Este campeonato não tem taxa de inscrição' }, { status: 400 })

  // Reaproveita o QR Code se ainda estiver válido
  const { data: existente } = await db
    .from('payments')
    .select('qr_code, qr_code_base64, expires_at, amount, status')
    .eq('registration_id', reg.id)
    .maybeSingle()

  if (existente && existente.status === 'pending' && existente.expires_at && new Date(existente.expires_at) > new Date()) {
    return NextResponse.json({
      qr_code: existente.qr_code,
      qr_code_base64: existente.qr_code_base64,
      expires_at: existente.expires_at,
      amount: existente.amount,
    })
  }

  const expira = new Date(Date.now() + 30 * 60 * 1000)
  const site = process.env.NEXT_PUBLIC_SITE_URL

  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `reg-${reg.id}-${expira.getTime()}`,
    },
    body: JSON.stringify({
      transaction_amount: valor,
      description: `Inscrição ${reg.tournaments.title} - ${reg.teams.name}`.slice(0, 200),
      payment_method_id: 'pix',
      payer: { email: user.email || `${user.id}@jogadores.cupulacup.com.br` },
      external_reference: String(reg.id),
      notification_url: `${site}/api/pix/webhook`,
      // horário de Brasília, como o Mercado Pago espera
      date_of_expiration: new Date(expira.getTime() - 3 * 3600 * 1000).toISOString().replace('Z', '-03:00'),
    }),
  })

  const mp = await res.json().catch(() => ({}))
  const tx = mp?.point_of_interaction?.transaction_data
  if (!res.ok || !tx?.qr_code) {
    console.error('Erro Mercado Pago:', res.status, JSON.stringify(mp))
    return NextResponse.json({ erro: 'Não foi possível gerar o PIX agora. Tente novamente em instantes.' }, { status: 502 })
  }

  await db.from('payments').upsert(
    {
      registration_id: reg.id,
      mp_payment_id: String(mp.id),
      amount: valor,
      status: 'pending',
      qr_code: tx.qr_code,
      qr_code_base64: tx.qr_code_base64,
      expires_at: expira.toISOString(),
    },
    { onConflict: 'registration_id' }
  )

  return NextResponse.json({
    qr_code: tx.qr_code,
    qr_code_base64: tx.qr_code_base64,
    expires_at: expira.toISOString(),
    amount: valor,
  })
}
