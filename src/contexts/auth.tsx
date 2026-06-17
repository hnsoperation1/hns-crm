'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Lấy session hiện tại khi app load
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (authUser) {
        const profile = await fetchProfile(authUser.id)
        setUser(profile)
      }
      setLoading(false)
    })

    // Lắng nghe thay đổi auth state (login/logout từ tab khác, session hết hạn...)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setUser(profile)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchProfile(userId: string): Promise<User | null> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    return data as User | null
  }

  async function login(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Email hoặc mật khẩu không đúng' }
      }
      return { error: error.message }
    }
    return { error: null }
  }

  function logout() {
    supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
