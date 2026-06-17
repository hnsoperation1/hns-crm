'use client'

import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { CONTACTS, OPPORTUNITIES } from '@/lib/mock-data'
import {
  SOURCE_LABELS, SOURCE_COLORS, SCORE_LABELS, SCORE_COLORS,
  TIER_LABELS, TIER_COLORS, formatDate, getInitials,
} from '@/lib/utils'
import type { LeadScore, CustomerTier } from '@/types'

export default function CustomersPage() {
  const [search, setSearch] = useState('')

  const filtered = CONTACTS.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q)
    )
  })

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Khách hàng</h1>
          <p className="text-sm text-gray-400 mt-0.5">{CONTACTS.length} liên hệ</p>
        </div>
        <button className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus size={16} strokeWidth={2.5} />
          Thêm liên hệ
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Tổng liên hệ', value: CONTACTS.length, color: 'text-gray-900' },
          { label: '🔥 Hot leads', value: CONTACTS.filter(c => c.lead_score === 'hot').length, color: 'text-red-600' },
          { label: '☀️ Warm leads', value: CONTACTS.filter(c => c.lead_score === 'warm').length, color: 'text-orange-600' },
          { label: 'VIP / Tiềm năng', value: CONTACTS.filter(c => ['vip', 'potential'].includes(c.customer_tier ?? '')).length, color: 'text-brand-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm theo tên, công ty, số điện thoại..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Khách hàng', 'SĐT / Email', 'Nguồn', 'Lead Score', 'Phân hạng KH', 'Đơn hàng đang xử lý', 'Ngày thêm'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(contact => {
              const currentOpp = OPPORTUNITIES.find(o =>
                o.contact_id === contact.id &&
                !['lost', 'cancelled', 'stage_5'].includes(o.stage)
              )
              return (
                <tr key={contact.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                        {getInitials(contact.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{contact.name}</div>
                        {contact.company && <div className="text-xs text-gray-400">{contact.company}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-gray-700">{contact.phone ?? '—'}</div>
                    {contact.email && <div className="text-xs text-gray-400 mt-0.5 max-w-[180px] truncate">{contact.email}</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[contact.source]}`}>
                      {SOURCE_LABELS[contact.source]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {contact.lead_score ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SCORE_COLORS[contact.lead_score as LeadScore]}`}>
                        {SCORE_LABELS[contact.lead_score as LeadScore]}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {contact.customer_tier ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[contact.customer_tier as CustomerTier]}`}>
                        {TIER_LABELS[contact.customer_tier as CustomerTier]}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {currentOpp ? (
                      <span className="text-accent-500 font-semibold text-xs hover:underline cursor-pointer">{currentOpp.title}</span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                    {formatDate(contact.created_at)}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  Không tìm thấy khách hàng phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
