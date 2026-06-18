'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, LogOut, ChevronDown, RotateCcw } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useTopbar } from '@/contexts/topbar'
import { getInitials } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/':             'Tổng quan',
  '/don-hang':     'Đơn hàng',
  '/cong-viec':    'Công việc',
  '/giao-viec':    'Giao việc',
  '/khach-hang':   'Khách hàng',
  '/nhan-vien':    'Nhân viên',
  '/admin/users':  'Người dùng',
  '/cskh':         'CSKH · Issues',
}

export default function Topbar() {
  const { user, logout } = useAuth()
  const { breadcrumb } = useTopbar()
  const pathname = usePathname()
  function handleRefresh() {
    window.location.reload()
  }

  const pageTitle = PAGE_TITLES[pathname]
    ?? Object.entries(PAGE_TITLES).find(([k]) => k !== '/' && pathname.startsWith(k))?.[1]
    ?? ''
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="h-10 flex-shrink-0 bg-white flex items-center px-5 gap-3" style={{ borderBottom: '1px solid #9dd5ec' }}>
      <div className="flex-1 min-w-0">
        {breadcrumb ?? <span className="text-sm font-semibold text-gray-700">{pageTitle}</span>}
      </div>
      <button onClick={handleRefresh}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 text-xs font-medium">
        Làm mới <RotateCcw size={12} />
      </button>
      <button className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
        <Bell size={16} />
      </button>

      {user && (
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0e6a95, #052f43)' }}
            >
              {getInitials(user.full_name)}
            </div>
            <span className="text-sm font-semibold text-gray-800">{user.full_name}</span>
            <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <button
                onClick={() => { setOpen(false); logout() }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-500 transition-colors"
              >
                <LogOut size={14} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
