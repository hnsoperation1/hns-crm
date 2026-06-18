'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Kanban, List, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS, SOURCE_COLORS, formatVND, formatDate, daysUntil, getInitials } from '@/lib/utils'
import type { Opportunity, OppStage } from '@/types'
import { useAuth } from '@/contexts/auth'

type ViewMode = 'kanban' | 'table'

type OppWithRelations = Opportunity & {
  contact: { name: string; company?: string } | null
  assigned_user: { full_name: string } | null
}

const COLUMNS: { stage: OppStage; label: string }[] = [
  { stage: 'stage_1', label: 'GĐ1 · Tư vấn' },
  { stage: 'stage_2', label: 'GĐ2 · Báo giá' },
  { stage: 'stage_3', label: 'GĐ3 · Trước tour' },
  { stage: 'stage_4', label: 'GĐ4 · Trong tour' },
  { stage: 'stage_5', label: 'GĐ5 · Sau tour' },
  { stage: 'lost', label: 'Mất đơn' },
]

export default function PipelinePage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [view, setView] = useState<ViewMode>('kanban')
  const [opps, setOpps] = useState<OppWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('opportunities')
      .select('*, contact:contacts(name, company), assigned_user:users!assigned_to(full_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOpps((data ?? []) as OppWithRelations[])
        setLoading(false)
      })
  }, [])

  const activeCount = opps.filter(o => !['lost', 'cancelled'].includes(o.stage)).length

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={28} />
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 40px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đơn hàng</h1>
          <p className="text-sm text-gray-400 mt-0.5">{activeCount} đơn đang xử lý</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Kanban size={15} />
              Kanban
            </button>
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                view === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={15} />
              Bảng
            </button>
          </div>

          {user?.role !== 'sale' && (
            <Link href="/co-hoi/new" className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <Plus size={16} strokeWidth={2.5} />
              Thêm đơn
            </Link>
          )}
        </div>
      </div>

      {/* Kanban */}
      {view === 'kanban' && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full" style={{ minWidth: `${COLUMNS.length * 290}px` }}>
            {COLUMNS.map(({ stage, label }) => {
              const cards = opps.filter(o => o.stage === stage)
              const totalValue = cards.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
              const sc = STAGE_COLORS[stage]
              return (
                <div key={stage} className="flex flex-col border-r border-gray-200 bg-gray-50/70" style={{ width: '290px', minWidth: '290px' }}>
                  <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                        <span className="font-semibold text-gray-800 text-sm">{label}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                        {cards.length}
                      </span>
                    </div>
                    {totalValue > 0 && (
                      <div className="text-xs text-gray-400 pl-5">{formatVND(totalValue)}</div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {cards.map(opp => {
                      const deadline = opp.deadline ? daysUntil(opp.deadline) : null
                      const isUrgent = deadline !== null && deadline >= 0 && deadline <= 5
                      const isOverdue = deadline !== null && deadline < 0
                      return (
                        <Link key={opp.id} href={`/co-hoi/${opp.id}`}>
                          <div className={`bg-white rounded-xl border border-l-4 ${sc.side} p-3.5 hover:shadow-md transition-all cursor-pointer group ${!opp.assigned_to ? 'border-amber-200' : 'border-gray-200'}`}>
                            <div className="font-semibold text-sm text-gray-900 group-hover:text-brand-700 transition-colors mb-0.5 line-clamp-2 leading-snug">
                              {opp.title}
                            </div>
                            <div className="text-xs text-gray-400 mb-2.5">
                              {opp.contact?.company ?? opp.contact?.name}
                            </div>
                            <div className="flex items-center justify-between mb-2.5">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[opp.source]}`}>
                                {SOURCE_LABELS[opp.source]}
                              </span>
                              {opp.estimated_value && stage !== 'lost' && (
                                <span className="text-xs font-bold text-gray-700">{formatVND(opp.estimated_value)}</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              {!opp.assigned_to ? (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                  Chờ phân công
                                </span>
                              ) : opp.assigned_user ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                                    {getInitials(opp.assigned_user.full_name)}
                                  </div>
                                  <span className="text-xs text-gray-500">{opp.assigned_user.full_name}</span>
                                </div>
                              ) : null}
                              <div className="text-right">
                                {opp.deadline && (
                                  <span className={`text-[11px] font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-400'}`}>
                                    {isOverdue ? '⚠ ' : isUrgent ? '⏰ ' : ''}{formatDate(opp.deadline)}
                                  </span>
                                )}
                                {!opp.deadline && opp.tour_date && (
                                  <span className="text-[11px] text-gray-400">Tour {formatDate(opp.tour_date)}</span>
                                )}
                              </div>
                            </div>
                            {stage === 'lost' && opp.lost_reason && (
                              <div className="mt-2.5 text-[11px] text-red-500 bg-red-50 rounded-lg px-2.5 py-2 line-clamp-2 leading-relaxed">
                                {opp.lost_reason}
                              </div>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                    {cards.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-sm text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
                        Không có đơn
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Table */}
      {view === 'table' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Đơn hàng', 'Nguồn', 'Giai đoạn', 'Sale TV', 'Giá trị', 'Ngày tour', 'Deadline'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {opps.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">Chưa có đơn hàng nào</td></tr>
                )}
                {opps.map(opp => {
                  const sc = STAGE_COLORS[opp.stage]
                  const deadline = opp.deadline ? daysUntil(opp.deadline) : null
                  return (
                    <tr key={opp.id} className="hover:bg-gray-50/70 group transition-colors cursor-pointer" onClick={() => window.location.href = `/co-hoi/${opp.id}`}>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{opp.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{opp.contact?.company ?? opp.contact?.name}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[opp.source]}`}>
                          {SOURCE_LABELS[opp.source]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                          {STAGE_LABELS[opp.stage]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {!opp.assigned_to ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Chờ phân công</span>
                        ) : opp.assigned_user ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                              {getInitials(opp.assigned_user.full_name)}
                            </div>
                            <span className="text-gray-700 whitespace-nowrap">{opp.assigned_user.full_name}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-semibold text-gray-900 whitespace-nowrap">
                          {opp.estimated_value ? formatVND(opp.estimated_value) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                        {opp.tour_date ? formatDate(opp.tour_date) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {opp.deadline ? (
                          <span className={`text-xs font-medium whitespace-nowrap ${
                            deadline !== null && deadline < 0 ? 'text-red-600'
                            : deadline !== null && deadline <= 7 ? 'text-amber-600'
                            : 'text-gray-500'
                          }`}>
                            {formatDate(opp.deadline)}
                            {deadline !== null && deadline >= 0 && deadline <= 7 && ` · ${deadline}N`}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
