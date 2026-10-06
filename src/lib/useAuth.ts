'use client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true

    async function verificarAdmin(u: User | null) {
      if (!u) {
        if (ativo) setIsAdmin(false)
        return
      }
      const { data } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', u.id)
        .maybeSingle()
      if (ativo) setIsAdmin(!!data)
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

  const login = () =>
    supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: 'https://dashboard-cupulacup.vercel.app/'},
    })

  const logout = () => supabase.auth.signOut()

  return { user, isAdmin, loading, login, logout }
}
