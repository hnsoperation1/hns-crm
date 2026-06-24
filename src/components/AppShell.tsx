'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import { TopbarProvider } from '@/contexts/topbar'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (loading) return
    if (!user && !isLoginPage) {
      window.location.replace('/login')
    }
    if (user && isLoginPage) router.replace('/')
  }, [user, loading, isLoginPage, router])

  if (loading || (!user && !isLoginPage)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="font-black text-2xl tracking-wide">
            <span style={{ color: '#ef5e2f' }}>HNS</span>
            <span style={{ color: '#2a9ac4' }}> CRM</span>
          </div>
          <p className="text-sm text-gray-400">Hệ thống quản lý bán hàng nội bộ</p>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full"
                style={{
                  background: '#2a9ac4',
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isLoginPage) return <>{children}</>

  return (
    <TopbarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </TopbarProvider>
  )
}
