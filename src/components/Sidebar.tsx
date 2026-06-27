'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Kanban, Users, UserCheck, LogOut, ClipboardList, UserPlus, UserCog, Headphones, Star, Building, Inbox, Loader2, CheckCircle2, Heart, Trash2, BookUser } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/auth'
import { getInitials } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },

  { href: '/cong-viec', label: 'Công việc', icon: ClipboardList },
  { href: '/giao-viec', label: 'Giao việc', icon: UserPlus },
  { href: '/khach-hang', label: 'Khách hàng', icon: Users },
  { href: '/nhan-vien', label: 'Nhân viên', icon: UserCheck },
]

const adminItems = [
  { href: '/admin/users', label: 'Người dùng', icon: UserCog },
  { href: '/admin/phong-ban', label: 'Phòng ban', icon: Building },
]

const ROLE_LABELS: Record<string, string> = {
  boss: 'Giám đốc',
  admin: 'Quản trị viên',
  sale_admin: 'Sale Admin',
  mkt: 'Marketing',
  cskh: 'Chăm sóc KH',
  sale: 'Sale TV',
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  function NavLink({ href, label, icon: Icon, exact }: { href: string; label: string; icon: React.ElementType; exact?: boolean }) {
    const active = exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
    return (
      <Link
        href={href}
        className={clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          active ? 'text-white shadow-lg' : 'hover:bg-white/10'
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
  }

  function SubNavLink({ href, label }: { href: string; label: string }) {
    const active = pathname.startsWith(href)
    return (
      <Link
        href={href}
        className={clsx(
          'flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium transition-all',
          active ? 'text-white' : 'hover:bg-white/10'
        )}
        style={active ? { color: '#ef9e7a' } : { color: '#7ab8d0' }}
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', active ? 'bg-accent-400' : 'bg-white/20')} />
        {label}
      </Link>
    )
  }

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col h-full" style={{ background: '#031c29' }}>
      {/* Logo */}
      <div className="px-4 h-10 flex items-center flex-shrink-0" style={{ borderBottom: '1px solid rgba(239,94,47,0.4)' }}>
        <div className="font-black text-2xl tracking-wide">
          <span style={{ color: '#ef5e2f' }}>HNS</span>
          <span style={{ color: '#2a9ac4' }}> CRM</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems
          .filter(item => !(item.href === '/giao-viec' && user?.is_sale_tv))
          .filter(item => !(user?.role === 'cskh' && ['/giao-viec', '/nhan-vien'].includes(item.href)))
          .map(item => <NavLink key={item.href} {...item} />)}

        {/* Đơn hàng section */}
        <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(18,127,175,0.2)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5" style={{ color: '#4a8fa8' }}>
            Đơn hàng
          </p>
          <NavLink href="/don-hang-moi" label="Đơn hàng mới" icon={Inbox} />
          <NavLink href="/don-hang-dang-lam" label="Đang thực hiện" icon={Loader2} />
          <NavLink href="/don-hang-da-xong" label="Đã xong" icon={CheckCircle2} />
          <NavLink href="/don-hang" label="Tất cả đơn hàng" icon={BookUser} />
        </div>

        {/* CSKH section — chỉ hiện với cskh / admin / boss */}
        {(user?.role === 'cskh' || user?.role === 'admin' || user?.role === 'boss' || user?.is_super_admin) && (
          <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(18,127,175,0.2)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5" style={{ color: '#4a8fa8' }}>
              CSKH
            </p>
            <NavLink href="/cskh" label="Issues" icon={Headphones} />
            <NavLink href="/danh-gia" label="Đánh giá của KH" icon={Star} />
            <NavLink href="/the-cham-soc" label="Thẻ CSKH" icon={Heart} />
          </div>
        )}

        {/* Admin section — chỉ hiện với super admin */}
        {user?.is_super_admin && (
          <div className="pt-3 mt-2" style={{ borderTop: '1px solid rgba(18,127,175,0.2)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5" style={{ color: '#4a8fa8' }}>
              Quản trị
            </p>
            {adminItems.map(item => <NavLink key={item.href} {...item} />)}
          </div>
        )}
      </nav>

      {/* Current user */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(18,127,175,0.25)' }}>
        {user && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0e6a95, #052f43)' }}>
              {getInitials(user.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user.full_name}</div>
              <div className="text-xs truncate" style={{ color: '#5cb5da' }}>
                {ROLE_LABELS[user.role] ?? user.role}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/10"
          style={{ color: '#9dd5ec' }}
        >
          <LogOut size={14} />
          Đăng xuất
        </button>
        <Link href="/thung-rac"
          className="mt-1 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/10"
          style={{ color: 'rgba(157,213,236,0.45)' }}
        >
          <Trash2 size={14} />
          Thùng rác
        </Link>
      </div>
    </aside>
  )
}
