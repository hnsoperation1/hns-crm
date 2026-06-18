'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (loading) return
    if (!user && !isLoginPage) router.replace('/login')
    if (user && isLoginPage) router.replace('/')
  }, [user, loading, isLoginPage, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="font-black text-2xl tracking-wide">
            <span style={{ color: '#ef5e2f' }}>HNS</span>
            <span style={{ color: '#2a9ac4' }}> CRM</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#ef5e2f' }}
          >
            Tải lại
          </button>
        </div>
      </div>
    )
  }

  if (isLoginPage) return <>{children}</>

  // Chưa đăng nhập — không render gì, useEffect sẽ redirect
  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
