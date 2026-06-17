'use client'

import { Bell } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { getInitials } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  boss: 'Giám đốc',
  admin: 'Quản trị viên',
  sale_admin: 'Sale Admin',
  mkt: 'Marketing',
  cskh: 'Chăm sóc KH',
  sale: 'Sale TV',
}

export default function Topbar() {
  const { user } = useAuth()

  return (
    <header className="h-10 flex-shrink-0 bg-white flex items-center justify-end px-5 gap-3" style={{ borderBottom: '1px solid #9dd5ec' }}>
      <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
        <Bell size={18} />
      </button>

      {user && (
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0e6a95, #052f43)' }}
          >
            {getInitials(user.full_name)}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-gray-800">{user.full_name}</div>
            <div className="text-xs text-gray-400">{ROLE_LABELS[user.role] ?? user.role}</div>
          </div>
        </div>
      )}
    </header>
  )
}
