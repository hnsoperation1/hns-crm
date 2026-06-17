'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Kanban, Users, UserCheck, LogOut, ClipboardList, UserPlus } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { href: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Đơn hàng', icon: Kanban },
  { href: '/tasks', label: 'Nhiệm vụ', icon: ClipboardList },
  { href: '/assign', label: 'Giao việc', icon: UserPlus },
  { href: '/customers', label: 'Khách hàng', icon: Users },
  { href: '/staff', label: 'Nhân viên', icon: UserCheck },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full" style={{ background: '#031c29' }}>
      {/* Logo */}
      <div className="px-5 h-14 flex items-center flex-shrink-0" style={{ borderBottom: '1px solid rgba(239,94,47,0.4)' }}>
        <div className="font-black text-2xl tracking-wide">
          <span style={{ color: '#ef5e2f' }}>HNS</span>
          <span style={{ color: '#2a9ac4' }}> CRM</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'text-white shadow-lg'
                  : 'hover:bg-white/10'
              )}
              style={active
                ? { background: '#ef5e2f', boxShadow: '0 4px 12px rgba(239,94,47,0.35)' }
                : { color: '#9dd5ec' }
              }
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Current user */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(18,127,175,0.25)' }}>
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0e6a95, #052f43)' }}>
            LQ
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">Lưu Trường Quốc</div>
            <div className="text-xs" style={{ color: '#5cb5da' }}>Quản trị viên</div>
          </div>
        </div>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/10"
          style={{ color: '#9dd5ec' }}>
          <LogOut size={14} />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
