'use client'
import { useCallback, useEffect, useState } from 'react'
import type { UserIdentity } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { perfilDoUsuario } from '@/lib/perfil'
import { desvincular, traduzirErroAuth, vincularProvedor, type ProvedorOAuth } from '@/lib/auth'
import type { Msg } from '@/lib/types'
import { Aviso, Pagina } from '@/components/ui'
import { Avatar } from '@/components/UserMenu'

const PROVEDORES: { id: ProvedorOAuth | 'email'; nome: string }[] = [
  { id: 'discord', nome: 'Discord' },
  { id: 'google', nome: 'Google' },
  { id: 'email', nome: 'E-mail e senha' },
]

export default function Conta() {
  const { user, loading, login } = useAuth()
  const [identidades, setIdentidades] = useState<UserIdentity[]>([])
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [msgContas, setMsgContas] = useState<Msg>({ texto: '', tipo: '' })
  const [msgSenha, setMsgSenha] = useState<Msg>({ texto: '', tipo: '' })

  const carregar = useCallback(async () => {
    const { data } = await supabase.auth.getUserIdentities()
    const lista = data?.identities ?? []
    setIdentidades(lista)
    // mantém o Discord do capitão (usado pelo bot) igual ao Discord vinculado
    await supabase.rpc('sincronizar_discord')
  }, [])

  useEffect(() => {
    if (user) carregar()
  }, [user, carregar])

  // Erros que o Supabase devolve na URL depois de um OAuth (ex.: conta já vinculada a outro usuário)
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search)
    const erro = params.get('error_description')
    if (erro) setMsgContas({ texto: traduzirErroAuth(erro.replace(/\+/g, ' ')), tipo: 'erro' })
  }, [])

  const tem = (id: string) => identidades.find((i) => i.provider === id)

  async function vincular(p: ProvedorOAuth) {
    setMsgContas({ texto: '', tipo: '' })
    const { error } = await vincularProvedor(p)
    if (error) setMsgContas({ texto: traduzirErroAuth(error.message), tipo: 'erro' })
  }

  async function remover(id: string, nome: string) {
    const ident = tem(id)
    if (!ident) return
    if (!confirm(`Desvincular ${nome} desta conta?`)) return
    setOcupado(true)
    const { error } = await desvincular(ident)
    if (error) setMsgContas({ texto: traduzirErroAuth(error.message), tipo: 'erro' })
    else {
      setMsgContas({ texto: `${nome} desvinculado.`, tipo: 'sucesso' })
      await carregar()
    }
    setOcupado(false)
  }

  async function definirSenha(e: React.FormEvent) {
    e.preventDefault()
    setMsgSenha({ texto: '', tipo: '' })
    if (senha.length < 8) return setMsgSenha({ texto: 'A senha precisa ter ao menos 8 caracteres.', tipo: 'erro' })
    if (senha !== senha2) return setMsgSenha({ texto: 'As senhas não coincidem.', tipo: 'erro' })
    if (!user?.email && !email.trim()) return setMsgSenha({ texto: 'Informe um e-mail.', tipo: 'erro' })

    setOcupado(true)
    // Conta sem e-mail (ex.: só Discord sem e-mail): define e-mail + senha; o e-mail precisa ser confirmado.
    const { error } = user?.email
      ? await supabase.auth.updateUser({ password: senha })
      : await supabase.auth.updateUser({ email: email.trim(), password: senha })
    if (error) setMsgSenha({ texto: traduzirErroAuth(error.message), tipo: 'erro' })
    else {
      setMsgSenha({
        texto: user?.email ? 'Senha definida. Você já pode entrar com e-mail e senha.' : 'Enviamos um link de confirmação para o e-mail informado.',
        tipo: 'sucesso',
      })
      setSenha('')
      setSenha2('')
      await carregar()
    }
    setOcupado(false)
  }

  if (loading) return <Pagina><p className="text-mute">Carregando...</p></Pagina>

  if (!user)
    return (
      <Pagina largura="max-w-xl">
        <h1 className="text-4xl font-bold">Minha conta</h1>
        <div className="card mt-6 p-6">
          <p className="mb-4">Entre na sua conta para gerenciar o perfil e as contas vinculadas.</p>
          <button onClick={login} className="btn-primary">Entrar</button>
        </div>
      </Pagina>
    )

  const p = perfilDoUsuario(user)
  const podeDesvincular = identidades.length >= 2

  return (
    <Pagina largura="max-w-2xl">
      <h1 className="text-4xl font-bold">Minha conta</h1>

      <section className="card mt-6 flex items-center gap-4 p-5">
        <Avatar foto={p.foto} iniciais={p.iniciais} tamanho={56} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">{p.titulo}</p>
          <p className="truncate text-sm text-mute">{user.email ?? 'Sem e-mail cadastrado'}</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Contas vinculadas</h2>
        <p className="mt-1 text-sm text-mute">
          Vincule várias formas de entrar na mesma conta. Suas equipes e inscrições ficam sempre juntas.
        </p>
        <ul className="mt-4 space-y-3">
          {PROVEDORES.map((pv) => {
            const ligada = !!tem(pv.id)
            return (
              <li key={pv.id} className="card flex items-center justify-between gap-3 p-4">
                <span>
                  <span className="font-medium text-white">{pv.nome}</span>
                  <span className="ml-2 text-sm text-mute">{ligada ? 'vinculado' : 'não vinculado'}</span>
                </span>
                {ligada ? (
                  <button
                    onClick={() => remover(pv.id, pv.nome)}
                    disabled={ocupado || !podeDesvincular}
                    title={podeDesvincular ? undefined : 'Mantenha ao menos uma forma de entrar'}
                    className="btn-danger"
                  >
                    Desvincular
                  </button>
                ) : pv.id === 'email' ? (
                  <a href="#senha" className="btn-ghost">Definir senha</a>
                ) : (
                  <button onClick={() => vincular(pv.id as ProvedorOAuth)} className="btn-primary">Vincular</button>
                )}
              </li>
            )
          })}
        </ul>
        <Aviso msg={msgContas} />
      </section>

      <section id="senha" className="mt-10">
        <h2 className="text-2xl font-bold">{user.email ? 'Senha' : 'E-mail e senha'}</h2>
        <form onSubmit={definirSenha} className="card mt-4 space-y-4 p-5">
          {!user.email && (
            <div>
              <label htmlFor="c-email" className="label">E-mail</label>
              <input id="c-email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          <div>
            <label htmlFor="c-senha" className="label">Nova senha</label>
            <input id="c-senha" type="password" autoComplete="new-password" className="input" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <div>
            <label htmlFor="c-senha2" className="label">Repita a nova senha</label>
            <input id="c-senha2" type="password" autoComplete="new-password" className="input" value={senha2} onChange={(e) => setSenha2(e.target.value)} />
          </div>
          <button type="submit" disabled={ocupado} className="btn-primary">
            {ocupado ? 'Salvando...' : 'Salvar senha'}
          </button>
          <Aviso msg={msgSenha} />
        </form>
      </section>
    </Pagina>
  )
}
