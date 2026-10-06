import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getAdmin } from '@/lib/server/admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const url = new URL(req.url)
  const raw = await req.text()
  let corpo: { type?: string; data?: { id?: string | number } } = {}
  try {
    corpo = JSON.parse(raw)
  } catch {}

  const tipo = url.searchParams.get('type') || corpo.type
  const dataId = url.searchParams.get('data.id') || corpo.data?.id
  if (tipo !== 'payment' || !dataId) return NextResponse.json({ ok: true })

  // Assinatura do Mercado Pago (se MP_WEBHOOK_SECRET estiver configurado)
  const segredo = process.env.MP_WEBHOOK_SECRET
  if (segredo) {
    const assinatura = req.headers.get('x-signature') || ''
    const partes: Record<string, string> = {}
    for (const p of assinatura.split(',')) {
      const [k, v] = p.trim().split('=')
      if (k && v) partes[k] = v
    }
    const manifesto = `id:${String(dataId).toLowerCase()};request-id:${req.headers.get('x-request-id') || ''};ts:${partes.ts};`
    const esperado = createHmac('sha256', segredo).update(manifesto).digest('hex')
    const a = Buffer.from(esperado)
    const b = Buffer.from(partes.v1 || '')
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ erro: 'Assinatura inválida' }, { status: 401 })
    }
  }

  // Nunca confiamos no corpo: consultamos o pagamento direto no Mercado Pago
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  })
  if (!res.ok) return NextResponse.json({ erro: 'Falha ao consultar pagamento' }, { status: 500 }) // MP tenta de novo

  const pagamento = await res.json()
  const regId = Number(pagamento.external_reference)
  if (!regId) return NextResponse.json({ ok: true })

  const db = getAdmin()

  if (pagamento.status === 'approved') {
    const { data: reg } = await db
      .from('tournament_registrations')
      .select('id, tournaments(entry_fee)')
      .eq('id', regId)
      .maybeSingle()

    const fee = Number((reg as unknown as { tournaments: { entry_fee: number } | null } | null)?.tournaments?.entry_fee ?? 0)
    if (!reg) {
      console.error('Pagamento aprovado sem inscrição (provavelmente expirada):', dataId, regId)
      return NextResponse.json({ ok: true })
    }
    if (Math.abs(Number(pagamento.transaction_amount) - fee) > 0.009) {
      console.error('Valor divergente no pagamento', dataId, pagamento.transaction_amount, fee)
      return NextResponse.json({ ok: true })
    }

    await db
      .from('payments')
      .update({ status: 'approved', paid_at: new Date().toISOString(), mp_payment_id: String(pagamento.id) })
      .eq('registration_id', regId)
    await db
      .from('tournament_registrations')
      .update({ payment_status: 'pago', status: 'confirmado' })
      .eq('id', regId)
  } else if (['cancelled', 'rejected', 'expired'].includes(pagamento.status)) {
    await db.from('payments').update({ status: 'cancelled' }).eq('registration_id', regId)
  }

  return NextResponse.json({ ok: true })
}
