'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // Fallback cứng: nếu sau 8 giây vẫn loading thì buộc tắt
    const fallback = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 8000)

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        if (session?.user) {
          try {
            const profile = await fetchProfile(session.user.id)
            if (mounted) setUser(profile)
          } catch {
            // profile fetch thất bại — vẫn tiếp tục, redirect về login
          }
        }
      } catch {
        // getSession thất bại
      } finally {
        clearTimeout(fallback)
        if (mounted) setLoading(false)
      }
    }

    init()

    // Chỉ lắng nghe login/logout/token refresh — bỏ qua INITIAL_SESSION vì đã xử lý trên
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || event === 'INITIAL_SESSION') return
      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id)
          if (mounted) setUser(profile)
        } catch {
          if (mounted) setUser(null)
        }
      } else {
        if (mounted) setUser(null)
      }
    })

    return () => {
      mounted = false
      clearTimeout(fallback)
      subscription.unsubscribe()
    }
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

  async function refreshUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const profile = await fetchProfile(session.user.id)
      setUser(profile)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
