'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Msg } from '@/lib/types'
import { Aviso, Pagina } from '@/components/ui'

// Login do admin: SOMENTE e-mail e senha. Sem OAuth, sem cadastro, sem "esqueci a senha" público.
// Mesmo que alguém entre por Discord/Google, is_admin() no banco só vale para sessões com senha.
export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<Msg>({ texto: '', tipo: '' })
  const [semPermissao, setSemPermissao] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('erro') === 'permissao') {
      setSemPermissao(true)
      setMsg({ texto: 'Esta sessão não tem acesso administrativo. Entre com a conta de administrador (e-mail e senha).', tipo: 'erro' })
    }
  }, [])

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setMsg({ texto: '', tipo: '' })
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) {
      // mensagem única: não revela se o e-mail existe
      setMsg({ texto: 'E-mail ou senha incorretos.', tipo: 'erro' })
      setOcupado(false)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  async function sair() {
    await supabase.auth.signOut()
    setSemPermissao(false)
    setMsg({ texto: '', tipo: '' })
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <Pagina largura="max-w-md">
      <h1 className="text-4xl font-bold">Administração</h1>
      <form onSubmit={entrar} className="card mt-6 space-y-4 p-5">
        <div>
          <label htmlFor="a-email" className="label">E-mail</label>
          <input id="a-email" type="email" autoComplete="username" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="a-senha" className="label">Senha</label>
          <input id="a-senha" type="password" autoComplete="current-password" required className="input" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <button type="submit" disabled={ocupado} className="btn-primary w-full">
          {ocupado ? 'Entrando...' : 'Entrar'}
        </button>
        <Aviso msg={msg} />
      </form>
      {semPermissao && (
        <button onClick={sair} className="btn-ghost mt-4">
          Sair desta sessão
        </button>
      )}
    </Pagina>
  )
}
