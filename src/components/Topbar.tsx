'use client'

import { Bell } from 'lucide-react'
import { getInitials } from '@/lib/utils'

const CURRENT_USER = { full_name: 'Lưu Trường Quốc', role: 'Quản trị viên' }

export default function Topbar() {
  return (
    <header className="h-14 flex-shrink-0 bg-white flex items-center justify-end px-6 gap-3" style={{ borderBottom: '1px solid #9dd5ec' }}>
      <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
        <Bell size={18} />
      </button>

      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0e6a95, #052f43)' }}>
          {getInitials(CURRENT_USER.full_name)}
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-gray-800">{CURRENT_USER.full_name}</div>
          <div className="text-xs text-gray-400">{CURRENT_USER.role}</div>
        </div>
      </div>
    </header>
  )
}
