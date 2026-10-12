'use client'
import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export function useAuth() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true

    // Só para mostrar/esconder o link "Admin". Quem decide de verdade é o banco (RLS).
    async function verificarAdmin(u: User | null) {
      if (!u) {
        if (ativo) setIsAdmin(false)
        return
      }
      const { data } = await supabase.rpc('is_admin')
      if (ativo) setIsAdmin(data === true)
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      if (!ativo) return
      setUser(u)
      await verificarAdmin(u)
      if (ativo) setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      const u = session?.user ?? null
      setUser(u)
      setTimeout(() => verificarAdmin(u), 0)
    })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [])

  /** Leva para a tela de entrada e volta para a página atual depois do login. */
  const login = useCallback(() => {
    router.push(`/entrar?next=${encodeURIComponent(pathname)}`)
  }, [router, pathname])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    router.refresh()
  }, [router])

  const temDiscord = !!user?.identities?.some((i) => i.provider === 'discord')

  return { user, isAdmin, loading, login, logout, temDiscord }
}
