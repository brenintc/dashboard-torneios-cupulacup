'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { caminhoSeguro, entrarComProvedor, traduzirErroAuth, type ProvedorOAuth } from '@/lib/auth'
import type { Msg } from '@/lib/types'
import { Aviso, Pagina } from '@/components/ui'

type Modo = 'entrar' | 'criar' | 'recuperar'

export default function Entrar() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [next, setNext] = useState('/')
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<Msg>({ texto: '', tipo: '' })

  useEffect(() => {
    setNext(caminhoSeguro(new URLSearchParams(window.location.search).get('next')))
    // quem já está logado não precisa desta tela
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(caminhoSeguro(new URLSearchParams(window.location.search).get('next')))
    })
  }, [router])

  async function oauth(provedor: ProvedorOAuth) {
    setMsg({ texto: '', tipo: '' })
    const { error } = await entrarComProvedor(provedor, next)
    if (error) setMsg({ texto: traduzirErroAuth(error.message), tipo: 'erro' })
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setMsg({ texto: '', tipo: '' })
    const mail = email.trim()
    if (!mail) return setMsg({ texto: 'Informe o e-mail.', tipo: 'erro' })
    if (modo !== 'recuperar' && senha.length < 8) {
      return setMsg({ texto: 'A senha precisa ter ao menos 8 caracteres.', tipo: 'erro' })
    }

    setOcupado(true)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password: senha })
        if (error) throw error
        router.replace(next)
        router.refresh()
      } else if (modo === 'criar') {
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password: senha,
          options: { emailRedirectTo: `${window.location.origin}${next}` },
        })
        if (error) throw error
        if (data.session) {
          router.replace(next)
          router.refresh()
        } else {
          setMsg({ texto: 'Pronto. Enviamos um link de confirmação para o seu e-mail.', tipo: 'sucesso' })
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(mail, {
          redirectTo: `${window.location.origin}/conta`,
        })
        if (error) throw error
        setMsg({ texto: 'Se o e-mail existir, você receberá o link para criar uma nova senha.', tipo: 'sucesso' })
      }
    } catch (err) {
      setMsg({ texto: traduzirErroAuth((err as { message?: string }).message ?? 'Erro desconhecido'), tipo: 'erro' })
    }
    setOcupado(false)
  }

  const titulo = modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Recuperar senha'

  return (
    <Pagina largura="max-w-md">
      <h1 className="text-4xl font-bold">{titulo}</h1>

      {modo !== 'recuperar' && (
        <div className="mt-6 grid gap-3">
          <button onClick={() => oauth('discord')} className="btn-primary">
            Continuar com Discord
          </button>
          <button onClick={() => oauth('google')} className="btn-ghost">
            Continuar com Google
          </button>
          <p className="my-1 text-center text-sm text-mute">ou use e-mail e senha</p>
        </div>
      )}

      <form onSubmit={enviar} className="card mt-4 space-y-4 p-5">
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {modo !== 'recuperar' && (
          <div>
            <label htmlFor="senha" className="label">Senha</label>
            <input
              id="senha"
              type="password"
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        )}
        <button type="submit" disabled={ocupado} className="btn-primary w-full">
          {ocupado ? 'Aguarde...' : modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Enviar link'}
        </button>
        <Aviso msg={msg} />
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        {modo !== 'entrar' && <button onClick={() => setModo('entrar')} className="text-left text-brand-hi underline">Já tenho conta</button>}
        {modo !== 'criar' && <button onClick={() => setModo('criar')} className="text-left text-brand-hi underline">Criar conta com e-mail</button>}
        {modo === 'entrar' && <button onClick={() => setModo('recuperar')} className="text-left text-brand-hi underline">Esqueci a senha</button>}
      </div>
    </Pagina>
  )
}
