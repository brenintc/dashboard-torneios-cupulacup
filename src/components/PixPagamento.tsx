'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { chamarApi } from '@/lib/api'
import { erroMsg, fmtMoeda } from '@/lib/utils'

interface Pix {
  qr_code?: string
  qr_code_base64?: string
  expires_at?: string
  amount?: number
  pago?: boolean
}

export default function PixPagamento({
  registrationId,
  onPago,
  onFechar,
}: {
  registrationId: number
  onPago: () => void
  onFechar: () => void
}) {
  const [pix, setPix] = useState<Pix | null>(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [restante, setRestante] = useState('')

  useEffect(() => {
    let ativo = true
    chamarApi<Pix>('/api/pix/criar', { registration_id: registrationId })
      .then((p) => {
        if (!ativo) return
        if (p.pago) onPago()
        else setPix(p)
      })
      .catch((e) => ativo && setErro(erroMsg(e)))
    return () => {
      ativo = false
    }
  }, [registrationId, onPago])

  // Confere o pagamento a cada 5 segundos
  useEffect(() => {
    if (!pix) return
    const t = setInterval(async () => {
      const { data } = await supabase
        .from('tournament_registrations')
        .select('payment_status')
        .eq('id', registrationId)
        .maybeSingle()
      if (!data) {
        setErro('Esta inscrição expirou. Faça a inscrição novamente.')
        clearInterval(t)
      } else if (data.payment_status === 'pago') {
        clearInterval(t)
        onPago()
      }
    }, 5000)
    return () => clearInterval(t)
  }, [pix, registrationId, onPago])

  // Contagem regressiva
  useEffect(() => {
    if (!pix?.expires_at) return
    const alvo = new Date(pix.expires_at).getTime()
    const tick = () => {
      const s = Math.max(0, Math.floor((alvo - Date.now()) / 1000))
      setRestante(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`)
      if (s === 0) setErro('O QR Code expirou. Cancele a inscrição e faça novamente.')
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [pix])

  async function copiar() {
    if (!pix?.qr_code) return
    await navigator.clipboard.writeText(pix.qr_code)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Pagamento via PIX" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-2xl font-bold">Pagar inscrição</h2>

        {!pix && !erro && <p className="mt-4 text-mute">Gerando o PIX...</p>}
        {erro && <p className="mt-4 text-red-400">{erro}</p>}

        {pix?.qr_code && !erro && (
          <>
            <p className="mt-2 text-silver">
              Valor: <strong className="text-white">{fmtMoeda(pix.amount)}</strong>. Expira em {restante}.
            </p>
            {pix.qr_code_base64 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pix.qr_code_base64}`}
                alt="QR Code do PIX"
                className="mx-auto mt-4 h-56 w-56 rounded bg-white p-2"
              />
            )}
            <p className="mt-4 text-sm text-mute">Ou use o PIX copia e cola:</p>
            <textarea readOnly value={pix.qr_code} rows={3} className="input mt-1 text-xs" aria-label="Código PIX copia e cola" />
            <button onClick={copiar} className="btn-primary mt-3 w-full">
              {copiado ? 'Código copiado' : 'Copiar código PIX'}
            </button>
            <p className="mt-3 text-center text-xs text-mute">
              Assim que o pagamento for confirmado, esta janela fecha sozinha e a vaga é garantida.
            </p>
          </>
        )}

        <button onClick={onFechar} className="btn-ghost mt-4 w-full">
          Fechar
        </button>
      </div>
    </div>
  )
}
